export type NamedResource = { name: string; url: string }
export type Pokemon = {
  id: number
  name: string
  height: number
  weight: number
  base_experience: number | null
  types: { slot: number; type: NamedResource }[]
  stats: { base_stat: number; stat: NamedResource }[]
  abilities: { is_hidden: boolean; ability: NamedResource }[]
  moves?: {
    move: NamedResource
    version_group_details: {
      level_learned_at: number
      version_group: NamedResource
      move_learn_method: NamedResource
    }[]
  }[]
  held_items?: {
    item: NamedResource
    version_details: { rarity: number; version: NamedResource }[]
  }[]
  species?: NamedResource
  forms?: NamedResource[]
  location_area_encounters?: string
  sprites: {
    front_default: string | null
    other?: { 'official-artwork'?: { front_default: string | null } }
  }
}
export type PokemonSpecies = {
  flavor_text_entries: {
    flavor_text: string
    language: NamedResource
    version_group?: NamedResource
  }[]
  generation?: NamedResource
  habitat?: NamedResource | null
  genera?: { genus: string; language: NamedResource }[]
  evolution_chain?: { url: string }
  varieties?: { is_default: boolean; pokemon: NamedResource }[]
  pokedex_numbers?: { entry_number: number; pokedex: NamedResource }[]
  is_legendary?: boolean
  is_mythical?: boolean
  is_baby?: boolean
}
export type EvolutionDetail = {
  trigger: NamedResource
  item?: NamedResource | null
  held_item?: NamedResource | null
  known_move?: NamedResource | null
  known_move_type?: NamedResource | null
  location?: NamedResource | null
  min_level?: number | null
  min_happiness?: number | null
  min_beauty?: number | null
  min_affection?: number | null
  needs_overworld_rain?: boolean
  party_species?: NamedResource | null
  party_type?: NamedResource | null
  relative_physical_stats?: number | null
  time_of_day?: string
  trade_species?: NamedResource | null
  turn_upside_down?: boolean
  gender?: number | null
  version_group?: NamedResource | null
}
export type EvolutionLink = {
  species: NamedResource
  is_baby: boolean
  evolution_details: EvolutionDetail[] | null
  evolves_to: EvolutionLink[]
}
export type EvolutionChain = { id: number; chain: EvolutionLink }
export type PokemonVersionList = { results: NamedResource[] }
export type PokemonEncounter = {
  location_area: NamedResource
  version_details: {
    version: NamedResource
    max_chance: number
    encounter_details: {
      min_level: number
      max_level: number
      chance: number
      method: NamedResource
      condition_values: NamedResource[]
    }[]
  }[]
}
export type PokemonList = { count: number; next: string | null; results: NamedResource[] }
export type PokemonTypeList = {
  pokemon: { pokemon: NamedResource }[]
  damage_relations: {
    double_damage_to: NamedResource[]
    half_damage_to: NamedResource[]
    no_damage_to: NamedResource[]
    double_damage_from: NamedResource[]
    half_damage_from: NamedResource[]
    no_damage_from: NamedResource[]
  }
}

export type ResourceKind = 'moves' | 'abilities' | 'items' | 'types'
export type ResourceIndex = { count: number; next: string | null; results: NamedResource[] }
export type ResourceDetail = {
  id: number
  name: string
  effect_chance?: number | null
  effect_entries?: { effect: string; short_effect: string; language: NamedResource }[]
  flavor_text_entries?: {
    flavor_text: string
    language: NamedResource
    version_group?: NamedResource
  }[]
  effect_changes?: {
    effect_entries: { effect: string; language: NamedResource }[]
    version_group: NamedResource
  }[]
  attributes?: NamedResource[]
  category?: NamedResource
  cost?: number
  fling_power?: number | null
  generation?: NamedResource
  type?: NamedResource
  damage_class?: NamedResource
  accuracy?: number | null
  power?: number | null
  pp?: number | null
  priority?: number
  target?: NamedResource
  learned_by_pokemon?: NamedResource[]
  machines?: { machine: NamedResource; version_group: NamedResource }[]
  held_by_pokemon?: {
    pokemon: NamedResource
    version_details: { rarity: number; version: NamedResource }[]
  }[]
  pokemon?: { pokemon: NamedResource; is_hidden?: boolean; slot?: number }[]
  moves?: NamedResource[]
  damage_relations?: {
    double_damage_to: NamedResource[]
    half_damage_to: NamedResource[]
    no_damage_to: NamedResource[]
    double_damage_from: NamedResource[]
    half_damage_from: NamedResource[]
    no_damage_from: NamedResource[]
  }
}

const API = 'https://pokeapi.co/api/v2'

export class PokeApiError extends Error {
  readonly status: number
  readonly url: string

  constructor(message: string, status: number, url: string) {
    super(message)
    this.name = 'PokeApiError'
    this.status = status
    this.url = url
  }
}

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    const label =
      response.status === 404
        ? 'Requested record not found.'
        : `PokéAPI request failed (${response.status}).`
    throw new PokeApiError(label, response.status, url)
  }
  return response.json() as Promise<T>
}

