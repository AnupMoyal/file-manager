import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["video", "document", "audio", "image", "excel", "other"],
      required: true,
    },
    sizeInBytes: { type: Number, required: true }, // file size in bytes
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder", // 🔁 Reference to parent folder
      default: null,
    },
  },
  {
    timestamps: true, // ✅ adds createdAt, updatedAt
  }
);

export default mongoose.model("File", fileSchema);
