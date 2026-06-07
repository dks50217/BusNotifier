import { useNotification } from '@/hooks/useNotification'
import { useAudio } from '@/hooks/useAudio'

export function NotificationPermission() {
  const { permission, isSupported, requestPermission } = useNotification()
  const { playAlert } = useAudio()

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        此瀏覽器不支援 Web Notifications。請改用 Chrome 或 Edge。
      </div>
    )
  }

  if (permission === 'granted') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
        <span className="text-base">✓</span>
        通知已授權。公車接近時將自動提醒你。
        <button
          onClick={playAlert}
          className="ml-auto rounded border border-green-400 px-2 py-0.5 text-xs hover:bg-green-100 transition"
        >
          測試音效
        </button>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
        通知權限已被封鎖。請至瀏覽器網址列的🔒圖示，手動允許通知後重新整理頁面。
      </div>
    )
  }

  // default — not yet asked
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-blue-900">開啟到站通知</p>
        <p className="text-xs text-blue-700 mt-0.5">
          授權後，公車接近（&le;3 分鐘）時瀏覽器將自動彈出提示。
        </p>
      </div>
      <button
        onClick={requestPermission}
        className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition"
      >
        開啟通知授權
      </button>
    </div>
  )
}
