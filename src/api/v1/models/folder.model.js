// import mongoose from 'mongoose';

// const foldersSchema = new mongoose.Schema({
//   // organizationId: {
//   //   type: mongoose.Schema.Types.ObjectId,
//   //   required: true,
//   //   ref: 'Organization'
//   // },
//   // candidateId: {
//   //   type: mongoose.Schema.Types.ObjectId,
//   //   ref: 'jobApplyForm',
//   //   default:null,
//   // },
//   parentId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'folderSchema',
//     default: null
//   },
//   name: { // file ya folder ka naam
//     type: String,
//     required: true
//   },
//   type: { // 'folder' ya 'file'
//     type: String,
//     enum: ['folder', 'file'],
//     required: true
//   },
//   key: { // S3 key (file ke liye), folder ke liye path
//     type: String
//   },
//   location: { // S3 URL (file ke liye)
//     type: String
//   },
//   size: { // file ke liye
//     type: Number
//   },
//   mimetype: { // file ke liye
//     type: String
//   },
//   extension: { // file ke liye
//     type: String
//   },
//   status: { 
//     type: String,
//     enum: ['active', 'recycled', 'deleted'],
//     default: 'active'
//   },
//   deletedAt: {
//     type: Date,
//     default: null
//   },
//   openedAt: {
//     type: Date,
//     default: null
//   });

// const FileHistorySchema = new mongoose.Schema({
//   fileId: {
//     type: mongoose.Schema.Types.ObjectId,
//     required: true,
//     ref: 'folderSchema'
//   },
//   // organizationId: {
//   //   type: mongoose.Schema.Types.ObjectId,
//   //   required: true,
//   //   ref: 'Organization'
//   // },
//   // candidateId: {
//   //   type: mongoose.Schema.Types.ObjectId,
//   //   ref: 'jobApplyForm'
//   // },
//   action: { // 'open', 'upload', 'update', 'delete'
//     type: String,
//     enum: ['open', 'upload', 'update', 'delete','createFolder','deleteFolder'],
//     required: true
//   },
//   detail: { // optional: kya update hua, kya delete hua, etc.
//     type: Object
//   },
//   at: {
//     type: Date,
//     default: Date.now
//   }
// });

// export default mongoose.model('FileHistory', FileHistorySchema);
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }


// export default mongoose.model('folderSchema', foldersSchema);
import mongoose from 'mongoose';

// FOLDER SCHEMA
const foldersSchema = new mongoose.Schema({
  // organizationId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   required: true,
  //   ref: 'Organization'
  // },
  // candidateId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'jobApplyForm',
  //   default: null,
  // },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['folder', 'file'],
    required: true
  },
  key: String,
  location: String,
  size: Number,
  mimetype: String,
  extension: String,
  status: {
    type: String,
    enum: ['active', 'recycled', 'deleted'],
    default: 'active'
  },
  deletedAt: {
    type: Date,
    default: null
  },
  openedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// FILE HISTORY SCHEMA
const fileHistorySchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Folder' // Refers to folder/file document
  },
  // organizationId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   required: true,
  //   ref: 'Organization'
  // },
  // candidateId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'jobApplyForm'
  // },
  action: {
    type: String,
    enum: ['open', 'upload', 'update', 'delete', 'createFolder', 'deleteFolder'],
    required: true
  },
  detail: {
    type: Object
  },
  at: {
    type: Date,
    default: Date.now
  }
});

// EXPORT MODELS
export const Folder = mongoose.model('Folder', foldersSchema);

