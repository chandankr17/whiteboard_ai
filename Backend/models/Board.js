import mongoose from "mongoose";

const BoardSchema = new mongoose.Schema({
  title: { type: String, default: "Untitled Board" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  data: { type: Object, required: true },
}, { timestamps: true });

export default mongoose.model("Board", BoardSchema);
