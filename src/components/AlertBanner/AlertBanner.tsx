import type { PollingResult } from '@/types/bus'
import { ALERT_THRESHOLD_SECS, ALERT_THRESHOLD_STOPS } from '@/types/bus'

interface Props {
  results: PollingResult[]
}

function formatEta(result: PollingResult): string {
  const { eta } = result
  if (!eta) return '—'
  if (eta.stopStatus !== 0) {
    const labels: Record<number, string> = {
      1: '尚未發車',
      2: '交管不停',
      3: '末班已過',
      4: '今日未營運',
    }
    return labels[eta.stopStatus] ?? '無資料'
  }
  if (eta.isArriving) return '即將進站！'
  if (eta.estimateSecs !== null) {
    const mins = Math.ceil(eta.estimateSecs / 60)
    return `約 ${mins} 分鐘`
  }
  return '—'
}

function isAlertState(result: PollingResult): boolean {
  const { eta } = result
  if (!eta || eta.stopStatus !== 0) return false
  return (
    eta.isArriving ||
    (eta.estimateSecs !== null && eta.estimateSecs <= ALERT_THRESHOLD_SECS) ||
    (eta.stopsAway !== null && eta.stopsAway <= ALERT_THRESHOLD_STOPS)
  )
}

const DIRECTION_LABEL = { 0: '去程', 1: '回程' } as const

export function AlertBanner({ results }: Props) {
  if (results.length === 0) return null

  return (
    <div className="space-y-2">
      {results.map(({ target, eta, loading, error }) => {
        const result = { target, eta, loading, error, lastPolled: null }
        const alert = isAlertState(result)

        return (
          <div
            key={target.id}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
              alert
                ? 'border-orange-400 bg-orange-50 animate-pulse'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {target.routeName}{' '}
                <span className="text-xs font-normal text-gray-500">
                  {DIRECTION_LABEL[target.direction]}
                </span>
              </p>
              <p className="text-xs text-gray-500 truncate">{target.stopName}</p>
            </div>

            <div className="ml-4 shrink-0 text-right">
              {loading && !eta ? (
                <span className="text-xs text-gray-400">更新中…</span>
              ) : error ? (
                <span className="text-xs text-red-500">錯誤</span>
              ) : (
                <span
                  className={`text-sm font-bold ${
                    alert ? 'text-orange-600' : 'text-blue-700'
                  }`}
                >
                  {formatEta({ target, eta, loading, error, lastPolled: null })}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
