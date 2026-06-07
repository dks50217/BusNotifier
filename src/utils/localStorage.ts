import type { MonitorTarget } from '@/types/bus'

const STORAGE_KEY = 'busnotifier_targets'

export function loadTargets(): MonitorTarget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as MonitorTarget[]) : []
  } catch {
    return []
  }
}

export function saveTargets(targets: MonitorTarget[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(targets))
}
