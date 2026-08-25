import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { API_V2_PREFIX } from '@delve/config'
import type { Env } from './config/env.js'
import { createCorsOptions } from './config/cors.js'
import { createApiRouter } from './routes/index.js'
import { createCloudinaryWebhookRouter } from './modules/media/media.routes.js'
import { createStripeWebhookRouter } from './modules/payment/payment.routes.js'
import { errorHandler } from './middleware/error-handler.js'
import { notFoundHandler } from './middleware/not-found.js'

export function createApp(env: Env) {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors(createCorsOptions(env)))
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

  // Cloudinary webhooks need the raw body for signature verification.
  app.use(
    `${API_V2_PREFIX}/webhooks/cloudinary`,
    express.raw({ type: '*/*', limit: '2mb' }),
    createCloudinaryWebhookRouter(env),
  )
  app.use(
    `${API_V2_PREFIX}/webhooks/stripe`,
    express.raw({ type: '*/*', limit: '1mb' }),
    createStripeWebhookRouter(env),
  )

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false, limit: '1mb' }))

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      service: 'delve-api',
      version: '2',
      message: 'Delve Backend V2. Use /api/v2/health',
    })
  })

  app.use(createApiRouter(env))
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
