import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, getAllSettings, setSetting } from "../db/init.js";
import { processImage } from "../services/folderWatcher.js";
import { analyzeImage } from "../services/imageAnalysis.js";
import { uploadImageToPrintify, createProductDraft, getShops } from "../services/printify.js";

const router = Router();

// Configure multer for file uploads
const uploadsDir = process.env.NODE_ENV === "production"
  ? "/data/uploads"
  : path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG and JPG images are allowed"));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Get dashboard stats
router.get("/stats", (req, res) => {
  try {
    const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
    const draftProducts = db.prepare("SELECT COUNT(*) as count FROM products WHERE status = 'completed'").get() as { count: number };
    const errorProducts = db.prepare("SELECT COUNT(*) as count FROM products WHERE status = 'error'").get() as { count: number };
    const totalLogs = db.prepare("SELECT COUNT(*) as count FROM logs").get() as { count: number };
    const errorLogs = db.prepare("SELECT COUNT(*) as count FROM logs WHERE status = 'error'").get() as { count: number };

    res.json({
      totalProducts: totalProducts.count,
      draftProducts: draftProducts.count,
      errorProducts: errorProducts.count,
      totalLogs: totalLogs.count,
      errorLogs: errorLogs.count,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// List products
router.get("/products", (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const products = db.prepare(`
      SELECT * FROM products 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };

    res.json({
      data: products,
      page,
      limit,
      total: total.count,
      pages: Math.ceil(total.count / limit),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Get single product
router.get("/products/:id", (req, res) => {
  try {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Upload and process image
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const processedDir = process.env.NODE_ENV === "production"
      ? "/data/processed"
      : path.join(process.cwd(), "processed");

    const result = await processImage(req.file.path, processedDir);

    if (result.success) {
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(result.productId);
      res.json({ success: true, product });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Upload failed" });
  }
});

// Upload multiple images
router.post("/upload-bulk", upload.array("images", 50), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    const processedDir = process.env.NODE_ENV === "production"
      ? "/data/processed"
      : path.join(process.cwd(), "processed");

    const results = [];
    for (const file of files) {
      const result = await processImage(file.path, processedDir);
      results.push({
        filename: file.originalname,
        success: result.success,
        productId: result.productId,
        error: result.error,
      });
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Bulk upload failed" });
  }
});

// Analyze image without creating product
router.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const imageBuffer = fs.readFileSync(req.file.path);
    const analysis = await analyzeImage(imageBuffer);

    res.json({ success: true, analysis });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Analysis failed" });
  }
});

// Create draft from analysis
router.post("/create-draft", async (req, res) => {
  try {
    const { imageId, title, description, bullets, tags } = req.body;

    if (!imageId || !title) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const product = await createProductDraft(imageId, {
      title,
      description,
      bullets: bullets || [],
      tags: tags || [],
    });

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Draft creation failed" });
  }
});

// Get logs
router.get("/logs", (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    let query = "SELECT * FROM logs";
    const params: (string | number)[] = [];

    if (status) {
      query += " WHERE status = ?";
      params.push(status);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const logs = db.prepare(query).all(...params);
    const total = db.prepare(
      status 
        ? "SELECT COUNT(*) as count FROM logs WHERE status = ?" 
        : "SELECT COUNT(*) as count FROM logs"
    ).get(...(status ? [status] : [])) as { count: number };

    res.json({
      data: logs,
      page,
      limit,
      total: total.count,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// Get settings
router.get("/settings", (req, res) => {
  try {
    const settings = getAllSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Update settings
router.put("/settings", (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      setSetting(key, String(value));
    }
    res.json({ success: true, settings: getAllSettings() });
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Get Printify shops
router.get("/printify/shops", async (req, res) => {
  try {
    const shops = await getShops();
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to fetch shops" });
  }
});

// Retry failed product
router.post("/products/:id/retry", async (req, res) => {
  try {
    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id) as { filename: string } | undefined;
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const uploadsDir = process.env.NODE_ENV === "production"
      ? "/data/uploads"
      : path.join(process.cwd(), "uploads");
    
    const processedDir = process.env.NODE_ENV === "production"
      ? "/data/processed"
      : path.join(process.cwd(), "processed");

    // Check if file exists in uploads or processed
    let filePath = path.join(uploadsDir, product.filename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(processedDir, product.filename);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Image file not found" });
    }

    // Reset product status
    db.prepare("UPDATE products SET status = 'pending' WHERE id = ?").run(req.params.id);

    const result = await processImage(filePath, processedDir);
    res.json({ success: result.success, error: result.error });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Retry failed" });
  }
});

export default router;
