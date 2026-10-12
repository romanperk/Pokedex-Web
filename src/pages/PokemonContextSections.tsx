import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui'
import {
  getEvolutionChain,
  getPokemonEncounters,
  getPokemonVersions,
  getPokemonSpecies,
  pokemonKeys,
  titleCase,
  type EvolutionDetail,
  type EvolutionLink,
  type Pokemon,
  type PokemonSpecies,
} from '../lib/pokeapi/client'

export function SpeciesFacts({ species, descriptionVersion }: { species: PokemonSpecies; descriptionVersion?: string }) {
  const genus = species.genera?.find((entry) => entry.language.name === 'en')?.genus
  return <section className="pokemon-reference-section species-facts" aria-labelledby="species-facts-title">
    <span className="content-label">SPECIES REFERENCE</span>
    <h2 id="species-facts-title">Species information</h2>
    <div className="species-facts-grid">
      <SpeciesFact label="Generation" value={species.generation ? titleCase(species.generation.name) : 'Not listed'} />
      <SpeciesFact label="Habitat" value={species.habitat ? titleCase(species.habitat.name) : 'Not listed'} />
      <SpeciesFact label="Category" value={genus ?? 'Not listed'} />
      <SpeciesFact label="Species status" value={species.is_legendary ? 'Legendary' : species.is_mythical ? 'Mythical' : species.is_baby ? 'Baby' : species.is_legendary === false && species.is_mythical === false && species.is_baby === false ? 'Standard' : 'Not listed'} />
    </div>
    {descriptionVersion && <p className="species-description-source">Pokédex text source: {titleCase(descriptionVersion)}. Descriptions can vary between games.</p>}
  </section>
}

function SpeciesFact({ label, value }: { label: string; value: string }) {
  return <div className="species-fact"><span>{label}</span><strong>{value}</strong></div>
}

export function FormsSection({ species, currentName }: { species: PokemonSpecies; currentName: string }) {
  const varieties = species.varieties ?? []
  return <section className="pokemon-reference-section" aria-labelledby="pokemon-forms-title">
    <span className="content-label">SPECIES VARIETIES</span>
    <h2 id="pokemon-forms-title">Forms and varieties</h2>
    <p>The artwork and stats above belong to {titleCase(currentName)}. Each listed variety opens its own Pokémon record when PokéAPI provides one.</p>
    {varieties.length ? <ul className="pokemon-variety-list">{varieties.map(({ pokemon, is_default }) => <li key={pokemon.name}>{pokemon.name === currentName ? <span className="variety-current" aria-current="page">{titleCase(pokemon.name)} <small>Current</small></span> : <Link to={`/pokemon/${pokemon.name}`}>{titleCase(pokemon.name)}</Link>}{is_default && <small>Species default</small>}</li>)}</ul> : <p className="muted">No variety list is available for this species.</p>}
  </section>
}

export function EvolutionSection({ species }: { species: PokemonSpecies }) {
  const url = species.evolution_chain?.url ?? ''
  const query = useQuery({ queryKey: pokemonKeys.evolution(url), queryFn: ({ signal }) => getEvolutionChain(url, signal), enabled: Boolean(url), staleTime: 1000 * 60 * 60 * 24 })
  return <section className="pokemon-reference-section" aria-labelledby="evolution-title">
    <span className="content-label">SPECIES FAMILY</span>
    <h2 id="evolution-title">Evolution</h2>
    {!url && <p className="muted">PokéAPI does not list an evolution chain for this species.</p>}
    {url && query.isLoading && <p className="muted" role="status">Loading evolution chain…</p>}
    {url && query.isError && <div className="context-error" role="alert"><span>The evolution chain could not be loaded.</span><Button onClick={() => void query.refetch()}>Retry</Button></div>}
    {query.data && <><p className="muted">Evolution conditions can vary by game. PokéAPI may omit special-case details.</p><ul className="evolution-tree"><EvolutionNode node={query.data.chain} /></ul></>}
  </section>
}

