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

/* SAFE DATA ROOT */
const DATA_ROOT = path.join(process.cwd(), "data");
const uploadsDir = path.join(DATA_ROOT, "uploads");
const processedDirGlobal = path.join(DATA_ROOT, "processed");

/* Ensure base folders exist */
for (const dir of [DATA_ROOT, uploadsDir, processedDirGlobal]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function startFolderWatcher(watchDir: string): void {
  const processedDir = processedDirGlobal;

  if (!fs.existsSync(watchDir)) {
    fs.mkdirSync(watchDir, { recursive: true });
  }

  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }

  const existingProducts = db.prepare(
    "SELECT filename FROM products WHERE status IN ('completed', 'processing')"
  ).all() as { filename: string }[];

  existingProducts.forEach(p => processedFiles.add(p.filename));

  const watcher = chokidar.watch(watchDir, {
    ignored: /(^|[\/\\])\../,
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

      if (!VALID_EXTENSIONS.includes(ext)) return;
      if (processedFiles.has(fileName)) return;

      const autoProcess = getSetting("auto_process") === "true";
      if (!autoProcess) return;

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
  processedFiles.add(fileName);

  const insertResult = db.prepare(`
    INSERT INTO products (filename, status) VALUES (?, 'processing')
  `).run(fileName);

  const productId = insertResult.lastInsertRowid as number;
  logAction(productId, "processing_started", "info", `Started processing ${fileName}`);

  try {
    const imageBuffer = fs.readFileSync(filePath);

    logAction(productId, "analyzing", "info", "Analyzing image with AI");
    const analysis = await analyzeImage(imageBuffer);

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

    logAction(productId, "analysis_complete", "success", analysis.title);

    logAction(productId, "uploading", "info", "Uploading image to Printify");
    const uploadedImage = await uploadImageToPrintify(imageBuffer, fileName);

    db.prepare(`
      UPDATE products SET printify_image_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(uploadedImage.id, productId);

    logAction(productId, "upload_complete", "success", uploadedImage.id);

    logAction(productId, "creating_draft", "info", "Creating Printify product draft");
    const product = await createProductDraft(uploadedImage.id, {
      title: analysis.title,
      description: analysis.description,
      bullets: analysis.bullets,
      tags: analysis.tags,
    });

    db.prepare(`
      UPDATE products SET
        printify_product_id = ?,
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(product.id, productId);

    logAction(productId, "draft_created", "success", product.id);

    if (processedDir) {
      const destPath = path.join(processedDir, fileName);
      fs.renameSync(filePath, destPath);
    }

    return { success: true, productId };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

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
  if (!product) throw new Error(`Product not found: ${productId}`);

  const filePath = path.join(uploadsDir, product.filename);
  if (!fs.existsSync(filePath)) throw new Error(`Image file not found`);

  const result = await processImage(filePath, processedDirGlobal);
  return result.success;
}
