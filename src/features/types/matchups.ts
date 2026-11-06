import { useQueries } from '@tanstack/react-query'
import { getPokemonType, pokemonKeys, POKEMON_TYPES } from '../../lib/pokeapi/client'

const STORAGE_KEY = 'pokedex:type-calculator:v1'

export function readDefendingTypes(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (Array.isArray(value))
      return value.filter((entry) => POKEMON_TYPES.includes(entry)).slice(0, 2)
  } catch {
    // Fall back to a useful default when browser storage is unavailable.
  }
  return ['fire']
}

export function saveDefendingTypes(types: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(types))
  } catch {
    // Selections remain available for the current session.
  }
}

export const MATCHUP_GROUPS = [
  { multiplier: 4, label: 'Takes 4× damage from' },
  { multiplier: 2, label: 'Takes 2× damage from' },
  { multiplier: 0.5, label: 'Takes ½ damage from' },
  { multiplier: 0.25, label: 'Takes ¼ damage from' },
  { multiplier: 0, label: 'Immune to' },
] as const

/** Combines each attacking type's multipliers across one or two defending types. */
export function useTypeMatchups(defenders: string[]) {
  const queries = useQueries({
    queries: defenders.map((type) => ({
      queryKey: pokemonKeys.type(type),
      queryFn: ({ signal }: { signal: AbortSignal }) => getPokemonType(type, signal),
      staleTime: 1000 * 60 * 60 * 24,
    })),
  })
  const ready = defenders.length > 0 && queries.every((query) => query.data)
  const byMultiplier = new Map<number, string[]>()
  if (ready) {
    for (const attacker of POKEMON_TYPES) {
      let multiplier = 1
      for (const query of queries) {
        const relations = query.data!.damage_relations
        if (relations.no_damage_from.some((type) => type.name === attacker)) multiplier = 0
        else if (relations.double_damage_from.some((type) => type.name === attacker))
          multiplier *= 2
        else if (relations.half_damage_from.some((type) => type.name === attacker))
          multiplier *= 0.5
      }
      byMultiplier.set(multiplier, [...(byMultiplier.get(multiplier) ?? []), attacker])
    }
  }
  return {
    ready,
    byMultiplier,
    loading: queries.some((query) => query.isPending),
    failed: queries.some((query) => query.isError && !query.data),
    retry: () => void Promise.all(queries.map((query) => query.refetch())),
  }
}
