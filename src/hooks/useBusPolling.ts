/**
 * useBusPolling — core polling hook
 *
 * Polls the ETA for every MonitorTarget every POLL_INTERVAL_MS.
 * Fires a browser notification + audio chime when a bus crosses the alert
 * threshold (≤ 3 min or ≤ 2 stops).
 *
 * Alert de-duplication: a notification is only fired once per target per
 * "approach cycle". The alerted flag is cleared when the estimate climbs
 * back above the threshold (new bus coming).
 */

import { useEffect, useRef, useCallback } from 'react'
import { fetchEta } from '@/api/busService'
import type { MonitorTarget, PollingResult, BusEta } from '@/types/bus'
import { ALERT_THRESHOLD_SECS, ALERT_THRESHOLD_STOPS } from '@/types/bus'
import { useNotification } from './useNotification'
import { useAudio } from './useAudio'

const POLL_INTERVAL_MS = 30_000

interface UseBusPollingOptions {
  targets: MonitorTarget[]
  onResult: (result: PollingResult) => void
}

export function useBusPolling({ targets, onResult }: UseBusPollingOptions) {
  const { notify, permission } = useNotification()
  const { playAlert } = useAudio()

  // Track which targets have already fired an alert this approach cycle.
  const alertedSet = useRef<Set<string>>(new Set())

  const pollOne = useCallback(
    async (target: MonitorTarget) => {
      onResult({ target, eta: null, loading: true, error: null, lastPolled: null })

      try {
        const eta = await fetchEta(
          target.city,
          target.routeName,
          target.direction,
          target.stopUID,
        )

        onResult({
          target,
          eta,
          loading: false,
          error: null,
          lastPolled: new Date(),
        })

        handleAlert(target, eta)
      } catch (err) {
        onResult({
          target,
          eta: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          lastPolled: new Date(),
        })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify, permission, playAlert],
  )

  function handleAlert(target: MonitorTarget, eta: BusEta | null) {
    if (!eta) return

    const isClose =
      eta.isArriving ||
      (eta.estimateSecs !== null && eta.estimateSecs <= ALERT_THRESHOLD_SECS) ||
      (eta.stopsAway !== null && eta.stopsAway <= ALERT_THRESHOLD_STOPS)

    if (isClose && !alertedSet.current.has(target.id)) {
      alertedSet.current.add(target.id)

      const minsAway =
        eta.estimateSecs !== null
          ? Math.ceil(eta.estimateSecs / 60)
          : null

      const body = eta.isArriving
        ? `${target.routeName} 即將進站！`
        : minsAway !== null
          ? `${target.routeName} 約 ${minsAway} 分鐘後到站`
          : `${target.routeName} 接近中`

      notify(`公車快到了！— ${target.stopName}`, { body })
      playAlert()
    }

    // Reset so the next approach cycle can fire again.
    if (!isClose && alertedSet.current.has(target.id)) {
      alertedSet.current.delete(target.id)
    }
  }

  const pollAll = useCallback(async () => {
    await Promise.allSettled(targets.map(pollOne))
  }, [targets, pollOne])

  useEffect(() => {
    if (targets.length === 0) return

    pollAll() // immediate first fetch

    const id = setInterval(pollAll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [targets, pollAll])
}
