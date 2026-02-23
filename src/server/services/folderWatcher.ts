import chokidar from "chokidar";
import fs from "fs";
import path from "path";
import { db, getSetting } from "../db/init.js";
import { analyzeImage } from "./imageAnalysis.js";
import { uploadImageToPrintify, createProductDraft, logAction } from "./printify.js";

const VALID_EXTENSIONS = [".png", ".jpg", ".jpeg"];
const processedFiles = new Set<string>();

interface ProductRow {
  id: number;
  filename: string;
  status: string;
}

export function startFolderWatcher(watchDir: string): void {
  // Ensure directories exist
  const processedDir = path.join(path.dirname(watchDir), "processed");
  
  if (!fs.existsSync(watchDir)) {
    fs.mkdirSync(watchDir, { recursive: true });
  }
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }

  // Load already processed files from database
  const existingProducts = db.prepare(
    "SELECT filename FROM products WHERE status IN ('completed', 'processing')"
  ).all() as { filename: string }[];
  
  existingProducts.forEach(p => processedFiles.add(p.filename));

  const watcher = chokidar.watch(watchDir, {
    ignored: /(^|[\/\\])\../, // Ignore dotfiles
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  watcher
    .on("add", async (filePath) => {
      const fileName = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();

      // Skip if not a valid image
      if (!VALID_EXTENSIONS.includes(ext)) {
        console.log(`Skipping non-image file: ${fileName}`);
        return;
      }

      // Skip if already processed
      if (processedFiles.has(fileName)) {
        console.log(`Already processed: ${fileName}`);
        return;
      }

      // Check auto-process setting
      const autoProcess = getSetting("auto_process") === "true";
      if (!autoProcess) {
        console.log(`Auto-process disabled, skipping: ${fileName}`);
        return;
      }

      console.log(`New image detected: ${fileName}`);
      await processImage(filePath, processedDir);
    })
    .on("error", (error) => {
      console.error("Watcher error:", error);
    });

  console.log(`Folder watcher started on: ${watchDir}`);
}

export async function processImage(
  filePath: string,
  processedDir?: string
): Promise<{ success: boolean; productId?: number; error?: string }> {
  const fileName = path.basename(filePath);
  
  // Mark as processing
  processedFiles.add(fileName);

  // Create product record
  const insertResult = db.prepare(`
    INSERT INTO products (filename, status) VALUES (?, 'processing')
  `).run(fileName);
  
  const productId = insertResult.lastInsertRowid as number;
  logAction(productId, "processing_started", "info", `Started processing ${fileName}`);

  try {
    // Read image file
    const imageBuffer = fs.readFileSync(filePath);
    console.log(`Read image: ${fileName} (${imageBuffer.length} bytes)`);

    // Step 1: Analyze image
    logAction(productId, "analyzing", "info", "Analyzing image with AI");
    const analysis = await analyzeImage(imageBuffer);
    console.log(`Analysis complete for ${fileName}:`, analysis.title);

    // Update product with analysis
    db.prepare(`
      UPDATE products SET
        title = ?,
        description = ?,
        bullets = ?,
        tags = ?,
        theme = ?,
        style = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      analysis.title,
      analysis.description,
      JSON.stringify(analysis.bullets),
      JSON.stringify(analysis.tags),
      analysis.theme,
      analysis.style,
      productId
    );

    logAction(productId, "analysis_complete", "success", `Generated title: ${analysis.title}`);

    // Step 2: Upload to Printify
    logAction(productId, "uploading", "info", "Uploading image to Printify");
    const uploadedImage = await uploadImageToPrintify(imageBuffer, fileName);
    console.log(`Uploaded to Printify: ${uploadedImage.id}`);

    db.prepare(`
      UPDATE products SET printify_image_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(uploadedImage.id, productId);

    logAction(productId, "upload_complete", "success", `Image ID: ${uploadedImage.id}`);

    // Step 3: Create product draft
    logAction(productId, "creating_draft", "info", "Creating Printify product draft");
    const product = await createProductDraft(uploadedImage.id, {
      title: analysis.title,
      description: analysis.description,
      bullets: analysis.bullets,
      tags: analysis.tags,
    });
    console.log(`Created draft product: ${product.id}`);

    db.prepare(`
      UPDATE products SET
        printify_product_id = ?,
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(product.id, productId);

    logAction(productId, "draft_created", "success", `Product ID: ${product.id}`);

    // Move to processed folder if specified
    if (processedDir) {
      const destPath = path.join(processedDir, fileName);
      fs.renameSync(filePath, destPath);
      console.log(`Moved to processed: ${fileName}`);
    }

    return { success: true, productId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error processing ${fileName}:`, errorMessage);

    db.prepare(`
      UPDATE products SET
        status = 'error',
        error_message = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(errorMessage, productId);

    logAction(productId, "error", "error", errorMessage);

    return { success: false, productId, error: errorMessage };
  }
}

export async function processImageById(productId: number): Promise<boolean> {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as ProductRow | undefined;
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  // Find the image file
  const uploadsDir = process.env.NODE_ENV === "production"
    ? "/data/uploads"
    : path.join(process.cwd(), "uploads");
  
  const filePath = path.join(uploadsDir, product.filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Image file not found: ${product.filename}`);
  }

  const result = await processImage(filePath);
  return result.success;
}
