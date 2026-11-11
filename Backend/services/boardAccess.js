import { createHash, timingSafeEqual } from "node:crypto";

export const hashShareToken = (token) =>
  createHash("sha256").update(token).digest("hex");

export const hasBoardAccess = (board, userId, shareToken) => {
  if (board.user.toString() === userId.toString()) return true;
  if (typeof shareToken !== "string" || !board.shareTokenHash) return false;

  const providedHash = Buffer.from(hashShareToken(shareToken), "hex");
  const storedHash = Buffer.from(board.shareTokenHash, "hex");
  return providedHash.length === storedHash.length
    && timingSafeEqual(providedHash, storedHash);
};
