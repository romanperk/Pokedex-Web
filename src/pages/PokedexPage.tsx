import { useEffect, useMemo, useState } from 'react'
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
import { matchResources } from '../features/pokedex/matchResources'
import {
  usePokemonDirectory,
  usePokemonPages,
  usePokemonSummaries,
  type PokemonSummary,
} from '../features/pokedex/usePokemonPages'
import {
  friendlyError,
  POKEMON_TYPES,
  SPECIES_COUNT,
  titleCase,
  typeVars,
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
  const {
    summaries,
    failed: summariesFailed,
    loading: summariesLoading,
    retry: retrySummaries,
  } = usePokemonSummaries()
  const nameMatches = useMemo(
    () =>
      settledSearch && directory.data
        ? matchResources(directory.data.results, settledSearch, { matchId: true })
        : [],
    [directory.data, settledSearch],
  )
  const searchMatches = selected.length
    ? nameMatches.filter((resource) => {
        const types = summaries.get(resource.name)?.types
        return selected.every((type) => types?.includes(type))
      })
    : nameMatches

  const resources = normalizedSearch
    ? searchMatches.slice(0, searchLimit)
    : (list.data?.pages.flatMap((page) => page.resources) ?? [])
  // Without the type data, a search with a type filter can't tell what matches.
  const filterBlocked = Boolean(normalizedSearch) && selected.length > 0 && summariesFailed

  const hasMoreSearch = Boolean(normalizedSearch) && searchMatches.length > searchLimit
  const hasMoreList = !normalizedSearch && Boolean(list.hasNextPage)
  const canLoadMore = hasMoreSearch
    ? !searchPending
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

  const searching =
    normalizedSearch &&
    (searchPending || directory.isLoading || (selected.length > 0 && summariesLoading))
  const total = normalizedSearch ? searchMatches.length : list.data?.pages[0]?.total
  const summary = normalizedSearch
    ? searching
      ? 'Searching'
      : `${total ?? 0} ${total === 1 ? 'match' : 'matches'}`
    : total == null
      ? ''
      : selected.length
        ? `${total.toLocaleString()} ${total === 1 ? 'match' : 'matches'}`
        : `${SPECIES_COUNT.toLocaleString()} species, plus alternate forms`

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
        {summariesFailed && (resources.length > 0 || filterBlocked) && (
          <ErrorState message="Pokémon details could not load." onRetry={retrySummaries} />
        )}
        {!normalizedSearch && list.isLoading && <LoadingState label="Loading Pokémon" />}

        <div className="pokemon-grid">
          {resources.map((resource) => {
            const pokemon = summaries.get(resource.name)
            if (pokemon) return <PokemonCard key={resource.name} pokemon={pokemon} />
            if (summariesFailed) return null
            return <div className="pokemon-card skeleton" key={resource.name} aria-hidden="true" />
          })}
        </div>

        {normalizedSearch &&
          !searching &&
          directory.data &&
          searchMatches.length === 0 &&
          !filterBlocked && (
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
        {hasMoreList && list.isFetchingNextPage && <LoadingState label="Loading more" />}
      </div>
    </main>
  )
}

function PokemonCard({ pokemon }: { pokemon: PokemonSummary }) {
  return (
    <Link
      className="pokemon-card"
      to={`/pokemon/${pokemon.name}`}
      style={typeVars(pokemon.types[0])}
    >
      <span className="pokemon-card-head">
        <strong>{titleCase(pokemon.name)}</strong>
        <DexNumber id={pokemon.id} />
      </span>
      <span className="pokemon-card-types">
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </span>
      <PokemonSprite id={pokemon.id} className="pokemon-card-sprite" />
    </Link>
  )
}
