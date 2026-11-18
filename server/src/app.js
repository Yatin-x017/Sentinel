import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import verificationRoutes from './routes/verification.routes.js';
import scansRoutes from './routes/scans.routes.js';
import { runScanPipeline } from './services/scan-orchestrator.service.js';
import { normalizeEmail } from './middleware/crypto.utils.js';
import { isValidEmail } from './validators/input.validator.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman) or matched origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Preflight OPTIONS requests are already answered by the cors() middleware above.

// 2. Configure Helmet so it doesn't block cross-origin resource sharing
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(express.json({ limit: '16kb' }));

// Global abuse throttling[cite: 1]
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);

// Health endpoint (SEN-03)[cite: 1]
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/api/v1/verifications', verificationRoutes);
app.use('/api/v1/scans', scansRoutes);

app.post('/api/check', async (req, res, next) => {
  try {
    const email = req.body?.email;
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'INVALID_EMAIL', message: 'Please enter a valid email address.' });
    }

    const outcome = await runScanPipeline(normalizeEmail(email));
    if (outcome.status === 'failed') {
      return res.status(502).json({ error: 'SCAN_FAILED', message: 'All breach sources are unavailable.' });
    }

    const sources = outcome.sourcesStatus.map((source) => {
      const matched = outcome.findings.filter((f) => f.sourceId === source.sourceId);
      const found = matched.length > 0;
      const fields = Array.from(new Set(matched.flatMap((f) => f.exposedFields)));

      return {
        name: source.sourceName,
        found,
        ...(source.status !== 'success'
          ? { detail: 'Source unavailable' }
          : found
            ? { detail: `Reported fields: ${fields.join(', ')}` }
            : {}),
      };
    });

    return res.status(200).json({ sources });
  } catch (err) {
    return next(err);
  }
});

// Redacted error handler (never log req.body to avoid leaking emails/OTPs)[cite: 1]
app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.path} -> ${err.message}`);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'An unexpected server error occurred.' });
});

export default app;