import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { initDatabase } from "./db/init.js";
import { startFolderWatcher } from "./services/folderWatcher.js";
import apiRoutes from "./routes/api.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use("/api", apiRoutes);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const clientPath = path.join(__dirname, "../client");
  app.use(express.static(clientPath));
  
  // SPA fallback
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

// Initialize database
initDatabase();

// Start folder watcher
const uploadsDir = process.env.NODE_ENV === "production" 
  ? "/data/uploads" 
  : path.join(__dirname, "../../uploads");
startFolderWatcher(uploadsDir);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Watching folder: ${uploadsDir}`);
});

export default app;
