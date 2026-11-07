import {
  useInfiniteQuery,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'
import {
  getPokemon,
  getPokemonDirectory,
  getPokemonPage,
  getPokemonType,
  POKEMON_TYPES,
  pokemonIdFromUrl,
  pokemonKeys,
  type PokemonTypeList,
} from '../../lib/pokeapi/client'

const PAGE_SIZE = 20

export function usePokemonPages(types: string[], enabled = true) {
  const queryClient = useQueryClient()
  const selectedTypes = [...types].sort()

  return useInfiniteQuery({
    queryKey: pokemonKeys.list(selectedTypes),
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      let resources
      let total: number
      if (selectedTypes.length === 0) {
        const page = await getPokemonPage(pageParam, PAGE_SIZE, signal)
        resources = page.results
        total = page.count
      } else {
        const typedSets = await Promise.all(
          selectedTypes.map((type) =>
            queryClient.fetchQuery({
              queryKey: pokemonKeys.type(type),
              queryFn: ({ signal: typeSignal }) => getPokemonType(type, typeSignal),
              staleTime: 1000 * 60 * 60 * 24,
            }),
          ),
        )
        const first = new Map(typedSets[0].pokemon.map((item) => [item.pokemon.name, item.pokemon]))
        for (const result of typedSets.slice(1)) {
          const membership = new Set(result.pokemon.map((item) => item.pokemon.name))
          for (const name of first.keys()) if (!membership.has(name)) first.delete(name)
        }
        const ordered = [...first.values()].sort(
          (a, b) => pokemonIdFromUrl(a.url) - pokemonIdFromUrl(b.url),
        )
        resources = ordered.slice(pageParam, pageParam + PAGE_SIZE)
        total = ordered.length
      }
      return {
        resources,
        nextOffset: pageParam + resources.length < total ? pageParam + resources.length : undefined,
        total,
      }
    },
    getNextPageParam: (page) => page.nextOffset,
    staleTime: 1000 * 60 * 30,
  })
}

export function usePokemonDetails(names: string[]) {
  return useQueries({
    queries: names.map((name) => ({
      queryKey: pokemonKeys.detail(name),
      queryFn: ({ signal }: { signal: AbortSignal }) => getPokemon(name, signal),
      staleTime: 1000 * 60 * 60 * 12,
    })),
  })
}

export type PokemonSummary = { id: number; name: string; types: string[] }

function combineSummaries(results: UseQueryResult<PokemonTypeList>[]) {
  const ready = results.every((result) => result.data)
  const failed = results.some((result) => result.isError && !result.data)
  const slotted = new Map<string, { id: number; types: { slot: number; type: string }[] }>()
  // A partial set would show Pokémon with a type missing, so wait for all of them.
  if (ready) {
    results.forEach((result, index) => {
      for (const { slot, pokemon } of result.data!.pokemon) {
        const entry = slotted.get(pokemon.name) ?? { id: pokemonIdFromUrl(pokemon.url), types: [] }
        entry.types.push({ slot, type: POKEMON_TYPES[index] })
        slotted.set(pokemon.name, entry)
      }
    })
  }
  const summaries = new Map<string, PokemonSummary>()
  for (const [name, { id, types }] of slotted) {
    const ordered = types.sort((a, b) => a.slot - b.slot).map(({ type }) => type)
    summaries.set(name, { id, name, types: ordered })
  }
  return {
    summaries,
    ready,
    failed,
    loading: !ready && !failed,
    retry: () => results.forEach((result) => result.isError && void result.refetch()),
  }
}

/**
 * The name, number and types of every Pokémon, built from the 18 type lists. A full Pokémon record
 * is about 300 KB unpacked, far too heavy to load for each row of a long list.
 */
export function usePokemonSummaries() {
  return useQueries({
    queries: POKEMON_TYPES.map((type) => ({
      queryKey: pokemonKeys.type(type),
      queryFn: ({ signal }: { signal: AbortSignal }) => getPokemonType(type, signal),
      staleTime: 1000 * 60 * 60 * 24,
    })),
    combine: combineSummaries,
  })
}

export function usePokemonDirectory(enabled: boolean) {
  return useQuery({
    queryKey: pokemonKeys.directory,
    queryFn: ({ signal }) => getPokemonDirectory(signal),
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
  })
}
