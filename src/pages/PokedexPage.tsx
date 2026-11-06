import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { TopBar } from '../components/common/TopBar'
import {
  DexNumber,
  EmptyState,
  ErrorState,
  LoadingState,
  PokemonSprite,
  TypeBadge,
} from '../components/ui'
import {
  usePokemonCardDetails,
  usePokemonDirectory,
  usePokemonPages,
} from '../features/pokedex/usePokemonPages'
import {
  friendlyError,
  getPokemonSpeciesCount,
  POKEMON_TYPES,
  pokemonIdFromUrl,
  pokemonKeys,
  titleCase,
  typeVars,
  type Pokemon,
} from '../lib/pokeapi/client'
import { useLoadMoreOnScroll } from '../lib/useLoadMoreOnScroll'
import { usePageTitle } from '../lib/usePageTitle'

const SEARCH_BATCH_SIZE = 20

export function PokedexPage() {
  usePageTitle('Pokédex')
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const selected = searchParams
    .getAll('type')
    .filter((type): type is (typeof POKEMON_TYPES)[number] =>
      POKEMON_TYPES.includes(type as (typeof POKEMON_TYPES)[number]),
    )
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const [searchPage, setSearchPage] = useState({ term: '', limit: SEARCH_BATCH_SIZE })
  const normalizedSearch = search.trim().toLowerCase()
  const settledSearch = debouncedSearch.trim().toLowerCase()
  const searchPending = normalizedSearch !== settledSearch

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 250)
    return () => window.clearTimeout(timeout)
  }, [search])
  const searchLimit = searchPage.term === settledSearch ? searchPage.limit : SEARCH_BATCH_SIZE

  const list = usePokemonPages(selected, !normalizedSearch)
  const directory = usePokemonDirectory(Boolean(normalizedSearch))
  const speciesCount = useQuery({
    queryKey: pokemonKeys.speciesCount,
    queryFn: ({ signal }) => getPokemonSpeciesCount(signal),
    staleTime: 1000 * 60 * 60 * 24,
  })
  const searchMatches = useMemo(() => {
    if (!settledSearch || !directory.data) return []
    const term = settledSearch.replace(/\s+/g, '-').replace(/^#/, '')
    const numericId = /^\d+$/.test(term) ? Number(term) : null
    return directory.data.results
      .filter(
        (resource) =>
          resource.name.includes(term) ||
          (numericId != null && pokemonIdFromUrl(resource.url) === numericId),
      )
      .sort((first, second) => {
        const firstStarts = first.name.startsWith(term) ? 0 : 1
        const secondStarts = second.name.startsWith(term) ? 0 : 1
        return (
          firstStarts - secondStarts || pokemonIdFromUrl(first.url) - pokemonIdFromUrl(second.url)
        )
      })
  }, [directory.data, settledSearch])

  const resources = normalizedSearch
    ? searchMatches.slice(0, searchLimit)
    : (list.data?.pages.flatMap((page) => page.resources) ?? [])
  const detailQueries = usePokemonCardDetails(resources)
  const detailsLoading = detailQueries.some((query) => query.isLoading)
  const matchesTypes = (pokemon: Pokemon) =>
    selected.every((type) => pokemon.types.some((item) => item.type.name === type))
  // The paged list is already filtered by type; search results are filtered as details arrive.
  const visibleCount = normalizedSearch
    ? detailQueries.filter((query) => query.data && matchesTypes(query.data)).length
    : resources.length

  const hasMoreSearch = Boolean(normalizedSearch) && searchMatches.length > searchLimit
  const hasMoreList = !normalizedSearch && Boolean(list.hasNextPage)
  const canLoadMore = hasMoreSearch
    ? !searchPending && !detailsLoading
    : hasMoreList && !list.isFetchingNextPage && !list.isFetchNextPageError
  const sentinel = useLoadMoreOnScroll(
    () => {
      if (hasMoreSearch)
        setSearchPage({ term: settledSearch, limit: searchLimit + SEARCH_BATCH_SIZE })
      else if (hasMoreList) void list.fetchNextPage()
    },
    canLoadMore,
    resources.length,
  )

  function toggleType(type: string) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        const current = next.getAll('type')
        next.delete('type')
        const updated = current.includes(type)
          ? current.filter((item) => item !== type)
          : [...current, type]
        updated.forEach((item) => next.append('type', item))
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  function clearTypes() {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete('type')
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  function setSearch(value: string) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        const normalized = value.trimStart()
        if (normalized) next.set('q', normalized)
        else next.delete('q')
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  const searching = normalizedSearch && (searchPending || directory.isLoading || detailsLoading)
  const total = normalizedSearch ? searchMatches.length : list.data?.pages[0]?.total
  const summary = normalizedSearch
    ? searching
      ? 'Searching'
      : `${total ?? 0} ${total === 1 ? 'match' : 'matches'}`
    : total == null
      ? ''
      : selected.length
        ? `${total.toLocaleString()} ${total === 1 ? 'match' : 'matches'}`
        : `${(speciesCount.data ?? total).toLocaleString()} species, plus alternate forms`

  return (
    <main className="page pokedex">
      <TopBar title="Pokédex" search={false} />
      <div className="page-body">
        <label className="search-field">
          <Search size={20} aria-hidden="true" />
          <input
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            aria-label="Search Pokémon by name or number"
            placeholder="Name or number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
          {search && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => setSearch('')}
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </label>
        <div className="chips-scroll" role="group" aria-label="Filter by type">
          <button
            type="button"
            className="chip"
            aria-pressed={selected.length === 0}
            onClick={clearTypes}
          >
            All types
          </button>
          {POKEMON_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="chip chip-type"
              style={typeVars(type)}
              aria-pressed={selected.includes(type)}
              onClick={() => toggleType(type)}
            >
              {titleCase(type)}
            </button>
          ))}
        </div>
        <p className="result-summary" aria-live="polite">
          {summary}
        </p>

        {!normalizedSearch && list.isError && !list.data && (
          <ErrorState
            message={friendlyError(list.error, 'The Pokédex')}
            onRetry={() => void list.refetch()}
          />
        )}
        {normalizedSearch && directory.isError && !directory.data && (
          <ErrorState
            message="Search needs a connection the first time it’s used."
            onRetry={() => void directory.refetch()}
          />
        )}
        {!normalizedSearch && list.isLoading && <LoadingState label="Loading Pokémon" />}

        <div className="pokemon-grid">
          {resources.map((resource, index) => {
            const query = detailQueries[index]
            if (query?.data)
              return matchesTypes(query.data) || !normalizedSearch ? (
                <PokemonCard key={resource.name} pokemon={query.data} />
              ) : null
            if (query?.isError)
              return (
                <div className="pokemon-card pokemon-card-error" key={resource.name} role="alert">
                  <span>{titleCase(resource.name)} could not load</span>
                  <button type="button" onClick={() => void query.refetch()}>
                    Try again
                  </button>
                </div>
              )
            return <div className="pokemon-card skeleton" key={resource.name} aria-hidden="true" />
          })}
        </div>

        {normalizedSearch &&
          !searching &&
          directory.data &&
          visibleCount === 0 &&
          !hasMoreSearch && (
            <EmptyState title={`No Pokémon match “${search.trim()}”`}>
              {selected.length ? 'Try removing a type filter.' : 'Try part of a name or a number.'}
            </EmptyState>
          )}
        {!normalizedSearch && !list.isLoading && !list.isError && resources.length === 0 && (
          <EmptyState title="No Pokémon have all of these types">
            A Pokémon has at most two types. Try removing one.
          </EmptyState>
        )}
        {list.isFetchNextPageError && !normalizedSearch && (
          <ErrorState
            message="More Pokémon could not load."
            onRetry={() => void list.fetchNextPage()}
          />
        )}
        <div ref={sentinel} className="scroll-sentinel" aria-hidden="true" />
        {(hasMoreSearch || hasMoreList) && (list.isFetchingNextPage || detailsLoading) && (
          <LoadingState label="Loading more" />
        )}
      </div>
    </main>
  )
}

function PokemonCard({ pokemon }: { pokemon: Pokemon }) {
  return (
    <Link
      className="pokemon-card"
      to={`/pokemon/${pokemon.name}`}
      style={typeVars(pokemon.types[0]?.type.name)}
    >
      <span className="pokemon-card-head">
        <strong>{titleCase(pokemon.name)}</strong>
        <DexNumber id={pokemon.id} />
      </span>
      <span className="pokemon-card-types">
        {pokemon.types.map(({ type }) => (
          <TypeBadge key={type.name} type={type.name} />
        ))}
      </span>
      <PokemonSprite id={pokemon.id} className="pokemon-card-sprite" />
    </Link>
  )
}
