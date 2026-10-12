import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'pokedex:local-collection:v2'
const LEGACY_STORAGE_KEY = 'pokedex:saved-pokemon:v1'
const FORMAT = 'pokedex-web-local-collection'
export type CollectionEntry = { name: string; owned: boolean }
const listeners = new Set<() => void>()
let cachedValue: CollectionEntry[] | null = null
let storageUnavailable = false

function validName(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value)
  )
}

function normalizeName(value: string) {
  return value.toLowerCase()
}

function fromStoredRecords(records: unknown[]): CollectionEntry[] {
  return mergeDuplicateEntries(
    records.flatMap((record) => {
      if (!record || typeof record !== 'object' || !('name' in record) || !validName(record.name))
        return []
      if ('owned' in record && typeof record.owned === 'boolean') {
        return record.owned ? [{ name: normalizeName(record.name), owned: true }] : []
      }
      if (
        'favorite' in record &&
        typeof record.favorite === 'boolean' &&
        'seen' in record &&
        typeof record.seen === 'boolean' &&
        'caught' in record &&
        typeof record.caught === 'boolean'
      ) {
        // Earlier collection records were explicit additions; keep them in the new owned inventory.
        return record.favorite || record.seen || record.caught
          ? [{ name: normalizeName(record.name), owned: true }]
          : []
      }
      return []
    }),
  )
}

function readStorage(): CollectionEntry[] {
  try {
    const current = window.localStorage.getItem(STORAGE_KEY)
    if (current) {
      const parsed: unknown = JSON.parse(current)
      if (
        parsed &&
        typeof parsed === 'object' &&
        'records' in parsed &&
        Array.isArray(parsed.records)
      ) {
        const entries = fromStoredRecords(parsed.records)
        // Persist the normalized v2 schema, including conversion from the former checklist shape.
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, records: entries }))
        return entries
      }
      storageUnavailable = true
    }
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const parsed: unknown = JSON.parse(legacy)
      if (Array.isArray(parsed)) {
        const migrated = mergeDuplicateEntries(
          parsed.filter(validName).map((name) => ({ name: normalizeName(name), owned: true })),
        )
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, records: migrated }))
        return migrated
      }
    }
  } catch {
    storageUnavailable = true
  }
  return []
}

function mergeDuplicateEntries(entries: CollectionEntry[]) {
  const merged = new Map<string, CollectionEntry>()
  for (const entry of entries) {
    if (!entry.owned) continue
    const name = normalizeName(entry.name)
    merged.set(name, { name, owned: true })
  }
  return [...merged.values()]
}

function getSnapshot() {
  cachedValue ??= readStorage()
  return cachedValue
}

function getStorageStatus() {
  getSnapshot()
  return storageUnavailable
}

function notify() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = () => {
    cachedValue = null
    storageUnavailable = false
    getSnapshot()
    notify()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function persist(entries: CollectionEntry[]) {
  cachedValue = mergeDuplicateEntries(entries)
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, records: cachedValue }))
    storageUnavailable = false
  } catch {
    storageUnavailable = true
  }
  notify()
  return !storageUnavailable
}

export function useCollectionEntries() {
  return useSyncExternalStore(subscribe, getSnapshot, () => [])
}

export function useCollectionStorageUnavailable() {
  return useSyncExternalStore(subscribe, getStorageStatus, () => false)
}

export function useSavedPokemon() {
  return useCollectionEntries().map((entry) => entry.name)
}

export function isPokemonSaved(name: string) {
  return getSnapshot().some((entry) => entry.name === normalizeName(name))
}

export function toggleSavedPokemon(name: string) {
  const normalized = normalizeName(name)
  const current = getSnapshot()
  const saved = !current.some((entry) => entry.name === normalized)
  const next = saved
    ? [...current, { name: normalized, owned: true }]
    : current.filter((entry) => entry.name !== normalized)
  const persisted = persist(next)
  return { saved, persisted }
}

export function setPokemonOwned(name: string, owned: boolean) {
  const normalized = normalizeName(name)
  const current = getSnapshot()
  const next = owned
    ? [...current.filter((entry) => entry.name !== normalized), { name: normalized, owned: true }]
    : current.filter((entry) => entry.name !== normalized)
  return persist(next)
}

export function removeCollectionEntry(name: string) {
  const normalized = normalizeName(name)
  const current = getSnapshot()
  const removed = current.find((entry) => entry.name === normalized)
  if (!removed) return { entry: undefined, persisted: !storageUnavailable }
  const persisted = persist(current.filter((entry) => entry.name !== normalized))
  return { entry: removed, persisted }
}

export function restoreCollectionEntry(entry: CollectionEntry) {
  return persist([...getSnapshot().filter((candidate) => candidate.name !== entry.name), entry])
}

export function exportCollection() {
  return {
    format: FORMAT,
    version: 2,
    exportedAt: new Date().toISOString(),
    records: getSnapshot(),
  }
}

export function importCollection(json: string, mode: 'merge' | 'replace' = 'merge') {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !('format' in parsed) ||
    parsed.format !== FORMAT ||
    !('version' in parsed) ||
    ![1, 2].includes(parsed.version as number) ||
    !('records' in parsed) ||
    !Array.isArray(parsed.records)
  ) {
    throw new Error('This file is not a supported Pokédex collection backup.')
  }
  if (parsed.records.length > 5000) throw new Error('This backup contains too many records.')
  const records: CollectionEntry[] = []
  for (const [index, record] of parsed.records.entries()) {
    const normalized = fromStoredRecords([record])
    if (!normalized.length)
      throw new Error(`Record ${index + 1} is invalid. No changes were imported.`)
    records.push(...normalized)
  }
  const importedEntries = mergeDuplicateEntries(records)
  const result =
    mode === 'replace'
      ? importedEntries
      : mergeDuplicateEntries([...getSnapshot(), ...importedEntries])
  const persisted = persist(result)
  return { imported: importedEntries.length, total: result.length, persisted }
}
