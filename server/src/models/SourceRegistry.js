import mongoose from 'mongoose';

const sourceRegistrySchema = new mongoose.Schema(
  {
    sourceId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    timeoutMs: { type: Number, default: 6000, min: 100 },
    rateLimitPerMin: { type: Number, default: 60, min: 1 },
  },
  { timestamps: true }
);

export default mongoose.model('SourceRegistry', sourceRegistrySchema);
