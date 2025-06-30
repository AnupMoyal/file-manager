import { Folder } from "../models/folder.model.js";
import RecentActivity from "../models/folder.history.js";
import mongoose from "mongoose";

import {
  ListObjectsV2Command,
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { returnFormatter } from "../formatters/common.formatter.js";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import archiver from "archiver";
import stream from "stream";
import axios from "axios";
import mime from "mime-types"; // npm install mime-types

function getSpacesClient() {
  const endpoint = process.env.SPACES_ENDPOINT;

  console.log("Endpoint:", endpoint);
  const region = process.env.SPACES_REGION;

  console.log("Region:", region);
  const accessKeyId = process.env.DO_SPACES_KEY;

  console.log("Access Key ID:", accessKeyId);
  const secretAccessKey = process.env.DO_SPACES_SECRET;

  console.log("Secret Access Key:", secretAccessKey);

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing required DigitalOcean Spaces configuration");
  }

  let spacesClient = new S3Client({
    endpoint: `https://${endpoint}`,
    region: region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: false,
  });

  return spacesClient;
}

async function trackOpenActivity(items, req) {

  if (!items || !items.length) return;
  const now = new Date();

  // Bulk insert FileHistory
  await RecentActivity.insertMany(
    items.map((i) => ({
      fileId: i._id,
     
      action: "open",
      at: now,
    }))
  );
}

export async function fileShare(req, parentId) {
  try {
  

    // Root ya kisi folder ke andar ke items fetch karo
    const folderFilter = {
     
      parentId: parentId || null,
      status: "active",
    };

    // Folders
    const folders = await Folder.find({
      ...folderFilter,
      type: "folder",
    }).lean();

    // Files
    const filesRaw = await Folder.find({
      ...folderFilter,
      type: "file",
    }).lean();

    await trackOpenActivity(folders, req);
    await trackOpenActivity(filesRaw, req);

    // Subfolder count for each folder
    const folderData = await Promise.all(
      folders.map(async (folder) => {
        const subfolderCount = await Folder.countDocuments({
 
          parentId: folder._id,
          type: "folder",
          status: "active",
        });
        return {
          _id: folder._id,
          name: folder.name,
          type: "folder",
          parentId: folder.parentId,
          createdAt: folder.createdAt,
          subfolderCount,
        };
      })
    );

    // File data
    const files = filesRaw.map((file) => ({
      _id: file._id,
      name: file.name,
      key: file.key,
      url: file.location,
      size: file.size,
      mimeType: file.mimetype,
      type: "file",
      parentId: file.parentId,
      uploadedBy: file.candidateId,
      createdAt: file.createdAt,
    }));

    return returnFormatter(true, "Explorer", {
      parentId: parentId || null,
      folders: folderData,
      files,
    });
  } catch (error) {
    console.error("Error fetching from MongoDB:", error);
    return returnFormatter(false, error.message);
  }
}

export async function createFolder(folderPath, req) {
  try {
   
    const parentId = req.body.parentId || null;
    
    if (!folderPath) {
      return { status: false, message: "Folder path is required" };
    }

    const bucket = process.env.PATH_BUCKET;
    // Use your actual bucket name here
    if (!bucket) {
      return { status: false, message: "No Bucket Found" };
    }

    const normalizedPath = folderPath.endsWith("/")
      ? folderPath
      : `${folderPath}/`;
    const client = getSpacesClient();

    // S3 par folder create karo
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: bucket,
        Key: normalizedPath,
      });
      await client.send(headCommand);
      return { status: false, message: "Folder already exists" };
    } catch (error) {
      if (error.name !== "NotFound") throw error;
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: normalizedPath,
      Body: "",
      ContentType: "application/x-directory",
    });
    await client.send(command);

    // MongoDB me folder meta save karo
    const folderName = normalizedPath.split("/").filter(Boolean).pop();
    const folderDoc = new Folder({
      
      parentId,
      name: folderName,
      type: "folder",
      key: normalizedPath,
      location: "",
      size: 0,
      mimetype: "application/x-directory",
      extension: "",
      openedAt: null,
    });
    await folderDoc.save();

    await RecentActivity.create({
      fileId: folderDoc._id,
   
      action: "createFolder",
      at: new Date(),
    });

    return {
      status: true,
      message: "Folder created successfully",
      data: { path: normalizedPath },
    };
  } catch (error) {
    return { status: false, message: error.message };
  }
}

export async function uploadFile(file, destinationPath = "", req) {
  try {

    const parentId = req.body.parentId || null;

    

    if (!file) {
      return { status: false, message: "File is required" };
    }

    const bucket = process.env.PATH_BUCKET;

    if (!bucket) {
      return { status: false, message: "No Bucket Found" };
    }

    const client = getSpacesClient();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const fileName = path.basename(originalName, extension);
    const timestamp = Date.now();

    let key = destinationPath;
    if (key && !key.endsWith("/")) key += "/";
    key += `${fileName}_${timestamp}${extension}`;

    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: "public-read", // <-- Change this if public URL is expected
      },
    });

    const result = await upload.done();
    console.log("Upload result:", result);

    const fileDoc = new Folder({
   
      parentId,
      name: originalName,
      type: "file",
      key: key,
      location: `https://${process.env.SPACES_ENDPOINT}/${bucket}/${key}`, // or result.Location
      size: file.size,
      mimetype: file.mimetype,
      extension: extension,
      openedAt: null,
    });

    await fileDoc.save();

    await RecentActivity.create({
      fileId: fileDoc._id,
    
      action: "upload",
      at: new Date(),
    });

    return {
      status: true,
      message: "File uploaded successfully",
      data: {
        key: result.Key,
        location: fileDoc.location,
        etag: result.ETag,
        size: file.size,
        mimetype: file.mimetype,
        originalName: file.originalname,
      },
    };
  } catch (error) {
    console.error("Upload error:", error);
    return { status: false, message: error.message };
  }
}

