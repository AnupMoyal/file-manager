// import File from "../models/file.model.js";
// // 1. Folder data stats (summary)
// export const getFolderData = async (req, res) => {
//   try {
//     const types = ["video", "document", "audio", "image", "excel", "other"];
//     const stats = {};

//     for (const type of types) {
//       const files = await File.find({ type });
//       const totalSize = files.reduce((sum, f) => sum + f.sizeInBytes, 0);
//       stats[type] = {
//         count: files.length,
//         sizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2)
//       };
//     }

//     const allFiles = await File.find();
//     const totalUsedBytes = allFiles.reduce((sum, f) => sum + f.sizeInBytes, 0);

//     res.status(200).json({
//       stats,
//       totalUsedGB: (totalUsedBytes / (1024 * 1024 * 1024)).toFixed(2),
//       totalLimitGB: 30
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching folder data", err });
//   }
// };

// // 2. Recent activity
// export const getRecentActivity = async (req, res) => {
//   try {
//     const recentFiles = await File.find().sort({ createdAt: -1 }).limit(10);
//     res.status(200).json({ files: recentFiles });
//   } catch (err) {
//     res.status(500).json({ message: "Error fetching recent activity", err });
//   }
// };
