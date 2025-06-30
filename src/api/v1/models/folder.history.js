import mongoose from 'mongoose';

const FileHistorySchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'folderSchema'
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
  action: { // 'open', 'upload', 'update', 'delete'
    type: String,
    enum: ['open', 'upload', 'update', 'delete','createFolder','deleteFolder'],
    required: true
  },
  detail: { // optional: kya update hua, kya delete hua, etc.
    type: Object
  },
  at: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('FileHistory', FileHistorySchema);