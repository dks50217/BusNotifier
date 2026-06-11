import 'dotenv/config'
import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { middleware } from '@line/bot-sdk'
import { handleWebhook } from './webhook.js'
import { startPoller } from './poller.js'
import { fetchStops, fetchEta, fetchAllEtas } from './busService.js'
import type { Direction } from '../src/types/bus.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT ?? 3000

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
}

const app = express()

app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))
app.post('/webhook', middleware(lineConfig), handleWebhook)

// ── TDX proxy (secrets stay server-side) ─────────────────────────────────────
app.get('/api/bus/stops', async (req, res) => {
  try {
    const { city, route, direction } = req.query
    const stops = await fetchStops(city as string, route as string, Number(direction) as Direction)
    res.json(stops)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/bus/eta/all', async (req, res) => {
  try {
    const { city, route, direction } = req.query
    const etas = await fetchAllEtas(city as string, route as string, Number(direction) as Direction)
    res.json(etas)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/bus/eta', async (req, res) => {
  try {
    const { city, route, direction, stopUID } = req.query
    const eta = await fetchEta(city as string, route as string, Number(direction) as Direction, stopUID as string)
    res.json(eta)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Serve React frontend (built by Vite → dist/)
const distDir = join(__dirname, '../dist')
app.use(express.static(distDir))
app.get('*', (_req, res) => res.sendFile(join(distDir, 'index.html')))

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`)
  startPoller()
})
