import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { TopBar } from '../components/common/TopBar'
import { EmptyState, ErrorState, PokemonSprite, TypeBadge } from '../components/ui'
import {
  paddedId,
  pokemonIdFromUrl,
  statLabel,
  titleCase,
  type Pokemon,
} from '../lib/pokeapi/client'
import { MAX_COMPARE, readComparison, saveComparison } from '../features/pokedex/comparison'
import { matchResources } from '../features/pokedex/matchResources'
import { usePokemonDetails, usePokemonDirectory } from '../features/pokedex/usePokemonPages'
import { usePageTitle } from '../lib/usePageTitle'

function initialSelection(add: string | null): string[] {
  const stored = readComparison()
  if (add && /^[a-z0-9-]+$/.test(add) && !stored.includes(add))
    return [...stored.slice(0, MAX_COMPARE - 1), add]
  return stored
}

export function PokemonComparePage() {
  usePageTitle('Compare Pokémon')
  const [searchParams, setSearchParams] = useSearchParams()
  const [selection, setSelection] = useState(() => initialSelection(searchParams.get('add')))
  const [term, setTerm] = useState('')

  useEffect(() => {
    if (searchParams.has('add')) setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])
  useEffect(() => saveComparison(selection), [selection])

  const full = selection.length >= MAX_COMPARE
  const directory = usePokemonDirectory(!full)
  const details = usePokemonDetails(selection)
  const suggestions = useMemo(
    () =>
      matchResources(
        (directory.data?.results ?? []).filter((resource) => !selection.includes(resource.name)),
        term,
        { matchId: true },
      ).slice(0, 6),
    [directory.data, selection, term],
  )

  function add(name: string) {
    setSelection((current) => [...current, name].slice(0, MAX_COMPARE))
    setTerm('')
  }

  const loaded = details.flatMap((query) => (query.data ? [query.data] : []))
  const statNames = loaded[0]?.stats.map((stat) => stat.stat.name) ?? []
  const columns = { '--columns': selection.length } as React.CSSProperties

  return (
    <main className="page compare">
      <TopBar title="Compare Pokémon" back="/tools" />
      <div className="page-body">
        {!full && (
          <div className="compare-picker">
            <label className="search-field">
              {selection.length ? (
                <Plus size={20} aria-hidden="true" />
              ) : (
                <Search size={20} aria-hidden="true" />
              )}
              <input
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                aria-label="Add a Pokémon to compare"
                placeholder={selection.length ? 'Add another Pokémon' : 'Add a Pokémon'}
                value={term}
                onChange={(event) => setTerm(event.target.value)}
              />
            </label>
            {directory.isError && !directory.data && term && (
              <ErrorState
                message="Pokémon names could not load."
                onRetry={() => void directory.refetch()}
              />
            )}
            {suggestions.length > 0 && (
              <ul className="list">
                {suggestions.map((resource) => {
                  const id = pokemonIdFromUrl(resource.url)
                  return (
                    <li key={resource.name}>
                      <button type="button" className="list-row" onClick={() => add(resource.name)}>
                        <PokemonSprite id={id} className="list-sprite" />
                        <span className="list-text">
                          <strong>{titleCase(resource.name)}</strong>
                          <small className="dex-number">{paddedId(id)}</small>
                        </span>
                        <Plus className="list-chevron" size={18} aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {selection.length === 0 ? (
          <EmptyState title="Nothing to compare yet">
            Add up to three Pokémon to see their base stats, types and abilities side by side.
          </EmptyState>
        ) : (
          <div className="compare-table">
            <div className="compare-grid compare-header" style={columns}>
              {selection.map((name, index) => {
                const pokemon = details[index]?.data
                return (
                  <div className="compare-pokemon" key={name}>
                    <button
                      type="button"
                      className="icon-button compare-remove"
                      aria-label={`Remove ${titleCase(name)}`}
                      onClick={() =>
                        setSelection((current) => current.filter((item) => item !== name))
                      }
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                    {pokemon ? (
                      <Link to={`/pokemon/${pokemon.name}`}>
                        <PokemonSprite id={pokemon.id} />
                        <strong>{titleCase(pokemon.name)}</strong>
                      </Link>
                    ) : details[index]?.isError ? (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => void details[index].refetch()}
                      >
                        {titleCase(name)} could not load. Try again
                      </button>
                    ) : (
                      <>
                        <span className="sprite skeleton" aria-hidden="true" />
                        <strong>{titleCase(name)}</strong>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            <CompareRow label="Types" columns={columns}>
              {details.map((query, index) => (
                <div className="type-row" key={selection[index]}>
                  {query.data?.types.map(({ type }) => (
                    <TypeBadge key={type.name} type={type.name} link />
                  ))}
                </div>
              ))}
            </CompareRow>
            <CompareRow label="Abilities" columns={columns}>
              {details.map((query, index) => (
                <div className="compare-abilities" key={selection[index]}>
                  {query.data?.abilities.map(({ ability, is_hidden }) => (
                    <Link key={ability.name} to={`/abilities/${ability.name}`}>
                      {titleCase(ability.name)}
                      {is_hidden && <small> (hidden)</small>}
                    </Link>
                  ))}
                </div>
              ))}
            </CompareRow>
            {statNames.map((statName) => (
              <StatRow
                key={statName}
                label={statLabel(statName)}
                columns={columns}
                values={details.map(
                  (query) =>
                    query.data?.stats.find((entry) => entry.stat.name === statName)?.base_stat,
                )}
                ids={selection}
              />
            ))}
            {loaded.length > 0 && (
              <StatRow
                label="Total"
                columns={columns}
                values={details.map((query) => statTotal(query.data))}
                ids={selection}
                scale={780}
              />
            )}
          </div>
        )}
        <p className="note">
          Base stats are species data. They don’t include level, nature, training or battle effects.
        </p>
      </div>
    </main>
  )
}

function statTotal(pokemon?: Pokemon) {
  return pokemon?.stats.reduce((sum, stat) => sum + stat.base_stat, 0)
}

function CompareRow({
  label,
  columns,
  children,
}: {
  label: string
  columns: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div className="compare-row">
      <h3>{label}</h3>
      <div className="compare-grid" style={columns}>
        {children}
      </div>
    </div>
  )
}

function StatRow({
  label,
  values,
  columns,
  ids,
  scale = 255,
}: {
  label: string
  values: (number | undefined)[]
  columns: React.CSSProperties
  ids: string[]
  scale?: number
}) {
  const known = values.filter((value): value is number => value != null)
  const best = known.length > 1 ? Math.max(...known) : null
  return (
    <CompareRow label={label} columns={columns}>
      {values.map((value, index) => (
        <div className="compare-stat" key={ids[index]} data-best={value === best || undefined}>
          <b>{value ?? '—'}</b>
          <div className="stat-track" aria-hidden="true">
            <i style={{ transform: `scaleX(${Math.min((value ?? 0) / scale, 1)})` }} />
          </div>
        </div>
      ))}
    </CompareRow>
  )
}
