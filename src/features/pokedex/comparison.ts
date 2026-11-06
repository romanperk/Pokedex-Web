const STORAGE_KEY = 'pokedex:comparison:v1'
export const MAX_COMPARE = 3

export function readComparison(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (Array.isArray(parsed))
      return [
        ...new Set(
          parsed.filter(
            (value): value is string => typeof value === 'string' && /^[a-z0-9-]+$/.test(value),
          ),
        ),
      ].slice(0, MAX_COMPARE)
  } catch {
    // The comparison is still usable for this session if storage is unavailable.
  }
  return []
}

export function saveComparison(selection: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
  } catch {
    // Keep current selections in memory.
  }
}
