import { useBusStore } from '@/store/useBusStore'

export function MonitorList() {
  const { targets, removeTarget } = useBusStore()

  if (targets.length === 0) return null

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
        監控中的站牌 ({targets.length})
      </h2>
      <ul className="space-y-1">
        {targets.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
          >
            <span className="font-medium text-gray-800">
              {t.routeName}{' '}
              <span className="text-gray-400 font-normal">
                {t.direction === 0 ? '去程' : '回程'}
              </span>{' '}
              · {t.stopName}
            </span>
            <button
              onClick={() => removeTarget(t.id)}
              className="text-gray-400 hover:text-red-500 transition text-xs"
              aria-label="移除監控"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
