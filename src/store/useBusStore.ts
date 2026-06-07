import { create } from 'zustand'
import type { MonitorTarget } from '@/types/bus'
import { loadTargets, saveTargets } from '@/utils/localStorage'

interface BusStore {
  targets: MonitorTarget[]
  addTarget: (t: MonitorTarget) => void
  removeTarget: (id: string) => void
  hasTarget: (id: string) => boolean
}

export const useBusStore = create<BusStore>((set, get) => ({
  targets: loadTargets(),

  addTarget(t) {
    if (get().hasTarget(t.id)) return
    const next = [...get().targets, t]
    saveTargets(next)
    set({ targets: next })
  },

  removeTarget(id) {
    const next = get().targets.filter((t) => t.id !== id)
    saveTargets(next)
    set({ targets: next })
  },

  hasTarget(id) {
    return get().targets.some((t) => t.id === id)
  },
}))
