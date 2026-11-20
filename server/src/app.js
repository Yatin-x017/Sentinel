import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import mongoose from "mongoose"
import verificationRoutes from "./routes/verification.routes.js"
import scansRoutes from "./routes/scans.routes.js"

const app = express()
app.set("trust proxy", 1)

const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", process.env.CLIENT_ORIGIN].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(new Error(`CORS blocked origin: ${origin}`))
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
)

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
)

app.use(express.json({ limit: "16kb" }))

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use("/api", apiLimiter)

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  })
})

app.use("/api/v1/verifications", verificationRoutes)
app.use("/api/v1/scans", scansRoutes)

app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.path} -> ${err.message}`)
  res.status(500).json({ error: "INTERNAL_ERROR", message: "An unexpected server error occurred." })
})

export default app
