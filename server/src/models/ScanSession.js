import mongoose from "mongoose"

const findingSchema = new mongoose.Schema(
  {
    sourceId: String,
    incidentId: String,
    identifierType: { type: String, default: "email" },
    matchType: { type: String, default: "exact" },
    exposedFields: [String],
    breachDate: String,
    retrievedAt: String,
    confidence: String,
    evidenceReference: String,
  },
  { _id: false },
)

const sourceStatusSchema = new mongoose.Schema(
  {
    sourceId: String,
    sourceName: String,
    status: { type: String, enum: ["pending", "success", "timeout", "failed"] },
    latencyMs: Number,
    error: String,
  },
  { _id: false },
)

const scanSessionSchema = new mongoose.Schema(
  {
    verificationSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "VerificationSession", required: true },
    status: {
      type: String,
      enum: ["running", "completed", "partial", "failed", "cancelled"],
      default: "running",
    },
    sourcesStatus: [sourceStatusSchema],
    findings: [findingSchema],
    actions: [
      {
        id: String,
        priority: Number,
        title: String,
        reason: String,
        categoryTrigger: String,
      },
    ],
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true },
)

export default mongoose.model("ScanSession", scanSessionSchema)