function EvolutionNode({ node }: { node: EvolutionLink }) {
  const species = useQuery({
    queryKey: pokemonKeys.species(node.species.name),
    queryFn: ({ signal }) => getPokemonSpecies(node.species.name, signal),
    staleTime: 1000 * 60 * 60 * 24,
  })
  const defaultPokemon = species.data?.varieties?.find((variety) => variety.is_default)?.pokemon.name
  return <li className="evolution-node">
    <Link to={`/pokemon/${defaultPokemon ?? node.species.name}`}>{titleCase(node.species.name)}</Link>
    {node.evolves_to.length > 0 && <ul>{node.evolves_to.map((next) => <li className="evolution-step" key={next.species.name}><span className="evolution-conditions">{formatEvolutionConditions(next.evolution_details)}</span><ul><EvolutionNode node={next} /></ul></li>)}</ul>}
  </li>
}

function formatEvolutionConditions(details: EvolutionDetail[] | null) {
  if (!details?.length) return 'Evolution conditions not specified'
  return details.map((detail) => {
    const conditions = [titleCase(detail.trigger.name)]
    if (detail.min_level != null) conditions.push(`Level ${detail.min_level} or higher`)
    if (detail.item) conditions.push(`Use ${titleCase(detail.item.name)}`)
    if (detail.held_item) conditions.push(`While holding ${titleCase(detail.held_item.name)}`)
    if (detail.min_happiness != null) conditions.push(`Friendship ${detail.min_happiness}+`)
    if (detail.min_beauty != null) conditions.push(`Beauty ${detail.min_beauty}+`)
    if (detail.min_affection != null) conditions.push(`Affection ${detail.min_affection}+`)
    if (detail.known_move) conditions.push(`Knows ${titleCase(detail.known_move.name)}`)
    if (detail.known_move_type) conditions.push(`Knows a ${titleCase(detail.known_move_type.name)} move`)
    if (detail.location) conditions.push(`At ${titleCase(detail.location.name)}`)
    if (detail.party_species) conditions.push(`With ${titleCase(detail.party_species.name)} in party`)
    if (detail.party_type) conditions.push(`With a ${titleCase(detail.party_type.name)} type in party`)
    if (detail.trade_species) conditions.push(`Trade for ${titleCase(detail.trade_species.name)}`)
    if (detail.relative_physical_stats != null) conditions.push(detail.relative_physical_stats > 0 ? 'Attack higher than Defense' : detail.relative_physical_stats < 0 ? 'Defense higher than Attack' : 'Attack equals Defense')
    if (detail.gender != null) conditions.push(detail.gender === 1 ? 'Female' : detail.gender === 2 ? 'Male' : `Gender ${detail.gender}`)
    if (detail.time_of_day) conditions.push(`During ${detail.time_of_day}`)
    if (detail.needs_overworld_rain) conditions.push('While it is raining')
    if (detail.turn_upside_down) conditions.push('Turn the device upside down')
    if (detail.version_group) conditions.push(titleCase(detail.version_group.name))
    return conditions.join(' · ')
  }).join(' OR ')
}

type PokemonMove = NonNullable<Pokemon['moves']>[number]

export function LearnsetBrowser({ moves }: { moves: PokemonMove[] }) {
  const versionGroups = useMemo(() => [...new Map(moves.flatMap(({ version_group_details }) => version_group_details.map((detail) => [detail.version_group.name, detail.version_group] as const))).values()], [moves])
  const [selectedGroup, setSelectedGroup] = useState('')
  const methods = useMemo(() => {
    const grouped = new Map<string, { label: string; moves: { name: string; level: number }[] }>()
    for (const { move, version_group_details } of moves) {
      for (const detail of version_group_details.filter((entry) => entry.version_group.name === selectedGroup)) {
        const key = detail.move_learn_method.name
        const group = grouped.get(key) ?? { label: titleCase(key), moves: [] }
        group.moves.push({ name: move.name, level: detail.level_learned_at })
        grouped.set(key, group)
      }
    }
    return [...grouped.values()]
  }, [moves, selectedGroup])
  return <section className="pokemon-reference-section" aria-labelledby="learnset-title">
    <span className="content-label">GAME-SPECIFIC DATA</span>
    <h2 id="learnset-title">Learnset</h2>
    <p>Choose a version group. PokéAPI coverage varies; a missing move entry does not prove that a move cannot be learned in every game.</p>
    {!versionGroups.length ? <p className="muted">No version-group learn data is available for this Pokémon.</p> : <>
      <label className="context-select-label" htmlFor="learnset-version-group">Version group</label>
      <select className="context-select" id="learnset-version-group" value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)}><option value="">Choose a version group</option>{versionGroups.map((group) => <option key={group.name} value={group.name}>{titleCase(group.name)}</option>)}</select>
      {selectedGroup && <div className="learnset-method-groups" aria-live="polite">{methods.length ? methods.map((method) => <section key={method.label}><h3>{method.label} <span>{method.moves.length}</span></h3><ul>{method.moves.map((move) => <li key={move.name}><Link to={`/moves/${move.name}`}>{titleCase(move.name)}</Link>{method.label === 'Level Up' && <span>Level {move.level}</span>}</li>)}</ul></section>) : <p className="muted">No learn methods are listed for this version group.</p>}</div>}
    </>}
  </section>
}

