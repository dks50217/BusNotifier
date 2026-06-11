import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { Direction } from '../src/types/bus.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DATA_FILE = join(DATA_DIR, 'users.json')

export interface UserTarget {
  id: string        // `${routeName}-${direction}-${stopUID}`
  routeName: string
  direction: Direction
  stopUID: string
  stopName: string
  city: string
}

export interface UserRecord {
  userId: string
  targets: UserTarget[]
  history: unknown[]
}

type Store = Record<string, UserRecord>

function load(): Store {
  if (!existsSync(DATA_FILE)) return {}
  return JSON.parse(readFileSync(DATA_FILE, 'utf-8')) as Store
}

function save(store: Store): void {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8')
}

function ensureRecord(store: Store, userId: string): void {
  if (!store[userId]) store[userId] = { userId, targets: [], history: [] }
}

export function ensureUser(userId: string): void {
  const store = load()
  if (!store[userId]) {
    store[userId] = { userId, targets: [], history: [] }
    save(store)
  }
}

export function getUser(userId: string): UserRecord | null {
  return load()[userId] ?? null
}

export function getAllUsers(): UserRecord[] {
  return Object.values(load())
}

export function addTarget(userId: string, target: UserTarget): void {
  const store = load()
  ensureRecord(store, userId)
  store[userId].targets = store[userId].targets.filter(t => t.id !== target.id)
  store[userId].targets.push(target)
  save(store)
}

export function removeTarget(userId: string, targetId: string): boolean {
  const store = load()
  if (!store[userId]) return false
  const before = store[userId].targets.length
  store[userId].targets = store[userId].targets.filter(t => t.id !== targetId)
  save(store)
  return store[userId].targets.length < before
}

export function removeAllTargets(userId: string): void {
  const store = load()
  if (store[userId]) {
    store[userId].targets = []
    save(store)
  }
}

export function getHistory(userId: string): unknown[] {
  return load()[userId]?.history ?? []
}

export function saveHistory(userId: string, history: unknown[]): void {
  const store = load()
  ensureRecord(store, userId)
  store[userId].history = history
  save(store)
}

export function clearHistory(userId: string): void {
  saveHistory(userId, [])
}
