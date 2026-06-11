/**
 * busService.ts
 *
 * Abstraction layer between the UI and the data source.
 * Toggle VITE_USE_MOCK=false in .env to switch from mock data to live TDX API.
 * In production, TDX calls are proxied through the backend — no secrets in the browser.
 */

import type { BusStop, BusEta, Direction, TdxEta } from '@/types/bus'
import { MOCK_STOPS, buildMockEta } from './mockData'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

// ── Normalisation helpers ────────────────────────────────────────────────────

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

// ── Public service interface ─────────────────────────────────────────────────

export async function fetchStops(
  city: string,
  routeName: string,
  direction: Direction,
): Promise<BusStop[]> {
  if (USE_MOCK) {
    await simulateLatency()
    const key = `${routeName}-${direction}`
    const stops = MOCK_STOPS[key] ?? []
    return stops.map((s) => ({
      stopUID: s.StopUID,
      stopName: s.StopName.Zh_tw,
      sequence: s.StopSequence,
      direction,
      routeName,
    }))
  }

  const params = new URLSearchParams({ city, route: routeName, direction: String(direction) })
  const res = await fetch(`/api/bus/stops?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<BusStop[]>
}

export async function fetchAllStopsEta(
  city: string,
  routeName: string,
  direction: Direction,
  stopUIDs: string[],
): Promise<Map<string, BusEta | null>> {
  if (USE_MOCK) {
    await simulateLatency()
    const result = new Map<string, BusEta | null>()
    for (const uid of stopUIDs) {
      result.set(uid, normaliseTdxEta(buildMockEta(routeName, direction, uid)))
    }
    return result
  }

  const params = new URLSearchParams({ city, route: routeName, direction: String(direction) })
  const res = await fetch(`/api/bus/eta/all?${params}`)
  if (!res.ok) throw new Error(await res.text())
  const raw: BusEta[] = await res.json()

  const result = new Map<string, BusEta | null>()
  for (const uid of stopUIDs) {
    const match = raw.find((e) => e.stopUID === uid) ?? null
    result.set(uid, match)
  }
  return result
}

export async function fetchEta(
  city: string,
  routeName: string,
  direction: Direction,
  stopUID: string,
): Promise<BusEta | null> {
  if (USE_MOCK) {
    await simulateLatency(200, 600)
    return normaliseTdxEta(buildMockEta(routeName, direction, stopUID))
  }

  const params = new URLSearchParams({ city, route: routeName, direction: String(direction), stopUID })
  const res = await fetch(`/api/bus/eta?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<BusEta | null>
}

// ── Private utils ────────────────────────────────────────────────────────────

function simulateLatency(min = 300, max = 800): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, min + Math.random() * (max - min)),
  )
}
