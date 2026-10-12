import { useEffect, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  getPokemon,
  getPokemonPage,
  pokemonKeys,
  titleCase,
  TYPE_COLORS,
} from '../lib/pokeapi/client'
import type { Pokemon } from '../lib/pokeapi/client'

const COMPARE_STORAGE_KEY = 'pokedex:comparison:v1'
const MAX_COMPARE = 3

function initialSelection(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY) ?? '[]')
    if (Array.isArray(parsed))
      return [
        ...new Set(
          parsed.filter(
            (value): value is string => typeof value === 'string' && /^[a-z0-9-]+$/.test(value),
          ),
        ),
      ].slice(0, MAX_COMPARE)
  } catch {
    // The comparison is still usable for this session if storage is unavailable.
  }
  return []
}

function ComparisonHeader({ pokemon, name }: { pokemon?: Pokemon; name: string }) {
  return (
    <th scope="col">
      {pokemon ? (
        <Link className="compare-pokemon-name" to={`/pokemon/${pokemon.name}`}>
          {titleCase(pokemon.name)}
        </Link>
      ) : (
        titleCase(name)
      )}
    </th>
  )
}
export function PokemonComparePage() {
  useEffect(() => {
    document.title = 'Compare Pokémon | Pokédex'
    return () => {
      document.title = 'Pokédex — Discover Pokémon'
    }
  }, [])
  const [selection, setSelection] = useState<string[]>(initialSelection)
  const directory = useQuery({
    queryKey: pokemonKeys.directory,
    queryFn: ({ signal }) => getPokemonPage(0, 2000, signal),
    staleTime: 1000 * 60 * 60 * 24,
  })
  const details = useQueries({
    queries: selection.map((name) => ({
      queryKey: pokemonKeys.detail(name),
      queryFn: ({ signal }) => getPokemon(name, signal),
      staleTime: 1000 * 60 * 60 * 12,
    })),
  })
  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(selection))
    } catch {
      /* Keep current selections in memory. */
    }
  }, [selection])
  const resources = directory.data?.results ?? []
  const loaded = details.map((query) => query.data)
  const statNames = loaded.find(Boolean)?.stats.map((stat) => stat.stat.name) ?? []
  function setSlot(slot: number, name: string) {
    setSelection((current) => {
      const next = [...current]
      if (!name) next.splice(slot, 1)
      else if (!next.includes(name)) next[slot] = name
      return next.filter(Boolean).slice(0, MAX_COMPARE)
    })
  }

  return (
    <main className="page-width utility-page">
      <div className="crumb">
        <Link to="/">Discover</Link>
        <span>/</span>
        <Link to="/tools">Tools</Link>
        <span>/</span>
        <b>Compare Pokémon</b>
      </div>
      <header className="utility-heading">
        <div className="eyebrow">TOOLS</div>
        <h1>
          Compare Pokémon<span>.</span>
        </h1>
        <p>
          Compare the same base stats, types, and abilities side by side. Base stats are species
          data; they do not include level, nature, training, or battle effects.
        </p>
        <Link className="tool-switch-link" to="/tools/type-effectiveness">
          Type effectiveness <span aria-hidden="true">→</span>
        </Link>
      </header>
      <section className="type-chart-panel" aria-labelledby="compare-selection-heading">
        <h2 id="compare-selection-heading">Choose up to {MAX_COMPARE} Pokémon</h2>
        {directory.isLoading && (
          <p role="status" className="muted">
            Loading Pokédex names…
          </p>
        )}
        {directory.isError && !directory.data && (
          <div className="error-box" role="alert">
            Pokédex names could not be loaded.
            <button onClick={() => void directory.refetch()}>Retry</button>
          </div>
        )}
        {directory.data && (
          <div className="compare-selectors">
            {Array.from({ length: MAX_COMPARE }, (_, slot) => (
              <label key={slot}>
                {slot === 0
                  ? 'First Pokémon'
                  : slot === 1
                    ? 'Second Pokémon'
                    : 'Third Pokémon (optional)'}
                <select
                  value={selection[slot] ?? ''}
                  disabled={slot > selection.length}
                  onChange={(event) => setSlot(slot, event.target.value)}
                >
                  <option value="">{slot < 2 ? 'Choose a Pokémon' : 'None'}</option>
                  {resources.map((resource) => (
                    <option
                      key={resource.name}
                      value={resource.name}
                      disabled={
                        selection.includes(resource.name) && selection[slot] !== resource.name
                      }
                    >
                      {titleCase(resource.name)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
        {!!selection.length && (
          <button className="secondary-button" type="button" onClick={() => setSelection([])}>
            Clear comparison
          </button>
        )}
        {!selection.length && (
          <p className="muted" role="status">
            Choose two or more Pokémon to compare their profiles.
          </p>
        )}
        {details.some((query) => query.isError && !query.data) && (
          <div className="error-box" role="alert">
            Some Pokémon details could not be loaded.
            {details.map((query, index) =>
              query.isError && !query.data ? (
                <button key={selection[index]} onClick={() => void query.refetch()}>
                  Retry {titleCase(selection[index])}
                </button>
              ) : null,
            )}
          </div>
        )}
        {!!selection.length && (
          <div className="comparison-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col">Profile</th>
                  {selection.map((name, index) => (
                    <ComparisonHeader key={name} name={name} pokemon={details[index]?.data} />
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Types</th>
                  {selection.map((name, index) => (
                    <td key={name}>
                      {details[index]?.data
                        ? details[index].data.types.map(({ type }) => (
                            <Link
                              key={type.name}
                              to={`/types/${type.name}`}
                              style={
                                {
                                  '--type-color': TYPE_COLORS[type.name] ?? '#9299a2',
                                } as React.CSSProperties
                              }
                            >
                              {titleCase(type.name)}
                            </Link>
                          ))
                        : 'Loading…'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Abilities</th>
                  {selection.map((name, index) => (
                    <td key={name}>
                      {details[index]?.data
                        ? details[index].data.abilities.map(({ ability, is_hidden }) => (
                            <Link
                              className="compare-ability"
                              key={ability.name}
                              to={`/abilities/${ability.name}`}
                            >
                              {titleCase(ability.name)}
                              {is_hidden && <small>Hidden</small>}
                            </Link>
                          ))
                        : 'Loading…'}
                    </td>
                  ))}
                </tr>
                {statNames.map((statName) => (
                  <tr key={statName}>
                    <th scope="row">{titleCase(statName)}</th>
                    {selection.map((name, index) => {
                      const stat = details[index]?.data?.stats.find(
                        (entry) => entry.stat.name === statName,
                      )
                      return (
                        <td key={name}>
                          {stat?.base_stat ??
                            (details[index]?.isError ? 'Unavailable' : 'Loading…')}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="compare-total-row">
                  <th scope="row">Base stat total</th>
                  {selection.map((name, index) => (
                    <td key={name}>
                      {details[index]?.data?.stats.reduce((sum, stat) => sum + stat.base_stat, 0) ??
                        '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
