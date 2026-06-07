import type { BusStop, BusEta } from '@/types/bus'

interface Props {
  stop: BusStop
  routeName: string
  isMonitored: boolean
  onToggle: (stop: BusStop) => void
  eta?: BusEta | null
  etaLoading?: boolean
}

const STATUS_TEXT: Partial<Record<number, string>> = {
  1: '尚未發車',
  2: '交管不停',
  3: '末班已過',
  4: '今日未營運',
}

function EtaBadge({ eta, loading }: { eta: BusEta | null | undefined; loading: boolean }) {
  if (loading) {
    return <span className="text-xs text-gray-300">載入中</span>
  }
  if (eta === undefined || eta === null) {
    return <span className="text-xs text-gray-300">—</span>
  }
  if (eta.stopStatus !== 0) {
    return <span className="text-xs text-gray-400">{STATUS_TEXT[eta.stopStatus] ?? '—'}</span>
  }
  if (eta.isArriving) {
    return (
      <span className="text-xs font-bold text-green-600 animate-pulse">即將進站</span>
    )
  }
  if (eta.estimateSecs !== null) {
    const mins = Math.ceil(eta.estimateSecs / 60)
    const color = mins <= 3 ? 'text-orange-500' : mins <= 8 ? 'text-yellow-600' : 'text-blue-500'
    return <span className={`text-xs font-semibold ${color}`}>{mins} 分鐘</span>
  }
  if (eta.stopsAway !== null) {
    return <span className="text-xs font-semibold text-blue-500">{eta.stopsAway} 站</span>
  }
  return <span className="text-xs text-gray-300">—</span>
}

export function StopItem({ stop, isMonitored, onToggle, eta, etaLoading = false }: Props) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition">
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
          {stop.sequence}
        </span>
        <div className="min-w-0">
          <span className="block text-sm text-gray-800 truncate">{stop.stopName}</span>
          <EtaBadge eta={eta} loading={etaLoading} />
        </div>
      </div>
      <button
        onClick={() => onToggle(stop)}
        aria-label={isMonitored ? '取消監控' : '設定監控'}
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${
          isMonitored
            ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
            : 'border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 focus:ring-blue-400'
        }`}
      >
        {isMonitored ? '監控中 ✓' : '+ 監控'}
      </button>
    </li>
  )
}
