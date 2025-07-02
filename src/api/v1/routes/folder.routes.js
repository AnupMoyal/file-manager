import express from "express";
import multer from "multer";
import {
  getFileSystem,
  createNewFolder,
  uploadFileHandler,
  advancedFileSearch,
  getFolderData,
  getRecentActivity,
  // uploadSingleFile, ❌ old controller - remove
  // recentFilesController,
} from "../controllers/folder.controllers.js";

// import { verifyEmployeeToken } from "../../middleware/authicationmiddleware.js";

const router = express.Router();

// ✅ Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB file size limit
  },
});

// ✅ Universal upload handler (supports single and multiple files)
router.post("/upload", upload.any(), uploadFileHandler);

// 📂 List files and folders
router.get("/list-objects", getFileSystem);

// 📁 Create folder
router.post("/create-folder", createNewFolder);

// 🔍 Advanced search
router.get("/search/advanced", advancedFileSearch);

// 📊 Folder data summary
router.get("/folder-data", getFolderData);

// 🕒 Recent file uploads
router.get("/recent-activity", getRecentActivity);

// router.get("/recent-activity", verifyEmployeeToken, recentFilesController);

export default router;
