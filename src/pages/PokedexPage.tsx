import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  POKEMON_TYPES,
  paddedId,
  pokemonArtwork,
  pokemonIdFromUrl,
  pokemonSprite,
  titleCase,
  TYPE_COLORS,
  type Pokemon,
} from '../lib/pokeapi/client'
import {
  usePokemonCardDetails,
  usePokemonDirectory,
  usePokemonPages,
} from '../features/pokedex/usePokemonPages'
import { Button } from '../components/ui'
import { useOnlineStatus } from '../lib/useOnlineStatus'

const SEARCH_BATCH_SIZE = 20

export function PokedexPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const selected = searchParams
    .getAll('type')
    .filter((type): type is (typeof POKEMON_TYPES)[number] =>
      POKEMON_TYPES.includes(type as (typeof POKEMON_TYPES)[number]),
    )
  const isOnline = useOnlineStatus()
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchPage, setSearchPage] = useState({ term: '', limit: SEARCH_BATCH_SIZE })
  const normalizedSearch = search.trim().toLowerCase()
  const settledSearch = debouncedSearch.trim().toLowerCase()
  const searchPending = normalizedSearch !== settledSearch

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timeout)
  }, [search])
  const searchLimit = searchPage.term === settledSearch ? searchPage.limit : SEARCH_BATCH_SIZE

  const list = usePokemonPages(selected, !normalizedSearch)
  const directory = usePokemonDirectory(Boolean(settledSearch))
  const searchMatches = useMemo(() => {
    if (!settledSearch || !directory.data) return []
    const term = settledSearch.replace(/\s+/g, '-')
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
  const listResources = list.data?.pages.flatMap((page) => page.resources) ?? []
  const resources = normalizedSearch ? searchMatches.slice(0, searchLimit) : listResources
  const detailQueries = usePokemonCardDetails(resources)
  const loadedPokemon = useMemo(
    () => detailQueries.flatMap((query) => (query.data ? [query.data] : [])),
    [detailQueries],
  )
  const visible = normalizedSearch
    ? loadedPokemon.filter((pokemon) =>
        selected.every((type) => pokemon.types.some((item) => item.type.name === type)),
      )
    : loadedPokemon
  const selectedCount = list.data?.pages[0]?.total
  const searchDetailsLoading = detailQueries.some((query) => query.isLoading)
  const searchDetailsError = detailQueries.some((query) => query.isError && !query.data)
  const searchPendingResults = searchPending || directory.isLoading || searchDetailsLoading

  function toggleType(type: string) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      const current = next.getAll('type')
      next.delete('type')
      const updated = current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
      updated.forEach((item) => next.append('type', item))
      return next
    })
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
      { replace: true },
    )
  }

  function clearSearchAndFilters() {
    setDebouncedSearch('')
    setSearchParams({})
    setSearchPage({ term: '', limit: SEARCH_BATCH_SIZE })
  }

  return (
    <main className="pokedex page-width">
      <div className="crumb">
        <Link to="/">Discover</Link>
        <span>/</span>
        <b>Pokédex</b>
      </div>
      <section className="list-heading">
        <div>
          <div className="eyebrow">THE COMPLETE COLLECTION</div>
          <h1>
            Pokédex<span className="heading-period">.</span>
          </h1>
          <p>Find a Pokémon by name or number, or browse by type.</p>
        </div>
        <div className="dex-count">
          <strong>
            {normalizedSearch
              ? directory.data
                ? searchMatches.length
                : '—'
              : (selectedCount ?? '—')}
          </strong>
          <span>
            {normalizedSearch
              ? 'NAME MATCHES'
              : selected.length
                ? 'MATCHING POKÉMON'
                : 'POKÉMON IN INDEX'}
          </span>
        </div>
      </section>
      <div className="list-controls">
        <div className="filters-wrap">
          <p className="filter-help">
            Choose one or more types to find Pokémon that have <strong>all</strong> selected types.
          </p>
          <div
            className="filters"
            role="group"
            aria-label="Filter Pokémon by type; multiple selections use all selected types"
          >
            {(['all', ...POKEMON_TYPES] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={`filter-chip ${(!selected.length && type === 'all') || (type !== 'all' && selected.includes(type)) ? 'filter-selected' : ''}`}
                style={
                  {
                    '--type-color': type === 'all' ? '#222a35' : TYPE_COLORS[type],
                  } as React.CSSProperties
                }
                aria-pressed={type === 'all' ? selected.length === 0 : selected.includes(type)}
                onClick={() =>
                  type === 'all'
                    ? setSearchParams((previous) => {
                        const next = new URLSearchParams(previous)
                        next.delete('type')
                        return next
                      })
                    : toggleType(type)
                }
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <label className="list-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            aria-label="Search Pokémon by partial name or Pokédex number"
            placeholder="Search a name or number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button type="button" aria-label="Clear search" onClick={() => setSearch('')}>
              ×
            </button>
          )}
        </label>
      </div>
      {(normalizedSearch || selected.length > 0) && (
        <button className="clear-search-filters" type="button" onClick={clearSearchAndFilters}>
          Clear search and type filters
        </button>
      )}
      {!isOnline && (normalizedSearch ? directory.data : list.data) && (
        <p className="offline-status" role="status">
          You’re offline. Showing available cached Pokémon data; uncached records may not load.
        </p>
      )}

      {!normalizedSearch && list.isError && (
        <div className="error-box" role="alert">
          {list.data
            ? 'PokéAPI could not refresh. Showing available cached Pokémon where possible.'
            : list.error instanceof Error
              ? list.error.message
              : 'Could not load PokéAPI.'}
          <button onClick={() => void list.refetch()}>Retry</button>
        </div>
      )}
      {normalizedSearch && directory.isError && (
        <div className="error-box" role="alert">
          {directory.data
            ? 'PokéAPI could not refresh the name index. Showing cached search data.'
            : 'The Pokémon name index could not be loaded. Check your connection and retry.'}
          <button onClick={() => void directory.refetch()}>Retry</button>
        </div>
      )}
      {normalizedSearch && searchPendingResults && !directory.isError && (
        <div className="loading-state" role="status">
          <span className="loader" />
          Searching Pokémon…
        </div>
      )}
      {normalizedSearch && directory.data && !directory.isLoading && (
        <p className="search-summary" role="status">
          {visible.length} Pokémon shown from {searchMatches.length} name matches
          {selected.length ? ' after applying all selected type filters' : ''}.
        </p>
      )}
      {normalizedSearch && searchDetailsError && (
        <div className="error-box" role="alert">
          Some Pokémon details could not be loaded. Retry an individual result below.
        </div>
      )}

      <div className="pokemon-grid">
        {normalizedSearch
          ? resources.map((resource, index) => {
              const query = detailQueries[index]
              if (query?.data) {
                const matchesTypes = selected.every((type) =>
                  query.data.types.some((item) => item.type.name === type),
                )
                return matchesTypes ? (
                  <PokemonCard key={query.data.id} pokemon={query.data} />
                ) : null
              }
              if (query?.isError)
                return (
                  <div className="pokemon-card card-error" key={resource.name} role="alert">
                    <span>{titleCase(resource.name)} could not load.</span>
                    <button onClick={() => void query.refetch()}>Retry</button>
                  </div>
                )
              return (
                <div
                  className="pokemon-card pokemon-skeleton"
                  key={resource.name}
                  aria-hidden="true"
                >
                  <i />
                  <b />
                  <span />
                </div>
              )
            })
          : resources.map((resource, index) => {
              const query = detailQueries[index]
              if (query?.data) return <PokemonCard key={resource.name} pokemon={query.data} />
              if (query?.isError)
                return (
                  <div className="pokemon-card card-error" key={resource.name} role="alert">
                    <span>{titleCase(resource.name)} could not load.</span>
                    <button onClick={() => void query.refetch()}>Retry</button>
                  </div>
                )
              return (
                <div
                  className="pokemon-card pokemon-skeleton"
                  key={resource.name}
                  aria-hidden="true"
                >
                  <i />
                  <b />
                  <span />
                </div>
              )
            })}
      </div>
      {!normalizedSearch && list.isLoading && (
        <div className="loading-state" role="status">
          <span className="loader" />
          Catching Pokémon…
        </div>
      )}
      {normalizedSearch &&
        directory.data &&
        !searchPendingResults &&
        searchMatches.length === 0 && (
          <div className="empty-state" role="status">
            No Pokémon match “{search}”. Try part of a name or a Pokédex number.
          </div>
        )}
      {normalizedSearch &&
        directory.data &&
        !searchPendingResults &&
        searchMatches.length > 0 &&
        !visible.length &&
        !searchDetailsError &&
        (searchLimit < searchMatches.length ? (
          <div className="empty-state" role="status">
            No Pokémon in this batch match all selected types. Load more results to continue
            searching.
          </div>
        ) : (
          <div className="empty-state" role="status">
            No Pokémon match “{search}” with all selected type filters.
          </div>
        ))}
      {!normalizedSearch && !list.isLoading && !list.isError && !visible.length && (
        <div className="empty-state" role="status">
          No Pokémon match all selected type filters.
        </div>
      )}
      {normalizedSearch && searchMatches.length > searchLimit && (
        <Button
          className="load-more"
          disabled={searchDetailsLoading}
          onClick={() =>
            setSearchPage({ term: settledSearch, limit: searchLimit + SEARCH_BATCH_SIZE })
          }
        >
          {searchDetailsLoading ? 'Loading results…' : 'Load more search results'}{' '}
          <span aria-hidden="true">↓</span>
        </Button>
      )}
      {!normalizedSearch && list.hasNextPage && (
        <Button
          className="load-more"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {list.isFetchingNextPage ? 'Loading…' : 'Load more Pokémon'}{' '}
          <span aria-hidden="true">↓</span>
        </Button>
      )}
    </main>
  )
}