export const getPokemonPage = (offset: number, limit = 20, signal?: AbortSignal) =>
  fetchJson<PokemonList>(`${API}/pokemon?limit=${limit}&offset=${offset}`, signal)

export const getPokemon = (nameOrId: string | number, signal?: AbortSignal) =>
  fetchJson<Pokemon>(`${API}/pokemon/${encodeURIComponent(String(nameOrId).toLowerCase())}`, signal)

export const getPokemonSpecies = (nameOrId: string | number, signal?: AbortSignal) =>
  fetchJson<PokemonSpecies>(
    `${API}/pokemon-species/${encodeURIComponent(String(nameOrId).toLowerCase())}`,
    signal,
  )

export const getEvolutionChain = (url: string, signal?: AbortSignal) =>
  fetchJson<EvolutionChain>(url, signal)

export const getPokemonEncounters = (nameOrId: string | number, signal?: AbortSignal) =>
  fetchJson<PokemonEncounter[]>(
    `${API}/pokemon/${encodeURIComponent(String(nameOrId).toLowerCase())}/encounters`,
    signal,
  )

export const getPokemonVersions = (signal?: AbortSignal) =>
  fetchJson<PokemonVersionList>(`${API}/version?limit=1000`, signal)

export const getPokemonType = (type: string, signal?: AbortSignal) =>
  fetchJson<PokemonTypeList>(`${API}/type/${encodeURIComponent(type)}`, signal)

const RESOURCE_PATHS: Record<ResourceKind, string> = {
  moves: 'move',
  abilities: 'ability',
  items: 'item',
  types: 'type',
}

export const getResourcePage = (
  kind: ResourceKind,
  offset: number,
  limit = 24,
  signal?: AbortSignal,
) =>
  fetchJson<ResourceIndex>(`${API}/${RESOURCE_PATHS[kind]}?limit=${limit}&offset=${offset}`, signal)

export const getResource = (kind: ResourceKind, name: string, signal?: AbortSignal) =>
  fetchJson<ResourceDetail>(
    `${API}/${RESOURCE_PATHS[kind]}/${encodeURIComponent(name.toLowerCase())}`,
    signal,
  )

export async function getCompleteResourceIndex(kind: ResourceKind, signal?: AbortSignal) {
  const pageSize = 1000
  const firstPage = await getResourcePage(kind, 0, pageSize, signal)
  const results = [...firstPage.results]
  let next = firstPage.next
  while (next) {
    const offset = Number(new URL(next).searchParams.get('offset') ?? results.length)
    const page = await getResourcePage(kind, offset, pageSize, signal)
    results.push(...page.results)
    next = page.next
  }
  return { count: firstPage.count, results }
}

export const resourceKeys = {
  list: (kind: ResourceKind) => ['reference', kind] as const,
  detail: (kind: ResourceKind, name: string) => ['reference', kind, name.toLowerCase()] as const,
}

export const pokemonIdFromUrl = (url: string) => {
  const parts = url.replace(/\/$/, '').split('/')
  const id = Number(parts.at(-1))
  return Number.isFinite(id) ? id : Number.MAX_SAFE_INTEGER
}

export const pokemonKeys = {
  lists: ['pokemon', 'list'] as const,
  directory: ['pokemon', 'directory'] as const,
  count: ['pokemon', 'count'] as const,
  encounters: (nameOrId: string | number) =>
    ['pokemon', 'encounters', String(nameOrId).toLowerCase()] as const,
  versions: ['pokemon', 'versions'] as const,
  evolution: (url: string) => ['pokemon', 'evolution', url] as const,
  list: (types: string[]) => ['pokemon', 'list', [...types].sort()] as const,
  detail: (nameOrId: string | number) =>
    ['pokemon', 'detail', String(nameOrId).toLowerCase()] as const,
  species: (nameOrId: string | number) =>
    ['pokemon', 'species', String(nameOrId).toLowerCase()] as const,
  type: (type: string) => ['pokemon', 'type', type] as const,
  search: (term: string) => ['pokemon', 'search', term.toLowerCase()] as const,
}

export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const

export const TYPE_COLORS: Record<string, string> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
}

export const titleCase = (value: string) =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
export const formatGeneration = (generation: string) => {
  const match = /^generation-([ivxlcdm]+)$/i.exec(generation)
  return match ? `Generation ${match[1].toUpperCase()}` : titleCase(generation)
}
export const pokemonSprite = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
export const pokemonArtwork = (pokemon: Pokemon) =>
  pokemon.sprites.other?.['official-artwork']?.front_default || pokemonSprite(pokemon.id)
export const paddedId = (id: number) => `#${String(id).padStart(3, '0')}`

export function getEnglishFlavorText(species?: PokemonSpecies) {
  const description = getEnglishFlavorEntry(species)
    ?.flavor_text.replace(/[\n\f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return description || 'Description not available.'
}

export function getEnglishFlavorEntry(species?: PokemonSpecies) {
  return species?.flavor_text_entries.find((entry) => entry.language.name === 'en')
}
