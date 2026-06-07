import { useState, useCallback, useEffect } from 'react'

export type NotificationPermission = 'default' | 'granted' | 'denied'

export interface UseNotificationReturn {
  permission: NotificationPermission
  isSupported: boolean
  requestPermission: () => Promise<void>
  notify: (title: string, options?: NotificationOptions) => void
}

export function useNotification(): UseNotificationReturn {
  const isSupported = 'Notification' in window

  const [permission, setPermission] = useState<NotificationPermission>(
    isSupported ? (window.Notification.permission as NotificationPermission) : 'denied',
  )

  // Keep state in sync if the user changes the browser-level setting externally.
  useEffect(() => {
    if (!isSupported) return
    setPermission(window.Notification.permission as NotificationPermission)
  }, [isSupported])

  const requestPermission = useCallback(async () => {
    if (!isSupported) return
    const result = await window.Notification.requestPermission()
    setPermission(result as NotificationPermission)
  }, [isSupported])

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || permission !== 'granted') return
      new window.Notification(title, {
        icon: '/bus.svg',
        badge: '/bus.svg',
        ...options,
      })
    },
    [isSupported, permission],
  )

  return { permission, isSupported, requestPermission, notify }
}
