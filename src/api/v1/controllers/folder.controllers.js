import { Folder } from '../models/folder.model.js';

import mongoose from 'mongoose';
import { badRequest, success, unknownError } from "../formatters/globalResponse.js";
import {
  fileShare,
  createFolder,
  uploadFile,
  advancedSearch,
  // getRecentActivities,
 
} from "../services/filemanager.services.js";

async function getFileSystem(req, res) {
  try {
    // parentId query param se lein (root ke liye null ya empty)
    const { parentId } = req.query;
    const result = await fileShare(req, parentId);
    if (result.status) {
      return success(res, result.message, result.data);
    } else {
      return badRequest(res, result.message);
    }
    
  } catch (error) {
    return unknownError(res, error);
  }
}

async function createNewFolder(req, res) {
  try {
    const { path, candidateId } = req.body;
    if (!path ) {
      return badRequest(res, 'Folder path is required');
    }
    const result = await createFolder(path, req); // req pass karein
    return result.status ? success(res, result.message, result.data) : badRequest(res, result.message);
  } catch (error) {
    return unknownError(res, error);
  }
}


// async function uploadSingleFile(req, res) {
//   try {
//     const { path, candidateId } = req.body;
//     // if (!candidateId) {
//     //   return badRequest(res, 'candidateId is required');
//     // }
//     if (!path ) {
//       return badRequest(res, 'Folder path is required');
//     }
//     if (!req.file) {
//       return badRequest(res, 'File is required');
//     }
//     const result = await uploadFile(req.file, path || '', req);
//     return result.status ? success(res, result.message, result.data) : badRequest(res, result.message);
//   } catch (error) {
//     return unknownError(res, error);
//   }
// }


//uplode single and multiple file 



// ✅ Controller: Handles both single & multiple file uploads
export async function uploadFileHandler(req, res) {
  try {
    const { path } = req.body;

    // 🔐 Validate required input
    if (!path) {
      return badRequest(res, "Folder path is required");
    }

    // 📦 Handle single (req.file) or multiple (req.files) files
    const files = req.files || (req.file ? [req.file] : []);

    if (files.length === 0) {
      return badRequest(res, "At least one file is required");
    }

    const uploadedResults = [];

    for (const file of files) {
      const result = await uploadFile(file, path, req); // 🔁 Use service function for each file

      if (!result.status) {
        uploadedResults.push({
          fileName: file.originalname,
          success: false,
          message: result.message,
        });
      } else {
        uploadedResults.push({
          fileName: file.originalname,
          success: true,
          data: result.data,
        });
      }
    }

    return success(res, "File(s) uploaded", uploadedResults);
  } catch (error) {
    return unknownError(res, error);
  }
}



// Search for files and folders (simple)





async function advancedFileSearch(req, res) {
  try {
    // Parse query params
    const {
      query = '',
      prefix = '',
      maxResults = 100,
      parentId = null,
      fileTypes,
      dateRange,
      sizeRange
    } = req.query;

    // fileTypes: comma separated string to array
    let fileTypesArr = [];
    if (fileTypes) {
      fileTypesArr = typeof fileTypes === 'string' ? fileTypes.split(',').map(f => f.trim()) : [];
    }

    // dateRange: JSON string or separate from/to
    let dateRangeObj = {};
    if (dateRange) {
      try {
        dateRangeObj = JSON.parse(dateRange);
      } catch {
        // fallback: ?dateRange.from=...&dateRange.to=...
        if (req.query['dateRange.from'] || req.query['dateRange.to']) {
          dateRangeObj = {
            from: req.query['dateRange.from'],
            to: req.query['dateRange.to']
          };
        }
      }
    }

    // sizeRange: JSON string or separate min/max
    let sizeRangeObj = {};
    if (sizeRange) {
      try {
        sizeRangeObj = JSON.parse(sizeRange);
      } catch {
        if (req.query['sizeRange.min'] || req.query['sizeRange.max']) {
          sizeRangeObj = {
            min: req.query['sizeRange.min'] ? Number(req.query['sizeRange.min']) : undefined,
            max: req.query['sizeRange.max'] ? Number(req.query['sizeRange.max']) : undefined
          };
        }
      }
    }

    // Prepare options object for service
    const options = {
      query,
      prefix,
      maxResults: Number(maxResults),
      parentId,
      fileTypes: fileTypesArr,
      dateRange: dateRangeObj,
      sizeRange: sizeRangeObj
    };

    const result = await advancedSearch(options, req);
    return result.status ? success(res, result.message, result.data) : badRequest(res, result.message);
  } catch (error) {
    return unknownError(res, error);
  }
}

