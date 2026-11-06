import { useEffect, useState } from 'react'
import { TopBar } from '../components/common/TopBar'
import { EmptyState } from '../components/ui'
import { POKEMON_TYPES, titleCase, typeVars } from '../lib/pokeapi/client'
import { usePageTitle } from '../lib/usePageTitle'
import { readDefendingTypes, saveDefendingTypes } from '../features/types/matchups'
import { MatchupList } from './MatchupList'

export function TypeChartPage() {
  usePageTitle('Type effectiveness')
  const [defenders, setDefenders] = useState<string[]>(readDefendingTypes)

  useEffect(() => saveDefendingTypes(defenders), [defenders])

  /** Tapping a third type replaces the older pick, so two taps always give a dual type. */
  function toggle(type: string) {
    setDefenders((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current.slice(-1), type],
    )
  }

  return (
    <main className="page">
      <TopBar title="Type effectiveness" back="/tools" />
      <div className="page-body">
        <section className="section section-first" aria-labelledby="defending-heading">
          <h2 className="section-title" id="defending-heading">
            Choose up to two defending types
          </h2>
          <div className="type-picker" role="group" aria-labelledby="defending-heading">
            {POKEMON_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="chip chip-type"
                style={typeVars(type)}
                aria-pressed={defenders.includes(type)}
                onClick={() => toggle(type)}
              >
                {titleCase(type)}
              </button>
            ))}
          </div>
        </section>
        <section className="section" aria-live="polite" aria-labelledby="results-heading">
          <h2 className="section-title" id="results-heading">
            {defenders.length
              ? `Attacks against ${defenders.map(titleCase).join(' / ')}`
              : 'Attacks against'}
          </h2>
          {defenders.length ? (
            <MatchupList types={defenders} />
          ) : (
            <EmptyState title="Pick a type">Tap one or two types above to see matchups.</EmptyState>
          )}
          <p className="note">
            Based on type alone. Abilities, moves and battle rules can change the result.
          </p>
        </section>
      </div>
    </main>
  )
}
