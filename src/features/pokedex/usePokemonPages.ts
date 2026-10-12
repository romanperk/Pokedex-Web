import { useInfiniteQuery, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPokemon,
  getPokemonPage,
  getPokemonType,
  pokemonIdFromUrl,
  pokemonKeys,
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

export function usePokemonCardDetails(resources: { name: string }[]) {
  return useQueries({
    queries: resources.map((resource) => ({
      queryKey: pokemonKeys.detail(resource.name),
      queryFn: ({ signal }: { signal: AbortSignal }) => getPokemon(resource.name, signal),
      staleTime: 1000 * 60 * 60 * 12,
    })),
  })
}

export function usePokemonDirectory(enabled: boolean) {
  return useQuery({
    queryKey: pokemonKeys.directory,
    queryFn: ({ signal }) => getPokemonPage(0, 2000, signal),
    enabled,
    staleTime: 1000 * 60 * 60 * 24,
  })
}
