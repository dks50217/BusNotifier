import axios from 'axios'
import type { BusStop, BusEta, Direction, TdxEta } from '../src/types/bus.js'

const TOKEN_URL = 'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token'
const API_BASE = 'https://tdx.transportdata.tw/api'

interface TokenCache {
  accessToken: string
  expiresAt: number
}

let cache: TokenCache | null = null
let pendingFetch: Promise<string> | null = null

async function getAccessToken(): Promise<string> {
  if (cache && Date.now() < cache.expiresAt - 60_000) return cache.accessToken
  if (pendingFetch) return pendingFetch

  pendingFetch = (async () => {
    // Support both server env names and Vite-prefixed names as fallback
    const clientId = process.env.TDX_CLIENT_ID ?? process.env.VITE_TDX_CLIENT_ID
    const clientSecret = process.env.TDX_CLIENT_SECRET ?? process.env.VITE_TDX_CLIENT_SECRET
    if (!clientId || !clientSecret) throw new Error('TDX 金鑰未設定：請在 .env 填入 TDX_CLIENT_ID / TDX_CLIENT_SECRET')

    const body = `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`
    const { data } = await axios.post<{ access_token: string; expires_in: number }>(
      TOKEN_URL, body, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    )
    cache = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
    return cache.accessToken
  })().finally(() => { pendingFetch = null })

  return pendingFetch
}

function normaliseTdxEta(raw: TdxEta): BusEta {
  return {
    stopUID: raw.StopUID,
    stopName: raw.StopName.Zh_tw,
    routeName: raw.RouteName.Zh_tw,
    direction: raw.Direction,
    estimateSecs: raw.EstimateTime ?? null,
    stopsAway: raw.StopCountDown ?? null,
    stopStatus: raw.StopStatus,
    isArriving: raw.A2EventType === 1,
    updatedAt: raw.UpdateTime,
  }
}

export async function fetchStops(city: string, routeName: string, direction: Direction): Promise<BusStop[]> {
  const token = await getAccessToken()
  const { data } = await axios.get<any[]>(
    `${API_BASE}/basic/v2/Bus/StopOfRoute/City/${city}/${encodeURIComponent(routeName)}`,
    { headers: { Authorization: `Bearer ${token}` }, params: { $format: 'JSON' } },
  )
  const match = data.find((r: any) => r.Direction === direction)
  if (!match) return []
  return (match.Stops as any[])
    .map(s => ({ stopUID: s.StopUID, stopName: s.StopName.Zh_tw, sequence: s.StopSequence, direction, routeName }))
    .sort((a, b) => a.sequence - b.sequence)
}

export async function fetchEta(city: string, routeName: string, direction: Direction, stopUID: string): Promise<BusEta | null> {
  const token = await getAccessToken()
  const { data } = await axios.get<TdxEta[]>(
    `${API_BASE}/basic/v2/Bus/EstimatedTimeOfArrival/City/${city}/${encodeURIComponent(routeName)}`,
    { headers: { Authorization: `Bearer ${token}` }, params: { $format: 'JSON' } },
  )
  const candidates = data
    .filter(r => r.Direction === direction && r.StopUID === stopUID)
    .sort((a, b) => {
      const at = a.EstimateTime ?? null
      const bt = b.EstimateTime ?? null
      if (at === null) return 1
      if (bt === null) return -1
      return at - bt
    })
  return candidates.length > 0 ? normaliseTdxEta(candidates[0]) : null
}
