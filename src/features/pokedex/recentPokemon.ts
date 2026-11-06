const STORAGE_KEY = 'pokedex:recent:v1'
const MAX_RECENT = 12

export type RecentPokemon = { id: number; name: string }

export function readRecentPokemon(): RecentPokemon[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is RecentPokemon =>
        typeof entry?.id === 'number' && typeof entry?.name === 'string',
    )
  } catch {
    return []
  }
}

export function rememberRecentPokemon({ id, name }: RecentPokemon) {
  try {
    const next = [{ id, name }, ...readRecentPokemon().filter((entry) => entry.id !== id)]
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, MAX_RECENT)))
  } catch {
    // Recents are a convenience; the app works the same without them.
  }
}
