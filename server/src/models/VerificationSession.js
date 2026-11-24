import mongoose from "mongoose"

const verificationSessionSchema = new mongoose.Schema({
  emailHash: { type: String, required: true, index: true },
  otpHmac: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  resendCount: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  verified: { type: Boolean, default: false },
  sessionTokenHash: { type: String, default: null },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
})

export default mongoose.model("VerificationSession", verificationSessionSchema)
