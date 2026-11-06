import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState, PokemonSprite } from '../components/ui'
import {
  getEvolutionChain,
  getPokemonEncounters,
  pokemonIdFromUrl,
  pokemonKeys,
  titleCase,
  type EvolutionDetail,
  type EvolutionLink,
  type Pokemon,
  type PokemonEncounter,
  type PokemonSpecies,
} from '../lib/pokeapi/client'

export function AbilitiesSection({ abilities }: { abilities: Pokemon['abilities'] }) {
  return (
    <section className="section" aria-labelledby="abilities-heading">
      <h2 className="section-title" id="abilities-heading">
        Abilities
      </h2>
      <ul className="list">
        {abilities.map(({ ability, is_hidden }) => (
          <li key={ability.name}>
            <Link className="list-row" to={`/abilities/${ability.name}`}>
              <span className="list-text">
                <strong>{titleCase(ability.name)}</strong>
                {is_hidden && <small>Hidden ability</small>}
              </span>
              <ChevronRight className="list-chevron" size={18} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function FormsSection({
  species,
  currentName,
}: {
  species: PokemonSpecies
  currentName: string
}) {
  const varieties = species.varieties ?? []
  if (varieties.length < 2) return null
  return (
    <section className="section" aria-labelledby="forms-heading">
      <h2 className="section-title" id="forms-heading">
        Forms
      </h2>
      <ul className="list">
        {varieties.map(({ pokemon }) => {
          const current = pokemon.name === currentName
          const content = (
            <>
              <PokemonSprite id={pokemonIdFromUrl(pokemon.url)} className="list-sprite" />
              <span className="list-text">
                <strong>{titleCase(pokemon.name)}</strong>
                {current && <small>Viewing now</small>}
              </span>
            </>
          )
          return (
            <li key={pokemon.name}>
              {current ? (
                <div className="list-row" aria-current="page">
                  {content}
                </div>
              ) : (
                <Link className="list-row" to={`/pokemon/${pokemon.name}`} replace>
                  {content}
                  <ChevronRight className="list-chevron" size={18} aria-hidden="true" />
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function EvolutionSection({ species }: { species: PokemonSpecies }) {
  const url = species.evolution_chain?.url ?? ''
  const query = useQuery({
    queryKey: pokemonKeys.evolution(url),
    queryFn: ({ signal }) => getEvolutionChain(url, signal),
    enabled: Boolean(url),
    staleTime: 1000 * 60 * 60 * 24,
  })
  if (!url) return null
  // A lone stage has nothing to show, so the section stays out of the way.
  if (query.data && !query.data.chain.evolves_to.length) return null
  return (
    <section className="section" aria-labelledby="evolution-heading">
      <h2 className="section-title" id="evolution-heading">
        Evolution
      </h2>
      {query.isLoading && <LoadingState label="Loading evolution" />}
      {query.isError && (
        <ErrorState message="Evolution could not load." onRetry={() => void query.refetch()} />
      )}
      {query.data && (
        <div className="card evolution">
          <EvolutionNode node={query.data.chain} />
        </div>
      )}
    </section>
  )
}

function EvolutionNode({ node }: { node: EvolutionLink }) {
  // Linking by number reaches the default form even when its name differs from the species.
  const id = pokemonIdFromUrl(node.species.url)
  return (
    <>
      <Link className="evolution-stage" to={`/pokemon/${id}`}>
        <PokemonSprite id={id} className="list-sprite" />
        <strong>{titleCase(node.species.name)}</strong>
      </Link>
      {node.evolves_to.length > 0 && (
        <ul className="evolution-next">
          {node.evolves_to.map((next) => (
            <li key={next.species.name}>
              <p className="evolution-condition">{describeEvolution(next.evolution_details)}</p>
              <EvolutionNode node={next} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function describeEvolution(details: EvolutionDetail[] | null) {
  if (!details?.length) return 'Conditions not listed'
  const options = details.map((detail) => {
    const parts: string[] = []
    const name = (value?: { name: string } | null) => (value ? titleCase(value.name) : '')
    if (detail.min_level != null) parts.push(`Level ${detail.min_level}`)
    if (detail.item) parts.push(`Use ${name(detail.item)}`)
    if (detail.trigger.name === 'trade') parts.push('Trade')
    if (detail.held_item) parts.push(`holding ${name(detail.held_item)}`)
    if (detail.min_happiness != null) parts.push(`friendship ${detail.min_happiness}+`)
    if (detail.min_beauty != null) parts.push(`beauty ${detail.min_beauty}+`)
    if (detail.min_affection != null) parts.push(`affection ${detail.min_affection}+`)
    if (detail.known_move) parts.push(`knows ${name(detail.known_move)}`)
    if (detail.known_move_type) parts.push(`knows a ${name(detail.known_move_type)} move`)
    if (detail.location) parts.push(`at ${name(detail.location)}`)
    if (detail.party_species) parts.push(`with ${name(detail.party_species)} in party`)
    if (detail.party_type) parts.push(`with a ${name(detail.party_type)} type in party`)
    if (detail.trade_species) parts.push(`for ${name(detail.trade_species)}`)
    if (detail.relative_physical_stats != null)
      parts.push(
        detail.relative_physical_stats > 0
          ? 'Attack above Defense'
          : detail.relative_physical_stats < 0
            ? 'Defense above Attack'
            : 'Attack equals Defense',
      )
    if (detail.gender === 1) parts.push('female')
    if (detail.gender === 2) parts.push('male')
    if (detail.time_of_day) parts.push(`at ${detail.time_of_day}`)
    if (detail.needs_overworld_rain) parts.push('while raining')
    if (detail.turn_upside_down) parts.push('device upside down')
    if (!parts.length || (parts.length && !/^[A-Z]/.test(parts[0])))
      parts.unshift(detail.trigger.name === 'level-up' ? 'Level up' : name(detail.trigger))
    return parts.join(', ')
  })
  return [...new Set(options)].join(' or ')
}

type PokemonMove = NonNullable<Pokemon['moves']>[number]

export function LearnsetSection({ moves }: { moves: PokemonMove[] }) {
  // Newest games first: version group urls end in an increasing id.
  const versionGroups = useMemo(
    () =>
      [
        ...new Map(
          moves.flatMap(({ version_group_details }) =>
            version_group_details.map(
              ({ version_group }) => [version_group.name, version_group] as const,
            ),
          ),
        ).values(),
      ].sort((a, b) => pokemonIdFromUrl(b.url) - pokemonIdFromUrl(a.url)),
    [moves],
  )
  const [selectedGroup, setSelectedGroup] = useState('')
  // Open on the newest main game with a real level-up list; some recent entries only list
  // training moves, and the Japanese Red, Green and Blue groups have the highest ids.
  const defaultGroup = useMemo(() => {
    const leveled = new Set(
      moves.flatMap(({ version_group_details }) =>
        version_group_details
          .filter((detail) => detail.move_learn_method.name === 'level-up')
          .map((detail) => detail.version_group.name),
      ),
    )
    return (
      versionGroups.find((version) => leveled.has(version.name) && !version.name.endsWith('-japan'))
        ?.name ?? versionGroups[0]?.name
    )
  }, [moves, versionGroups])
  const group = selectedGroup || defaultGroup
  const methods = useMemo(() => {
    const grouped = new Map<string, { name: string; level: number }[]>()
    for (const { move, version_group_details } of moves) {
      for (const detail of version_group_details) {
        if (detail.version_group.name !== group) continue
        const method = detail.move_learn_method.name
        grouped.set(method, [
          ...(grouped.get(method) ?? []),
          { name: move.name, level: detail.level_learned_at },
        ])
      }
    }
    const order = ['level-up', 'machine', 'egg', 'tutor']
    return [...grouped.entries()]
      .map(([method, list]) => ({
        method,
        moves:
          method === 'level-up'
            ? list.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
            : list.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => {
        const rank = (value: string) => order.indexOf(value) + 1 || order.length + 1
        return rank(a.method) - rank(b.method)
      })
  }, [moves, group])

  if (!versionGroups.length) return <EmptyState title="No move data for this Pokémon" />
  return (
    <section className="section" aria-label="Moves">
      <label className="field">
        <span>Game</span>
        <select value={group} onChange={(event) => setSelectedGroup(event.target.value)}>
          {versionGroups.map((version) => (
            <option key={version.name} value={version.name}>
              {titleCase(version.name)}
            </option>
          ))}
        </select>
      </label>
      {methods.map(({ method, moves: list }, index) => (
        <details className="card disclosure move-group" key={method} open={index === 0}>
          <summary>
            {method === 'level-up' ? 'Level up' : titleCase(method)}
            <span className="count">{list.length}</span>
          </summary>
          <ul className="move-list">
            {list.map((move) => (
              <li key={`${move.name}-${move.level}`}>
                <Link to={`/moves/${move.name}`}>
                  {method === 'level-up' && (
                    <span className="move-level">{move.level > 0 ? `Lv ${move.level}` : '—'}</span>
                  )}
                  <span>{titleCase(move.name)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  )
}

const areaName = (location: PokemonEncounter['location_area']) =>
  titleCase(location.name.replace(/-area$/, ''))

export function EncounterSection({ pokemonId, label }: { pokemonId: number; label: string }) {
  const [selected, setSelected] = useState('')
  const query = useQuery({
    queryKey: pokemonKeys.encounters(pokemonId),
    queryFn: ({ signal }) => getPokemonEncounters(pokemonId, signal),
    staleTime: 1000 * 60 * 60 * 24,
  })
  const versions = useMemo(
    () => [
      ...new Set(
        (query.data ?? []).flatMap((location) =>
          location.version_details.map((detail) => detail.version.name),
        ),
      ),
    ],
    [query.data],
  )
  const version = versions.includes(selected) ? selected : ''
  const locations = (query.data ?? []).flatMap((location) => {
    const matches = location.version_details.filter(
      (detail) => !version || detail.version.name === version,
    )
    return matches.length ? [{ location: location.location_area, matches }] : []
  })
  return (
    <section className="section" aria-labelledby="where-heading">
      <h2 className="section-title" id="where-heading">
        Where to find
      </h2>
      {query.isLoading && <LoadingState label="Loading locations" />}
      {query.isError && (
        <ErrorState message="Locations could not load." onRetry={() => void query.refetch()} />
      )}
      {query.data && !versions.length && (
        <p className="note">
          PokéAPI lists no wild locations for {label}. It may still be available as a gift,
          evolution or event, because coverage is incomplete for some games.
        </p>
      )}
      {versions.length > 0 && (
        <>
          <label className="field">
            <span>Game</span>
            <select value={version} onChange={(event) => setSelected(event.target.value)}>
              <option value="">All games</option>
              {versions.map((name) => (
                <option key={name} value={name}>
                  {titleCase(name)}
                </option>
              ))}
            </select>
          </label>
          <ul className="list">
            {locations.map(({ location, matches }) => {
              const details = matches.flatMap((match) => match.encounter_details)
              const min = Math.min(...details.map((detail) => detail.min_level))
              const max = Math.max(...details.map((detail) => detail.max_level))
              const methods = [...new Set(details.map((detail) => titleCase(detail.method.name)))]
              const games = matches.map((match) => titleCase(match.version.name))
              return (
                <li key={location.name}>
                  <div className="list-row">
                    <span className="list-text">
                      <strong>{areaName(location)}</strong>
                      <small>
                        {min === max ? `Level ${min}` : `Levels ${min}–${max}`} ·{' '}
                        {methods.join(', ')}
                      </small>
                      {!version && <small>{games.join(', ')}</small>}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}

export function HeldItemsSection({ items }: { items: NonNullable<Pokemon['held_items']> }) {
  if (!items.length) return null
  return (
    <section className="section" aria-labelledby="held-heading">
      <h2 className="section-title" id="held-heading">
        Held in the wild
      </h2>
      <ul className="list">
        {items.map(({ item, version_details: versions }) => {
          const rarities = versions.map((entry) => entry.rarity)
          const low = Math.min(...rarities)
          const high = Math.max(...rarities)
          return (
            <li key={item.name}>
              <Link className="list-row" to={`/items/${item.name}`}>
                <span className="list-text">
                  <strong>{titleCase(item.name)}</strong>
                  {rarities.length > 0 && (
                    <small>
                      {low === high ? `${low}%` : `${low}–${high}%`} chance, varies by game
                    </small>
                  )}
                </span>
                <ChevronRight className="list-chevron" size={18} aria-hidden="true" />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
