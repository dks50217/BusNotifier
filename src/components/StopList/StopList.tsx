import { useState, useEffect, useCallback } from 'react'
import type { BusStop, BusEta, Direction } from '@/types/bus'
import { useBusStore } from '@/store/useBusStore'
import { fetchAllStopsEta } from '@/api/busService'
import { StopItem } from './StopItem'

interface Props {
  routeName: string
  direction: Direction
  stops: BusStop[]
  city: string
}

const DIRECTION_LABEL: Record<Direction, string> = { 0: '去程', 1: '回程' }
const ETA_REFRESH_MS = 30_000

export function StopList({ routeName, direction, stops, city }: Props) {
  const { addTarget, removeTarget, hasTarget } = useBusStore()
  const [etaMap, setEtaMap] = useState<Map<string, BusEta | null>>(new Map())
  const [etaLoading, setEtaLoading] = useState(false)

  const loadEtas = useCallback(async () => {
    if (stops.length === 0) return
    setEtaLoading(true)
    try {
      const uids = stops.map((s) => s.stopUID)
      const map = await fetchAllStopsEta(city, routeName, direction, uids)
      setEtaMap(map)
    } finally {
      setEtaLoading(false)
    }
  }, [city, routeName, direction, stops])

  useEffect(() => {
    loadEtas()
    const id = setInterval(loadEtas, ETA_REFRESH_MS)
    return () => clearInterval(id)
  }, [loadEtas])

  function makeId(stop: BusStop) {
    return `${routeName}-${direction}-${stop.stopUID}`
  }

  function handleToggle(stop: BusStop) {
    const id = makeId(stop)
    if (hasTarget(id)) {
      removeTarget(id)
    } else {
      addTarget({
        id,
        routeName,
        direction,
        stopUID: stop.stopUID,
        stopName: stop.stopName,
        city,
      })
    }
  }

  if (stops.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        找不到「{routeName}」的站牌資料。請確認路線名稱或切換去回程。
      </p>
    )
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
        {routeName} · {DIRECTION_LABEL[direction]} — 共 {stops.length} 站
      </h3>
      <ul className="divide-y divide-gray-100">
        {stops.map((stop) => (
          <StopItem
            key={stop.stopUID}
            stop={stop}
            routeName={routeName}
            isMonitored={hasTarget(makeId(stop))}
            onToggle={handleToggle}
            eta={etaMap.get(stop.stopUID)}
            etaLoading={etaLoading && etaMap.size === 0}
          />
        ))}
      </ul>
    </div>
  )
}
