/**
 * tdxClient.ts
 *
 * OAuth 2.0 Client Credentials flow for TDX.
 * In development (npm run dev), all requests go through the Vite proxy defined
 * in vite.config.ts, which avoids CORS entirely. In production builds the full
 * TDX URLs are used directly.
 *
 * NOTE: client_secret is exposed to the browser bundle via Vite env vars.
 * Acceptable for a personal/MVP project; add a server-side proxy before any
 * public-facing deployment.
 */

import axios, { type AxiosInstance, isAxiosError } from 'axios'

// TDX token endpoint supports browser CORS directly — no proxy needed.
const TOKEN_URL =
  'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token'

// API requests go through the Vite proxy in dev to avoid any CORS edge cases.
// In prod, call TDX directly.
const API_BASE = import.meta.env.DEV
  ? '/tdx-api'
  : 'https://tdx.transportdata.tw/api'

// ── Internal types ────────────────────────────────────────────────────────────

interface TokenResponse {
  access_token: string
  expires_in: number
}

interface TokenCache {
  accessToken: string
  expiresAt: number
}

// ── TDX API raw response shapes ───────────────────────────────────────────────

export interface TdxStopInRoute {
  StopUID: string
  StopName: { Zh_tw: string; En: string }
  StopSequence: number
}

export interface TdxStopOfRoute {
  RouteUID: string
  RouteName: { Zh_tw: string; En: string }
  Direction: 0 | 1
  Stops: TdxStopInRoute[]
}

// ── Token management ──────────────────────────────────────────────────────────

let cache: TokenCache | null = null
let pendingTokenFetch: Promise<string> | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cache && now < cache.expiresAt - 60_000) return cache.accessToken
  if (pendingTokenFetch) return pendingTokenFetch

  pendingTokenFetch = (async () => {
    const clientId = import.meta.env.VITE_TDX_CLIENT_ID as string
    const clientSecret = import.meta.env.VITE_TDX_CLIENT_SECRET as string

    if (!clientId || !clientSecret) {
      throw new Error('TDX 金鑰未設定：請在 .env 填入 VITE_TDX_CLIENT_ID / VITE_TDX_CLIENT_SECRET')
    }

    // Log the first 8 chars of each credential so we can verify the right .env values are loaded.
    console.debug(`[TDX] Using client_id="${clientId.slice(0, 8)}…" secret="${clientSecret.slice(0, 8)}…"`)

    const body = `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`

    try {
      const { data } = await axios.post<TokenResponse>(TOKEN_URL, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      cache = {
        accessToken: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      }
      return cache.accessToken
    } catch (err) {
      // Wrap token errors with a clear label so the UI can distinguish them
      // from bus API errors.
      if (isAxiosError(err)) {
        const status = err.response?.status
        throw new Error(
          `TDX_AUTH_ERROR:${status ?? 'network'} — 取得 Token 失敗，請確認 Client ID / Secret 是否正確`,
        )
      }
      throw err
    }
  })().finally(() => {
    pendingTokenFetch = null
  })

  return pendingTokenFetch
}

// ── Public factory ────────────────────────────────────────────────────────────

export async function getTdxClient(): Promise<AxiosInstance> {
  const token = await getAccessToken()

  const instance = axios.create({
    baseURL: API_BASE,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: { $format: 'JSON' },
  })

  instance.interceptors.response.use(
    (res) => res,
    (err: unknown) => {
      if (isAxiosError(err)) {
        const status = err.response?.status
        const url = err.config?.url ?? ''
        if (status === 404) {
          throw new Error(`TDX_404:找不到資料（${url}）— 請確認縣市與路線名稱`)
        }
        if (status === 401 || status === 403) {
          cache = null
          throw new Error(`TDX_AUTH_ERROR:${status} — 授權失敗，請確認 Client ID / Secret`)
        }
        if (status === 429) {
          throw new Error('TDX_429:API 呼叫次數超限，請稍後再試')
        }
        throw new Error(`TDX API 錯誤 (${status ?? 'network error'})`)
      }
      throw err
    },
  )

  return instance
}
