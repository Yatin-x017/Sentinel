const express = require('express')
const cors = require('cors')

const app = express()

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

function redactText(value) {
  return String(value).replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
}

function requestLogger(req, res, next) {
  const startedAt = Date.now()
  const safePath = redactText(req.path)

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt
    console.info(`${req.method} ${safePath} ${res.statusCode} ${durationMs}ms`)
  })

  next()
}

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '100kb' }))
app.use(requestLogger)

// Mount feature routes as they are implemented:
// app.use('/api/health', require('./routes/health.routes'))
// app.use('/api/verification', require('./routes/verification.routes'))
// app.use('/api/scans', require('./routes/scans.routes'))

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'not_found' } })
})

app.use((err, _req, res, _next) => {
  const status = err.status || 500
  const code = err.code || 'unknown'

  if (status >= 500) {
    console.error(redactText(err.message || 'Unhandled server error'))
  }

  res.status(status).json({ error: { code } })
})

module.exports = app
