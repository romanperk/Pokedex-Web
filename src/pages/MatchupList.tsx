import { ErrorState, LoadingState, TypeBadge } from '../components/ui'
import { MATCHUP_GROUPS, useTypeMatchups } from '../features/types/matchups'

/** Damage taken by a Pokémon with these defending types, grouped by multiplier. */
export function MatchupList({ types }: { types: string[] }) {
  const { ready, byMultiplier, loading, failed, retry } = useTypeMatchups(types)
  if (failed) return <ErrorState message="Type matchups could not load." onRetry={retry} />
  if (loading || !ready) return <LoadingState label="Loading matchups" />
  const neutral = byMultiplier.get(1) ?? []
  return (
    <div className="card matchups">
      {MATCHUP_GROUPS.map(({ multiplier, label }) => {
        const attackers = byMultiplier.get(multiplier)
        if (!attackers?.length) return null
        return (
          <div className="matchup-group" key={multiplier}>
            <h3>{label}</h3>
            <div className="type-row">
              {attackers.map((type) => (
                <TypeBadge key={type} type={type} link />
              ))}
            </div>
          </div>
        )
      })}
      {neutral.length > 0 && (
        <details className="disclosure">
          <summary>Normal damage from {neutral.length} types</summary>
          <div className="type-row">
            {neutral.map((type) => (
              <TypeBadge key={type} type={type} link />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
