const BEST_KEY = 'pokedex:guess-best:v1'

export function readGuessBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

export function saveGuessBest(best: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(best))
  } catch {
    // The best streak still counts for this session.
  }
}