export async function advancedSearch(options, req) {
  try {
    const {
      query = "",
      prefix = "",
      maxResults = 100,
      fileTypes = [],
      dateRange = {},
      sizeRange = {},
      parentId = null,
    } = options;

    
    

    const searchQuery = (query || "").toLowerCase();
    const normalizedPrefix = prefix
      ? prefix.endsWith("/")
        ? prefix
        : `${prefix}/`
      : "";
    const nameRegex =
      query && query.trim().length > 0 ? new RegExp(searchQuery, "i") : /.*/;

    // File type group mapping
    const fileTypeGroups = {
      image: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg"],
      video: [".mp4", ".avi", ".mov", ".wmv", ".flv", ".mkv"],
      audio: [".mp3", ".wav", ".aac", ".ogg", ".flac"],
      document: [
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".txt",
      ],
    };

    // Expand group names to extensions
    let normalizedTypes = [];
    if (fileTypes.length > 0) {
      fileTypes.forEach((type) => {
        const lower = type.toLowerCase();
        if (fileTypeGroups[lower]) {
          normalizedTypes.push(...fileTypeGroups[lower]);
        } else {
          normalizedTypes.push(lower.startsWith(".") ? lower : "." + lower);
        }
      });
    }

    // --------- Recursive ParentId Logic ---------
    let parentIds = [];
    if (parentId) {
      parentIds = [parentId];
      const descendantIds = await getAllDescendantFolderIds(
        parentId,
      
      );
      parentIds = parentIds.concat(descendantIds);
    }

    // Folders filter (folders tabhi laao jab fileTypes nahi diya ho)
    let folders = [];
    if (!fileTypes.length) {
      const folderFilter = {  type: "folder", name: nameRegex };
      if (parentId) folderFilter.parentId = { $in: parentIds };
      // Agar parentId nahi diya, to parentId filter mat lagao (poore org me search ho)
      if (normalizedPrefix) {
        folderFilter.key = { $regex: `^${normalizedPrefix}`, $options: "i" };
      }
      const matchedFolders = await Folder.find(folderFilter)
        .limit(maxResults)
        .lean();
      folders = matchedFolders.map((folder) => ({
        _id: folder._id,
        name: folder.name,
        key: folder.key,
        type: "folder",
        createdBy: folder.candidateId,
        createdAt: folder.createdAt,
      }));
    }

    // Files filter
    const fileFilter = {  type: "file", name: nameRegex };
    if (parentId) fileFilter.parentId = { $in: parentIds };
    // Agar parentId nahi diya, to parentId filter mat lagao (poore org me search ho)
    if (normalizedPrefix) {
      fileFilter.key = { $regex: `^${normalizedPrefix}`, $options: "i" };
    }
    if (normalizedTypes.length > 0) {
      fileFilter.extension = { $in: normalizedTypes };
    }
    let files = await Folder.find(fileFilter).limit(1000).lean();

    // Date range filtering
    if (dateRange.from || dateRange.to) {
      files = files.filter((file) => {
        const createdAt = new Date(file.createdAt).getTime();
        if (dateRange.from && dateRange.to) {
          return (
            createdAt >= new Date(dateRange.from).getTime() &&
            createdAt <= new Date(dateRange.to).getTime()
          );
        } else if (dateRange.from) {
          return createdAt >= new Date(dateRange.from).getTime();
        } else {
          return createdAt <= new Date(dateRange.to).getTime();
        }
      });
    }

    // Size range filtering
    if (sizeRange.min !== undefined || sizeRange.max !== undefined) {
      files = files.filter((file) => {
        if (sizeRange.min !== undefined && sizeRange.max !== undefined) {
          return file.size >= sizeRange.min && file.size <= sizeRange.max;
        } else if (sizeRange.min !== undefined) {
          return file.size >= sizeRange.min;
        } else {
          return file.size <= sizeRange.max;
        }
      });
    }

    files = files.map((file) => ({
      _id: file._id,
      name: file.name,
      key: file.key,
      url: file.location,
      size: file.size,
      mimeType: file.mimetype,
      extension: file.extension,
      type: "file",
      uploadedBy: file.candidateId,
      createdAt: file.createdAt,
      path: file.key ? file.key.substring(0, file.key.lastIndexOf("/")) : "",
    }));

    // Sort by relevance if query diya ho
    if (query && query.trim().length > 0) {
      const sortByRelevance = (a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aExact = aName === searchQuery;
        const bExact = bName === searchQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        if (aName.startsWith(searchQuery) && !bName.startsWith(searchQuery))
          return -1;
        if (!aName.startsWith(searchQuery) && bName.startsWith(searchQuery))
          return 1;
        return 0;
      };
      folders.sort(sortByRelevance);
      files.sort(sortByRelevance);
    }

    files = files.slice(0, maxResults);
    folders = folders.slice(0, maxResults);

    // If fileTypes filter laga hai, folders ko empty kar do
    if (fileTypes.length > 0) {
      folders = [];
    }

    if (files.length === 0 && folders.length === 0) {
      return returnFormatter(false, "No matching files or folders found");
    }

    return returnFormatter(true, "Search completed successfully", {
      query,
      filters: {
        fileTypes: fileTypes.length > 0 ? fileTypes : null,
        dateRange: dateRange.from || dateRange.to ? dateRange : null,
        sizeRange:
          sizeRange.min !== undefined || sizeRange.max !== undefined
            ? sizeRange
            : null,
      },
      files,
      folders,
      totalResults: files.length + folders.length,
    });
  } catch (error) {
    console.error("Error in unified search:", error);
    return returnFormatter(false, error.message);
  }
}
