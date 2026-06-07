import { useState, useCallback } from 'react'
import { fetchStops } from '@/api/busService'
import type { BusStop, Direction } from '@/types/bus'
import { CITIES } from '@/utils/cities'

interface Props {
  city: string
  onCityChange: (city: string) => void
  onStopsLoaded: (routeName: string, direction: Direction, stops: BusStop[]) => void
}

type Tab = 0 | 1

export function RouteSearch({ city, onCityChange, onStopsLoaded }: Props) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    const routeName = query.trim()
    if (!routeName) return

    setLoading(true)
    setError(null)

    try {
      const stops = await fetchStops(city, routeName, activeTab)
      if (stops.length === 0) {
        setError(`在「${CITIES.find(c => c.value === city)?.label ?? city}」找不到路線「${routeName}」的站牌，請確認城市是否正確。`)
      }
      onStopsLoaded(routeName, activeTab, stops)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '查詢失敗，請稍後再試'
      if (msg.startsWith('TDX_AUTH_ERROR')) {
        // Show the raw error detail (e.g. "network", "400", "401") to help diagnose
        const detail = msg.replace('TDX_AUTH_ERROR:', '').split(' —')[0].trim()
        setError(`TDX 授權失敗 [${detail}]：請確認 .env 的 Client ID / Secret，並重新啟動 dev server`)
      } else if (msg.startsWith('TDX_404')) {
        const cityLabel = CITIES.find(c => c.value === city)?.label ?? city
        setError(`在「${cityLabel}」找不到路線「${routeName}」，請確認路線名稱與城市`)
      } else if (msg.startsWith('TDX_429')) {
        setError('API 呼叫次數超限，請稍後再試')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [city, query, activeTab, onStopsLoaded])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="space-y-3">
      {/* City selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">縣市</label>
        <select
          value={city}
          onChange={(e) => onCityChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
        >
          {CITIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Route input + search button */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">路線號碼</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如 299、307、信義幹線"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? '查詢中…' : '查詢'}
          </button>
        </div>
      </div>

      {/* 去程 / 回程 tabs */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
        {(['去程', '回程'] as const).map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i as Tab)}
            className={`flex-1 py-1.5 transition ${
              activeTab === i
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  )
}