function PokemonCard({ pokemon }: { pokemon: Pokemon }) {
  const color = TYPE_COLORS[pokemon.types[0]?.type.name] || '#93a0b1'
  return (
    <article className="pokemon-card" style={{ '--pokemon-color': color } as React.CSSProperties}>
      <Link
        className="pokemon-card-link"
        to={`/pokemon/${pokemon.name}`}
        aria-label={`${titleCase(pokemon.name)}, ${paddedId(pokemon.id)}`}
      >
        <span className="pokemon-number">{paddedId(pokemon.id)}</span>
        <span className="pokemon-name">{titleCase(pokemon.name)}</span>
        <span className="card-types">
          {pokemon.types.map((type) => (
            <span
              className="type-badge"
              key={type.type.name}
              style={{ '--type-color': TYPE_COLORS[type.type.name] } as React.CSSProperties}
            >
              {type.type.name}
            </span>
          ))}
        </span>
        <img
          loading="lazy"
          src={pokemonSprite(pokemon.id)}
          onError={(event) => {
            const image = event.currentTarget
            const fallback = pokemonArtwork(pokemon)
            if (image.src !== fallback) image.src = fallback
            else image.hidden = true
          }}
          alt={`${titleCase(pokemon.name)} sprite`}
        />
        <span className="card-ball" aria-hidden="true" />
      </Link>
    </article>
  )
}
