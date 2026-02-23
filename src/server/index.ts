import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";

import { initDatabase } from "./db/init.js";
import { startFolderWatcher } from "./services/folderWatcher.js";
import apiRoutes from "./routes/api.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

/* SAFE DATA ROOT */
const DATA_ROOT = path.join(process.cwd(), "data");
const uploadsDir = path.join(DATA_ROOT, "uploads");

/* Ensure directories exist */
for (const dir of [DATA_ROOT, uploadsDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/* Middleware */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* API */
app.use("/api", apiRoutes);

/* Serve client in production */
if (process.env.NODE_ENV === "production") {
  const clientPath = path.join(__dirname, "../client");
  app.use(express.static(clientPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

/* Initialize DB */
initDatabase();

/* Start folder watcher */
startFolderWatcher(uploadsDir);

/* Start server */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Watching folder: ${uploadsDir}`);
});

export default app;
