import "dotenv/config"
import mongoose from "mongoose"
import app from "./app.js"
import SourceRegistry from "./models/SourceRegistry.js"
import { primaryMockAdapter, secondaryMockAdapter } from "./adapters/mock-source.adapter.js"

const PORT = process.env.PORT || 5001

const DEFAULT_SOURCES = [
  {
    sourceId: primaryMockAdapter.sourceId,
    name: primaryMockAdapter.sourceName,
    enabled: true,
    timeoutMs: 6000,
    rateLimitPerMin: 60,
  },
  {
    sourceId: secondaryMockAdapter.sourceId,
    name: secondaryMockAdapter.sourceName,
    enabled: true,
    timeoutMs: 6000,
    rateLimitPerMin: 60,
  },
]

async function seedSourceRegistry() {
  await Promise.all(
    DEFAULT_SOURCES.map((source) =>
      SourceRegistry.updateOne(
        { sourceId: source.sourceId },
        {
          $set: { name: source.name },
          $setOnInsert: {
            enabled: source.enabled,
            timeoutMs: source.timeoutMs,
            rateLimitPerMin: source.rateLimitPerMin,
          },
        },
        { upsert: true },
      ),
    ),
  )
}

async function bootstrap() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("MongoDB connected")
    await seedSourceRegistry()
    app.listen(PORT, () => {
      console.log(`Sentinel API listening on port ${PORT}`)
    })
  } catch (err) {
    console.error("Failed to start server:", err.message)
    process.exit(1)
  }
}

bootstrap()
