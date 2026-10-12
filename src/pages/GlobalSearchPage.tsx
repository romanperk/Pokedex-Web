import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import {
  getCompleteResourceIndex,
  getPokemonPage,
  POKEMON_TYPES,
  pokemonIdFromUrl,
  pokemonKeys,
  resourceKeys,
  titleCase,
  type NamedResource,
  type ResourceKind,
} from '../lib/pokeapi/client'

const groups: { key: 'pokemon' | ResourceKind; label: string }[] = [
  { key: 'pokemon', label: 'Pokémon' },
  { key: 'moves', label: 'Moves' },
  { key: 'abilities', label: 'Abilities' },
  { key: 'items', label: 'Items' },
  { key: 'types', label: 'Types' },
]

export function GlobalSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isOnline = useOnlineStatus()
  const term = (searchParams.get('q') ?? '').trim()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextTerm = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    if (nextTerm) setSearchParams({ q: nextTerm })
    else setSearchParams({})
  }

  return (
    <main className="page-width global-search-page">
      <div className="crumb">
        <Link to="/">Discover</Link>
        <span>/</span>
        <b>Search</b>
      </div>
      <header className="utility-heading">
        <div className="eyebrow">POKÉMON AND REFERENCE</div>
        <h1>
          Search<span>.</span>
        </h1>
        <p>
          Find Pokémon by name or Pokédex number, and search moves, abilities, items, and types.
        </p>
      </header>
      <form key={term} className="global-search-form" onSubmit={submit} role="search">
        <label htmlFor="global-search-input">Search Pokémon and reference collections</label>
        <div className="global-search-input-row">
          <input
            id="global-search-input"
            name="q"
            type="search"
            inputMode="search"
            autoComplete="off"
            autoFocus
            placeholder="Try Pikachu, thunderbolt, or 25"
            defaultValue={term}
          />
          <Button type="submit" variant="primary">
            Search
          </Button>
        </div>
      </form>
      {term && !isOnline && (
        <p className="offline-status" role="status">
          You’re offline. Showing available cached search data; uncached collections may not load.
        </p>
      )}
      {!term ? (
        <div className="global-search-prompt" role="status">
          Enter a name or number to search all available reference collections.
        </div>
      ) : (
        <div
          className="global-search-results"
          role="region"
          aria-label={`Search results for ${term}`}
        >
          {groups.map((group) => (
            <SearchGroup key={group.key} group={group.key} label={group.label} term={term} />
          ))}
        </div>
      )}
    </main>
  )
}

function SearchGroup({
  group,
  label,
  term,
}: {
  group: 'pokemon' | ResourceKind
  label: string
  term: string
}) {
  const query = useQuery({
    queryKey:
      group === 'pokemon' ? pokemonKeys.directory : [...resourceKeys.list(group), 'search-index'],
    queryFn: ({ signal }) =>
      group === 'pokemon'
        ? getPokemonPage(0, 2000, signal)
        : getCompleteResourceIndex(group, signal),
    staleTime: 1000 * 60 * 60 * 24,
  })
  const resources: NamedResource[] = query.data?.results ?? []
  const typeResults =
    group === 'types'
      ? resources.filter((resource) =>
          POKEMON_TYPES.includes(resource.name as (typeof POKEMON_TYPES)[number]),
        )
      : resources
  const normalizedTerm = term.toLowerCase().replace(/\s+/g, '-')
  const numericId =
    group === 'pokemon' && /^\d+$/.test(normalizedTerm) ? Number(normalizedTerm) : null
  const results = typeResults
    .filter(
      (resource) =>
        resource.name.includes(normalizedTerm) ||
        (numericId != null && pokemonIdFromUrl(resource.url) === numericId),
    )
    .sort(
      (first, second) =>
        Number(!first.name.startsWith(normalizedTerm)) -
          Number(!second.name.startsWith(normalizedTerm)) ||
        pokemonIdFromUrl(first.url) - pokemonIdFromUrl(second.url),
    )
  const shown = results.slice(0, 6)
  const href = (name: string) => (group === 'pokemon' ? `/pokemon/${name}` : `/${group}/${name}`)
  const singular = { moves: 'Move', abilities: 'Ability', items: 'Item', types: 'Type' } as const

  return (
    <section className="global-search-group" aria-labelledby={`search-${group}-heading`}>
      <div className="global-search-group-heading">
        <h2 id={`search-${group}-heading`}>{label}</h2>
        {!query.isLoading && (!query.isError || query.data) && (
          <span aria-live="polite">
            {results.length} {results.length === 1 ? 'match' : 'matches'}
          </span>
        )}
      </div>
      {query.isLoading && (
        <p className="search-group-status" role="status">
          Searching {label.toLowerCase()}…
        </p>
      )}
      {query.isError && (
        <div className="search-group-error" role="alert">
          <span>
            {query.data
              ? `Could not refresh ${label.toLowerCase()}; showing cached results.`
              : `${label} could not be searched. Check your connection and retry.`}
          </span>
          <button type="button" onClick={() => void query.refetch()}>
            Retry
          </button>
        </div>
      )}
      {!query.isLoading && query.data && shown.length > 0 && (
        <ul className="global-search-result-list">
          {shown.map((resource) => (
            <li key={resource.name}>
              <Link to={href(resource.name)}>
                <span>{titleCase(resource.name)}</span>
                <span>
                  {group === 'pokemon'
                    ? `Pokédex ${String(pokemonIdFromUrl(resource.url)).padStart(3, '0')}`
                    : singular[group]}
                  <i aria-hidden="true">↗</i>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!query.isLoading && query.data && results.length === 0 && (
        <p className="search-group-status" role="status">
          No {label.toLowerCase()} match “{term}”.
        </p>
      )}
      {results.length > 6 && (
        <p className="search-group-more">
          Showing the first 6 of {results.length} matches. Browse{' '}
          <Link to={group === 'pokemon' ? '/pokedex' : `/${group}`}>{label.toLowerCase()}</Link> for
          the full collection.
        </p>
      )}
    </section>
  )
}
