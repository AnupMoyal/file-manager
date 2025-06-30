
// import {createFolder, uploadFile, advancedSearch } from '../services/filemanager.services.js';

// // ✅ Create a new file or folder
// export const createFolderOrFile = async (req, res) => {
//   try {
//     const data = req.body;
//     const newFolder = new Folder(data);
//     await newFolder.save();
//     res.status(201).json({ success: true, message: 'Created successfully', data: newFolder });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Error creating folder or file', error: err.message });
//   }
// };

// // ✅ Get all active folders/files for an organization (optionally by parentId)
// export const getAllFolders = async (req, res) => {
//   try {
//     const { organizationId, parentId = null } = req.query;

//     const query = {
//       organizationId,
//       parentId,
//       status: 'active'
//     };

//     const folders = await Folder.find(query).sort({ type: 1, name: 1 }); // Folders first, then files
//     res.json({ success: true, data: folders });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Error fetching folders', error: err.message });
//   }
// };

// // ✅ Recursive function to get all nested subfolders/files
// export const getFolderTreeRecursive = async (req, res) => {
//   try {
//     const { organizationId, parentId = null } = req.query;

//     async function fetchTree(organizationId, parentId) {
//       const items = await Folder.find({ organizationId, parentId, status: 'active' });

//       const result = await Promise.all(items.map(async (item) => {
//         if (item.type === 'folder') {
//           const children = await fetchTree(organizationId, item._id);
//           return { ...item.toObject(), children };
//         } else {
//           return item;
//         }
//       }));

//       return result;
//     }

//     const tree = await fetchTree(organizationId, parentId);
//     res.json({ success: true, data: tree });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Error fetching folder tree', error: err.message });
//   }
// };

// // ✅ Delete (soft delete = status to deleted and set deletedAt)
// export const deleteFolderOrFile = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const updated = await Folder.findByIdAndUpdate(id, {
//       status: 'deleted',
//       deletedAt: new Date()
//     }, { new: true });

//     if (!updated) return res.status(404).json({ success: false, message: 'Not found' });

//     res.json({ success: true, message: 'Item moved to deleted status', data: updated });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Error deleting item', error: err.message });
//   }
// };

// // ✅ Permanently delete (use with caution)
// export const hardDelete = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const deleted = await Folder.findByIdAndDelete(id);
//     if (!deleted) return res.status(404).json({ success: false, message: 'Item not found' });

//     res.json({ success: true, message: 'Item permanently deleted' });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Error deleting item', error: err.message });
//   }
// };

// // ✅ Update folder or file
// export const updateFolderOrFile = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updated = await Folder.findByIdAndUpdate(id, req.body, { new: true });
//     if (!updated) return res.status(404).json({ success: false, message: 'Item not found' });

//     res.json({ success: true, message: 'Item updated', data: updated });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Error updating item', error: err.message });
//   }
// };






import File from "../models/file.model.js";

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


async function uploadSingleFile(req, res) {
  try {
    const { path, candidateId } = req.body;
    // if (!candidateId) {
    //   return badRequest(res, 'candidateId is required');
    // }
    if (!path ) {
      return badRequest(res, 'Folder path is required');
    }
    if (!req.file) {
      return badRequest(res, 'File is required');
    }
    const result = await uploadFile(req.file, path || '', req);
    return result.status ? success(res, result.message, result.data) : badRequest(res, result.message);
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
  uploadSingleFile,
  advancedFileSearch,
 
};






// ✅ GET /v1/files/folder-data
export const getFolderData = async (req, res) => {
  try {
    const { parentId } = req.query;

    const filter = parentId ? { parentId } : {};

    const files = await File.find(filter);

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
      const size = file.sizeInBytes || 0;
      totalUsed += size;

      if (categories[file.type]) {
        categories[file.type].count++;
        categories[file.type].size += size;
      } else {
        categories.other.count++;
        categories.other.size += size;
      }
    });

    const formatSize = (bytes) => (bytes / 1024 / 1024).toFixed(2); // MB

    const formatted = Object.fromEntries(
      Object.entries(categories).map(([key, value]) => [
        key,
        {
          count: value.count,
          size: `${formatSize(value.size)} MB`,
        },
      ])
    );

    res.status(200).json({
      stats: formatted,
      totalUsedMB: formatSize(totalUsed),
      totalLimitMB: 1024 * 30, // 30GB Limit
    });
  } catch (err) {
    res.status(500).json({ message: "Error in folder data", err });
  }
};

// ✅ GET /v1/files/recent-activity
export const getRecentActivity = async (req, res) => {
  try {
    const { parentId } = req.query;

    const filter = parentId ? { parentId } : {};

    const recentFiles = await File.find(filter)
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({ files: recentFiles });
  } catch (err) {
    res.status(500).json({ message: "Error in recent activity", err });
  }
};













