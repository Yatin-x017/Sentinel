require('dotenv').config()
const mongoose = require('mongoose')
const app = require('./app')

const PORT = Number(process.env.PORT) || 5000
const MONGODB_URI = process.env.MONGODB_URI

async function start() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required')
  }

  await mongoose.connect(MONGODB_URI)
  console.info('Connected to MongoDB')

  const server = app.listen(PORT, () => {
    console.info(`Sentinel server listening on port ${PORT}`)
  })

  const shutdown = (signal) => {
    console.info(`Received ${signal}, shutting down...`)
    server.close(async () => {
      try {
        await mongoose.connection.close()
      } finally {
        process.exit(0)
      }
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start().catch((err) => {
  console.error('Server startup failed:', err.message)
  process.exit(1)
})
