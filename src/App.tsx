import { useState, useCallback } from 'react'
import { useBusStore } from '@/store/useBusStore'
import { useBusPolling } from '@/hooks/useBusPolling'
import { RouteSearch } from '@/components/Search'
import { StopList } from '@/components/StopList'
import { AlertBanner } from '@/components/AlertBanner'
import { MonitorList } from '@/components/MonitorList'
import { NotificationPermission } from '@/components/NotificationPermission'
import type { BusStop, Direction, PollingResult } from '@/types/bus'
import { DEFAULT_CITY } from '@/utils/cities'

interface SearchResult {
  routeName: string
  direction: Direction
  stops: BusStop[]
  city: string
}

export default function App() {
  const { targets } = useBusStore()
  const [city, setCity] = useState(DEFAULT_CITY)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [pollingResults, setPollingResults] = useState<Map<string, PollingResult>>(new Map())

  const handleCityChange = useCallback((nextCity: string) => {
    setCity(nextCity)
    setSearchResult(null) // clear results when city changes
  }, [])

  const handleStopsLoaded = useCallback(
    (routeName: string, direction: Direction, stops: BusStop[]) => {
      setSearchResult({ routeName, direction, stops, city })
    },
    [city],
  )

  const handlePollingResult = useCallback((result: PollingResult) => {
    setPollingResults((prev) => new Map(prev).set(result.target.id, result))
  }, [])

  useBusPolling({ targets, onResult: handlePollingResult })

  const activeResults = targets
    .map((t) => pollingResults.get(t.id))
    .filter((r): r is PollingResult => r !== undefined)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src="/bus.svg" alt="bus" className="w-7 h-7" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">BusNotifier</h1>
            <p className="text-xs text-gray-500">公車到站提醒</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Notification permission banner */}
        <NotificationPermission />

        {/* Live monitor cards */}
        {activeResults.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              即時到站時間
            </h2>
            <AlertBanner results={activeResults} />
          </section>
        )}

        {/* Route search */}
        <section className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">搜尋路線</h2>
          <RouteSearch
            city={city}
            onCityChange={handleCityChange}
            onStopsLoaded={handleStopsLoaded}
          />
          {searchResult && (
            <StopList
              routeName={searchResult.routeName}
              direction={searchResult.direction}
              stops={searchResult.stops}
              city={searchResult.city}
            />
          )}
        </section>

        {/* Current monitors */}
        {targets.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <MonitorList />
          </section>
        )}
      </main>
    </div>
  )
}
