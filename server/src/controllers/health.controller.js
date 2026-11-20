// Health controller – provides a simple health‑check endpoint
import mongoose from "mongoose";

export function healthCheck(req, res) {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({ status: "ok", db: dbStatus });
}
