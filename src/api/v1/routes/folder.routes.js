import express from "express";
import multer from "multer";
import {
  getFileSystem,
  createNewFolder,
  uploadSingleFile,

  advancedFileSearch,
 getFolderData, 
 getRecentActivity 

// recentFilesController,
  
  
} from "../controllers/folder.controllers.js";

// import {verifyEmployeeToken} from "../../middleware/authicationmiddleware.js"


const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 50MB file size limit
  }
});

// Multer middleware
const singleFileUpload = upload.single('file');
const multipleFileUpload = upload.array('files', 10);

/**
 * List files and folders
 * GET /api/v1/fileShare/list-objects
 * Query params:
 * - prefix: Path prefix to list (optional)
 */
router.get('/list-objects', getFileSystem);

router.post('/create-folder', createNewFolder);

router.post('/upload', singleFileUpload, uploadSingleFile);



router.get('/search/advanced', advancedFileSearch);

router.get("/folder-data", getFolderData);
router.get("/recent-activity", getRecentActivity);

// router.get('/recent-activity', verifyEmployeeToken, recentFilesController);



export default router;
