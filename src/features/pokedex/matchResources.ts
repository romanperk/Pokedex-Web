import { pokemonIdFromUrl, type NamedResource } from '../../lib/pokeapi/client'

/** Turns what people type, such as "Mr. Mime" or "Flabébé", into PokéAPI's name format. */
export function normalizeSearchTerm(term: string) {
  return term
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s*♀/g, '-f')
    .replace(/\s*♂/g, '-m')
    .replace(/[.:'’]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^#/, '')
}

/** Resources matching a search, names that start with the term first, then in id order. */
export function matchResources<T extends NamedResource>(
  resources: T[],
  term: string,
  { matchId = false } = {},
) {
  const normalized = normalizeSearchTerm(term)
  if (!normalized) return []
  const id = matchId && /^\d+$/.test(normalized) ? Number(normalized) : null
  return resources
    .filter(
      (resource) =>
        resource.name.includes(normalized) || (id != null && pokemonIdFromUrl(resource.url) === id),
    )
    .sort(
      (first, second) =>
        Number(!first.name.startsWith(normalized)) - Number(!second.name.startsWith(normalized)) ||
        pokemonIdFromUrl(first.url) - pokemonIdFromUrl(second.url),
    )
}
