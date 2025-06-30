import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ["video", "document", "audio", "image", "excel", "other"],
    required: true
  },
  sizeInBytes: { type: Number, required: true }, // file size in bytes
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("File", fileSchema);
