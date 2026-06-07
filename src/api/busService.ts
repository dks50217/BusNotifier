/**
 * busService.ts
 *
 * Abstraction layer between the UI and the data source.
 * Toggle VITE_USE_MOCK=false in .env to switch from mock data to live TDX API.
 */

import type { BusStop, BusEta, Direction, TdxEta } from '@/types/bus'
import { MOCK_STOPS, buildMockEta } from './mockData'
import { getTdxClient, type TdxStopOfRoute } from './tdxClient'

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

/**
 * Fetch stop list for a route+direction.
 * TDX returns all directions in one call; we filter to the requested one.
 */
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

  const client = await getTdxClient()
  const { data } = await client.get<TdxStopOfRoute[]>(
    `/basic/v2/Bus/StopOfRoute/City/${city}/${encodeURIComponent(routeName)}`,
  )

  const match = data.find((r) => r.Direction === direction)
  if (!match) return []

  return match.Stops.map((s) => ({
    stopUID: s.StopUID,
    stopName: s.StopName.Zh_tw,
    sequence: s.StopSequence,
    direction,
    routeName,
  })).sort((a, b) => a.sequence - b.sequence)
}

/**
 * Fetch ETAs for all stops of a route+direction in one API call.
 * Returns a Map keyed by stopUID.
 */
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

  const client = await getTdxClient()
  const { data } = await client.get<TdxEta[]>(
    `/basic/v2/Bus/EstimatedTimeOfArrival/City/${city}/${encodeURIComponent(routeName)}`,
  )

  const result = new Map<string, BusEta | null>()
  for (const uid of stopUIDs) {
    const candidates = data
      .filter((r) => r.Direction === direction && r.StopUID === uid)
      .sort((a, b) => {
        const at = a.EstimateTime ?? null
        const bt = b.EstimateTime ?? null
        if (at === null) return 1
        if (bt === null) return -1
        return at - bt
      })
    result.set(uid, candidates.length > 0 ? normaliseTdxEta(candidates[0]) : null)
  }
  return result
}

/**
 * Fetch the latest ETA for a single stop on a given route.
 * TDX returns ETAs for all stops; we filter to the requested stopUID.
 */
export async function fetchEta(
  city: string,
  routeName: string,
  direction: Direction,
  stopUID: string,
): Promise<BusEta | null> {
  if (USE_MOCK) {
    await simulateLatency(200, 600)
    const raw = buildMockEta(routeName, direction, stopUID)
    return normaliseTdxEta(raw)
  }

  const client = await getTdxClient()
  const { data } = await client.get<TdxEta[]>(
    `/basic/v2/Bus/EstimatedTimeOfArrival/City/${city}/${encodeURIComponent(routeName)}`,
  )

  // Take the earliest arriving bus for this stop+direction.
  const candidates = data
    .filter((r) => r.Direction === direction && r.StopUID === stopUID)
    .sort((a, b) => {
      const at = a.EstimateTime ?? null
      const bt = b.EstimateTime ?? null
      if (at === null) return 1
      if (bt === null) return -1
      return at - bt
    })

  if (candidates.length === 0) return null
  return normaliseTdxEta(candidates[0])
}

// ── Private utils ────────────────────────────────────────────────────────────

function simulateLatency(min = 300, max = 800): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, min + Math.random() * (max - min)),
  )
}
