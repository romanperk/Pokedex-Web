import { useEffect, useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  POKEMON_TYPES,
  TYPE_COLORS,
  getPokemonType,
  pokemonKeys,
  titleCase,
} from '../lib/pokeapi/client'

type PokemonType = (typeof POKEMON_TYPES)[number]
type Defenders = [PokemonType | '', PokemonType | '']
const TYPE_STORAGE_KEY = 'pokedex:type-calculator:v1'

function readInitialTypes(): Defenders {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(TYPE_STORAGE_KEY) ?? 'null')
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      value.every((entry) => entry === '' || POKEMON_TYPES.includes(entry))
    ) {
      return [value[0], value[1]]
    }
  } catch {
    // Fall back to a useful default when browser storage is unavailable.
  }
  return ['fire', '']
}

function multiplierLabel(value: number) {
  if (value === 0) return 'No effect (×0)'
  if (value === 0.25) return '¼ damage (×0.25)'
  if (value === 0.5) return '½ damage (×0.5)'
  if (value === 1) return 'Normal damage (×1)'
  if (value === 2) return 'Double damage (×2)'
  if (value === 4) return 'Quadruple damage (×4)'
  return `${value}× damage`
}

export function TypeChartPage() {
  useEffect(() => {
    document.title = 'Type effectiveness | Pokédex'
    return () => {
      document.title = 'Pokédex — Discover Pokémon'
    }
  }, [])
  const [defenders, setDefenders] = useState<Defenders>(readInitialTypes)
  const selectedTypes = defenders.filter((value): value is PokemonType => Boolean(value))
  const queries = useQueries({
    queries: selectedTypes.map((type) => ({
      queryKey: pokemonKeys.type(type),
      queryFn: ({ signal }) => getPokemonType(type, signal),
      staleTime: 1000 * 60 * 60 * 24,
    })),
  })
  useEffect(() => {
    try {
      localStorage.setItem(TYPE_STORAGE_KEY, JSON.stringify(defenders))
    } catch {
      // Calculator selections remain available for the current page session.
    }
  }, [defenders])

  const results = useMemo(() => {
    if (!selectedTypes.length || queries.some((query) => !query.data)) return []
    return POKEMON_TYPES.map((attackType) => {
      let multiplier = 1
      for (const query of queries) {
        const relations = query.data!.damage_relations
        if (relations.no_damage_from.some((type) => type.name === attackType)) multiplier = 0
        else if (
          multiplier !== 0 &&
          relations.double_damage_from.some((type) => type.name === attackType)
        )
          multiplier *= 2
        else if (
          multiplier !== 0 &&
          relations.half_damage_from.some((type) => type.name === attackType)
        )
          multiplier *= 0.5
      }
      return { type: attackType, multiplier }
    }).sort(
      (first, second) =>
        second.multiplier - first.multiplier || first.type.localeCompare(second.type),
    )
  }, [queries, selectedTypes.length])

  function chooseType(slot: 0 | 1, value: string) {
    const next = [...defenders] as Defenders
    if (value && next[1 - slot] === value) next[1 - slot] = ''
    next[slot] = value as PokemonType | ''
    setDefenders(next)
  }
  const failed = queries.some((query) => query.isError && !query.data)
  const loading = queries.some((query) => query.isPending)

  return (
    <main className="page-width utility-page">
      <div className="crumb">
        <Link to="/">Discover</Link>
        <span>/</span>
        <Link to="/tools">Tools</Link>
        <span>/</span>
        <b>Type effectiveness</b>
      </div>
      <header className="utility-heading">
        <div className="eyebrow">TOOLS</div>
        <h1>
          Type effectiveness<span>.</span>
        </h1>
        <p>See how each attacking type fares against one or two defending types.</p>
        <Link className="tool-switch-link" to="/tools/compare">
          Compare Pokémon <span aria-hidden="true">→</span>
        </Link>
      </header>
      <section className="type-chart-panel" aria-labelledby="defending-types-heading">
        <h2 id="defending-types-heading">Defending Pokémon types</h2>
        <p className="type-chart-scope">
          Choose a primary type and, optionally, a secondary type. Multipliers combine across both
          types; immunity sets the result to zero.
        </p>
        <div className="defender-selectors">
          {[0, 1].map((slot) => (
            <label key={slot}>
              {slot === 0 ? 'Primary type' : 'Secondary type (optional)'}
              <select
                value={defenders[slot]}
                onChange={(event) => chooseType(slot as 0 | 1, event.target.value)}
              >
                <option value="">{slot === 0 ? 'Choose a type' : 'None'}</option>
                {POKEMON_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                    disabled={type !== defenders[slot] && type === defenders[1 - slot]}
                  >
                    {titleCase(type)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <button type="button" className="secondary-button" onClick={() => setDefenders(['', ''])}>
            Clear types
          </button>
        </div>
        {!selectedTypes.length && (
          <p className="muted" role="status">
            Choose at least one defending type to see results.
          </p>
        )}
        {loading && (
          <p className="loading-state" role="status">
            Loading type matchups…
          </p>
        )}
        {failed && (
          <div className="error-box" role="alert">
            Type matchups could not be loaded.{' '}
            <button onClick={() => void Promise.all(queries.map((query) => query.refetch()))}>
              Retry
            </button>
          </div>
        )}
        {!!results.length && (
          <div className="type-results" aria-live="polite">
            <h2>Incoming type effectiveness</h2>
            <p className="type-chart-scope">
              Based on PokéAPI type relationships. This is a type chart, not a game-specific damage
              calculation; abilities, moves, and battle rules can change results.
            </p>
            <div className="effectiveness-table-wrap">
              <table className="effectiveness-table">
                <thead>
                  <tr>
                    <th scope="col">Attacking type</th>
                    <th scope="col">
                      Effectiveness against {selectedTypes.map(titleCase).join(' / ')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(({ type, multiplier }) => (
                    <tr key={type}>
                      <th scope="row">
                        <Link to={`/types/${type}`}>
                          <span
                            className="type-dot"
                            style={{ background: TYPE_COLORS[type] ?? '#9299a2' }}
                            aria-hidden="true"
                          />
                          {titleCase(type)}
                        </Link>
                      </th>
                      <td data-multiplier={multiplier}>{multiplierLabel(multiplier)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
