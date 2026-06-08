import 'dotenv/config'
import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { middleware } from '@line/bot-sdk'
import { handleWebhook } from './webhook.js'
import { startPoller } from './poller.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT ?? 3000

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
}

const app = express()

app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))
app.post('/webhook', middleware(lineConfig), handleWebhook)

// Serve React frontend (built by Vite → dist/)
const distDir = join(__dirname, '../dist')
app.use(express.static(distDir))
app.get('*', (_req, res) => res.sendFile(join(distDir, 'index.html')))

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`)
  startPoller()
})