// Recent Activity (paginated)
// async function recentFilesController(req, res) {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const result = await getRecentActivities(req, page, limit);
//     return result.status ? success(res, result.message, result.data) : badRequest(res, result.message);
//   } catch (error) {
//     return unknownError(res, error);
//   }
// }

// Most Active Files/Folders (paginated)


export {
  getFileSystem,
  createNewFolder,
  
  advancedFileSearch,
 
};






// ✅ GET /v1/files/folder-data





// 🔁 Mimetype se category detect
const getCategoryFromMimetype = (mimetype) => {
  if (!mimetype) return "other";
  if (mimetype.startsWith("video")) return "video";
  if (mimetype.startsWith("image")) return "image";
  if (mimetype.startsWith("audio")) return "audio";
  if (mimetype === "application/pdf") return "document";
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimetype === "application/vnd.ms-excel"
  ) return "excel";
  return "other";
};

// 🧠 Top summary controller
export const getFolderData = async (req, res) => {
  try {
    const { parentId } = req.query;

    const filter = parentId
      ? { parentId: new mongoose.Types.ObjectId(parentId), type: "file" }
      : { type: "file" };

    const files = await Folder.find(filter);

    const categories = {
      video: { count: 0, size: 0 },
      document: { count: 0, size: 0 },
      audio: { count: 0, size: 0 },
      image: { count: 0, size: 0 },
      excel: { count: 0, size: 0 },
      other: { count: 0, size: 0 },
    };

    let totalUsed = 0;

    files.forEach(file => {
      const size = file.size || 0;
      totalUsed += size;

      const category = getCategoryFromMimetype(file.mimetype);
      if (categories[category]) {
        categories[category].count++;
        categories[category].size += size;
      } else {
        categories.other.count++;
        categories.other.size += size;
      }
    });

    // 🧮 Convert bytes to GB
    const formatSizeGB = (bytes) => (bytes / 1024 / 1024 / 1024).toFixed(2);

    const formatted = Object.fromEntries(
      Object.entries(categories).map(([key, value]) => [
        key,
        {
          count: value.count,
          sizeGB: `${formatSizeGB(value.size)} GB`,
        },
      ])
    );

    const totalUsedGB = formatSizeGB(totalUsed);
    const quotaGB = 30;
    const percentUsed = ((totalUsedGB / quotaGB) * 100).toFixed(2);

    res.status(200).json({
      status: true,
      stats: formatted,
      totalUsedGB,
      quotaGB,
      percentUsed: `${percentUsed}%`,
    });
  } catch (err) {
    console.error("🔥 Summary Error:", err);
    res.status(500).json({ message: "Error in summary", err });
  }
 };
// ✅ GET /v1/files/recent-activity
export const getRecentActivity = async (req, res) => {
  try {
    const { parentId } = req.query;

    const filter = {
      type: "file", // ✅ Always filter files
      ...(parentId && { parentId: new mongoose.Types.ObjectId(parentId) })
    };

    const recentFiles = await Folder.find(filter)
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      status: true,
      files: recentFiles
    });
  } catch (err) {
    console.error("🔥 Error in getRecentActivity:", err);
    res.status(500).json({ message: "Error in recent files", err });
  }
};















