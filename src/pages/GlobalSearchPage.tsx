import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Search, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { TopBar } from '../components/common/TopBar'
import { EmptyState, ErrorState, PokemonSprite } from '../components/ui'
import { matchResources } from '../features/pokedex/matchResources'
import {
  getCompleteResourceIndex,
  getPokemonDirectory,
  POKEMON_TYPES,
  paddedId,
  pokemonIdFromUrl,
  pokemonKeys,
  resourceKeys,
  titleCase,
  type NamedResource,
  type ResourceKind,
} from '../lib/pokeapi/client'
import { usePageTitle } from '../lib/usePageTitle'

const GROUPS: { key: 'pokemon' | ResourceKind; label: string }[] = [
  { key: 'pokemon', label: 'Pokémon' },
  { key: 'moves', label: 'Moves' },
  { key: 'abilities', label: 'Abilities' },
  { key: 'items', label: 'Items' },
  { key: 'types', label: 'Types' },
]

const SHOWN_PER_GROUP = 6

function useSearchGroup(group: 'pokemon' | ResourceKind, term: string) {
  const query = useQuery({
    queryKey:
      group === 'pokemon' ? pokemonKeys.directory : [...resourceKeys.list(group), 'search-index'],
    queryFn: ({ signal }) =>
      group === 'pokemon' ? getPokemonDirectory(signal) : getCompleteResourceIndex(group, signal),
    enabled: Boolean(term),
    staleTime: 1000 * 60 * 60 * 24,
  })
  const resources: NamedResource[] = query.data?.results ?? []
  const results = matchResources(
    resources.filter(
      (resource) =>
        group !== 'types' ||
        POKEMON_TYPES.includes(resource.name as (typeof POKEMON_TYPES)[number]),
    ),
    term,
    { matchId: group === 'pokemon' },
  )
  return { query, results }
}

export function GlobalSearchPage() {
  usePageTitle('Search')
  const [searchParams, setSearchParams] = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') ?? '')
  const term = (searchParams.get('q') ?? '').trim()

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = value.trim()
      setSearchParams(next ? { q: next } : {}, { replace: true, preventScrollReset: true })
    }, 200)
    return () => window.clearTimeout(timeout)
  }, [value, setSearchParams])

  const groups = {
    pokemon: useSearchGroup('pokemon', term),
    moves: useSearchGroup('moves', term),
    abilities: useSearchGroup('abilities', term),
    items: useSearchGroup('items', term),
    types: useSearchGroup('types', term),
  }
  const states = Object.values(groups)
  const anyLoading = states.some(({ query }) => query.isLoading)
  const failed = states.filter(({ query }) => query.isError && !query.data)
  const totalMatches = states.reduce((sum, { results }) => sum + results.length, 0)

  return (
    <main className="page search-page">
      <TopBar title="Search" back="/" search={false} />
      <div className="page-body">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            // Dismisses the on-screen keyboard so the results are visible.
            const active = document.activeElement
            if (active instanceof HTMLElement) active.blur()
          }}
        >
          <label className="search-field">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoFocus
              aria-label="Search Pokémon, moves, abilities, items and types"
              placeholder="Pikachu, thunderbolt or 25"
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            {value && (
              <button
                type="button"
                className="search-clear"
                aria-label="Clear search"
                onClick={() => setValue('')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </label>
        </form>

        {!term && (
          <EmptyState title="Search everything">
            Pokémon by name or number, plus moves, abilities, items and types.
          </EmptyState>
        )}
        {term && failed.length > 0 && (
          <ErrorState
            message="Some results could not load. Check your connection and try again."
            onRetry={() => failed.forEach(({ query }) => void query.refetch())}
          />
        )}
        {term && !anyLoading && !failed.length && totalMatches === 0 && (
          <EmptyState title={`No results for “${term}”`}>
            Check the spelling or try part of a name.
          </EmptyState>
        )}
        {term && (
          <div role="region" aria-label={`Results for ${term}`}>
            {GROUPS.map(({ key, label }) => (
              <SearchGroup
                key={`${key}-${term}`}
                group={key}
                label={label}
                results={groups[key].results}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function SearchGroup({
  group,
  label,
  results,
}: {
  group: 'pokemon' | ResourceKind
  label: string
  results: NamedResource[]
}) {
  const [expanded, setExpanded] = useState(false)
  if (!results.length) return null
  const shown = expanded ? results : results.slice(0, SHOWN_PER_GROUP)
  return (
    <section className="section" aria-labelledby={`search-${group}`}>
      <h2 className="section-title" id={`search-${group}`}>
        {label} <span className="count">{results.length}</span>
      </h2>
      <ul className="list">
        {shown.map((resource) => {
          const id = pokemonIdFromUrl(resource.url)
          return (
            <li key={resource.name}>
              <Link
                className="list-row"
                to={
                  group === 'pokemon' ? `/pokemon/${resource.name}` : `/${group}/${resource.name}`
                }
              >
                {group === 'pokemon' && <PokemonSprite id={id} className="list-sprite" />}
                <span className="list-text">
                  <strong>{titleCase(resource.name)}</strong>
                  {group === 'pokemon' && <small className="dex-number">{paddedId(id)}</small>}
                </span>
                <ChevronRight className="list-chevron" size={18} aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>
      {results.length > SHOWN_PER_GROUP && (
        <button
          type="button"
          className="button button-secondary button-block"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show fewer' : `Show all ${results.length}`}
        </button>
      )}
    </section>
  )
}