export function EncounterBrowser({ pokemonId, pokemonName, endpointAvailable }: { pokemonId: number; pokemonName: string; endpointAvailable: boolean }) {
  const [selectedVersion, setSelectedVersion] = useState('')
  const versions = useQuery({ queryKey: pokemonKeys.versions, queryFn: ({ signal }) => getPokemonVersions(signal), staleTime: 1000 * 60 * 60 * 24 })
  const encounters = useQuery({ queryKey: pokemonKeys.encounters(pokemonId), queryFn: ({ signal }) => getPokemonEncounters(pokemonId, signal), enabled: Boolean(selectedVersion && endpointAvailable), staleTime: 1000 * 60 * 60 * 24 })
  const locations = (encounters.data ?? []).flatMap((location) => {
    const matches = location.version_details.filter((detail) => detail.version.name === selectedVersion)
    return matches.length ? [{ location: location.location_area, details: matches.flatMap((detail) => detail.encounter_details) }] : []
  })
  return <section className="pokemon-reference-section" aria-labelledby="encounters-title">
    <span className="content-label">GAME-SPECIFIC DATA</span>
    <h2 id="encounters-title">Encounter locations</h2>
    <p>Choose an exact game version. PokéAPI encounter coverage is incomplete for some games; no listed encounter does not prove unobtainability.</p>
    {!endpointAvailable && <p className="muted">This Pokémon record does not include an encounter endpoint.</p>}
    {endpointAvailable && versions.isLoading && <p className="muted" role="status">Loading game versions…</p>}
    {endpointAvailable && versions.isError && <div className="context-error" role="alert"><span>Game versions could not be loaded.</span><Button onClick={() => void versions.refetch()}>Retry</Button></div>}
    {endpointAvailable && versions.data && <>
      <label className="context-select-label" htmlFor={`encounter-version-${pokemonId}`}>Game version</label>
      <select className="context-select" id={`encounter-version-${pokemonId}`} value={selectedVersion} onChange={(event) => setSelectedVersion(event.target.value)}><option value="">Choose a game version</option>{versions.data.results.map((version) => <option key={version.name} value={version.name}>{titleCase(version.name)}</option>)}</select>
      {!selectedVersion && <p className="muted">Select a version to load {titleCase(pokemonName)} encounter records.</p>}
      {selectedVersion && encounters.isLoading && <p className="muted" role="status">Loading encounter records…</p>}
      {selectedVersion && encounters.isError && <div className="context-error" role="alert"><span>Encounter data could not be loaded.</span><Button onClick={() => void encounters.refetch()}>Retry</Button></div>}
      {selectedVersion && encounters.data && (locations.length ? <div className="encounter-location-list" aria-live="polite">{locations.map(({ location, details }) => <section key={location.name}><h3>{titleCase(location.name)}</h3>{details.map((detail, index) => <p key={`${detail.method.name}-${index}`}><strong>{titleCase(detail.method.name)}</strong><span>Level {detail.min_level}{detail.max_level !== detail.min_level ? `–${detail.max_level}` : ''}</span><span>{detail.chance}% listed chance</span>{detail.condition_values.length > 0 && <small>{detail.condition_values.map((condition) => titleCase(condition.name)).join(', ')}</small>}</p>)}</section>)}</div> : <p className="muted" role="status">PokéAPI lists no encounter locations for {titleCase(pokemonName)} in {titleCase(selectedVersion)}. This is not proof that it cannot be obtained in that game.</p>)}
    </>}
  </section>
}
