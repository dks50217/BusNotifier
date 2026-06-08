import { getAllUsers } from './userStore.js'
import { fetchEta } from './busService.js'
import { getLineClient } from './lineClient.js'
import type { BusEta } from '../src/types/bus.js'
import type { UserTarget } from './userStore.js'

const POLL_INTERVAL_MS = 30_000
const ALERT_THRESHOLD_SECS = 3 * 60  // 3 minutes
const ALERT_THRESHOLD_STOPS = 2

// Key: `${userId}-${targetId}` — prevents duplicate alerts within one approach cycle
const alertedSet = new Set<string>()

async function poll(): Promise<void> {
  const users = getAllUsers()

  for (const user of users) {
    for (const target of user.targets) {
      const key = `${user.userId}-${target.id}`
      try {
        const eta = await fetchEta(target.city, target.routeName, target.direction, target.stopUID)

        if (shouldAlert(eta)) {
          if (!alertedSet.has(key)) {
            alertedSet.add(key)
            await getLineClient().pushMessage({
              to: user.userId,
              messages: [{ type: 'text', text: buildAlertMessage(target, eta!) }],
            })
          }
        } else {
          alertedSet.delete(key)
        }
      } catch (err) {
        console.error(`[poller] ${user.userId} ${target.id}:`, (err as Error).message)
      }
    }
  }
}

function shouldAlert(eta: BusEta | null): boolean {
  if (!eta || eta.stopStatus !== 0) return false
  if (eta.isArriving) return true
  if (eta.estimateSecs != null && eta.estimateSecs <= ALERT_THRESHOLD_SECS) return true
  if (eta.stopsAway != null && eta.stopsAway <= ALERT_THRESHOLD_STOPS) return true
  return false
}

function buildAlertMessage(target: UserTarget, eta: BusEta): string {
  const dirLabel = target.direction === 0 ? '去程' : '回程'
  const header = `🚨 公車快到了！\n\n${target.routeName}路 ${dirLabel}\n${target.stopName}\n\n`
  if (eta.isArriving) return `${header}⚡ 正在進站，快出發！`
  const mins = eta.estimateSecs != null ? Math.ceil(eta.estimateSecs / 60) : '?'
  const stops = eta.stopsAway ?? '?'
  return `${header}約 ${mins} 分鐘（${stops} 站），快出發！`
}

export function startPoller(): void {
  console.log(`[poller] started — interval ${POLL_INTERVAL_MS / 1000}s`)
  poll()
  setInterval(poll, POLL_INTERVAL_MS)
}
