const mongoose = require("mongoose");

const BoardSchema = new mongoose.Schema(
  {
    boardId: { type: String, required: true },
    versions: [
      {
        state: Object,
        updatedBy: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Board", BoardSchema);
