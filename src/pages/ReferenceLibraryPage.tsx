import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Search, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { TopBar } from '../components/common/TopBar'
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PokemonImage,
  PokemonSprite,
  TypeBadge,
} from '../components/ui'
import {
  formatGeneration,
  friendlyError,
  getCompleteResourceIndex,
  getResource,
  POKEMON_TYPES,
  pokemonIdFromUrl,
  resourceKeys,
  titleCase,
  typeVars,
  type NamedResource,
  type ResourceDetail,
  type ResourceKind,
} from '../lib/pokeapi/client'
import { useLoadMoreOnScroll } from '../lib/useLoadMoreOnScroll'
import { usePageTitle } from '../lib/usePageTitle'

const collections: Record<ResourceKind, { title: string; singular: string }> = {
  moves: { title: 'Moves', singular: 'Move' },
  abilities: { title: 'Abilities', singular: 'Ability' },
  items: { title: 'Items', singular: 'Item' },
  types: { title: 'Types', singular: 'Type' },
}

const LIST_BATCH = 40

function isResourceKind(value: string): value is ResourceKind {
  return Object.hasOwn(collections, value)
}

export function ReferenceIndexPage({ kind }: { kind: ResourceKind }) {
  const collection = collections[kind]
  usePageTitle(collection.title)
  const [term, setTerm] = useState('')
  const [limit, setLimit] = useState(LIST_BATCH)
  const query = useQuery({
    queryKey: [...resourceKeys.list(kind), 'search-index'],
    queryFn: ({ signal }) => getCompleteResourceIndex(kind, signal),
    staleTime: 1000 * 60 * 60 * 24,
  })
  const resources = useMemo(() => {
    const normalized = term.trim().toLowerCase().replace(/\s+/g, '-')
    return (query.data?.results ?? []).filter(
      (resource) =>
        (kind !== 'types' ||
          POKEMON_TYPES.includes(resource.name as (typeof POKEMON_TYPES)[number])) &&
        resource.name.includes(normalized),
    )
  }, [kind, query.data, term])
  const shown = resources.slice(0, limit)
  const sentinel = useLoadMoreOnScroll(
    () => setLimit((value) => value + LIST_BATCH),
    resources.length > limit,
    shown.length,
  )

  return (
    <main className="page">
      <TopBar title={collection.title} back="/" search={false} />
      <div className="page-body">
        {kind !== 'types' && (
          <label className="search-field">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              aria-label={`Filter ${collection.title.toLowerCase()}`}
              placeholder={`Filter ${collection.title.toLowerCase()}`}
              value={term}
              onChange={(event) => {
                setTerm(event.target.value)
                setLimit(LIST_BATCH)
              }}
            />
            {term && (
              <button
                type="button"
                className="search-clear"
                aria-label="Clear filter"
                onClick={() => setTerm('')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </label>
        )}
        {query.isLoading && <LoadingState label={`Loading ${collection.title.toLowerCase()}`} />}
        {query.isError && !query.data && (
          <ErrorState
            message={friendlyError(query.error, collection.title)}
            onRetry={() => void query.refetch()}
          />
        )}
        {query.data && (
          <p className="result-summary" aria-live="polite">
            {resources.length.toLocaleString()} {collection.title.toLowerCase()}
          </p>
        )}
        {query.data && resources.length === 0 && (
          <EmptyState title={`No ${collection.title.toLowerCase()} match “${term.trim()}”`} />
        )}
        {kind === 'types' ? (
          <div className="type-tiles">
            {shown.map((resource) => (
              <Link
                key={resource.name}
                className="type-tile"
                to={`/types/${resource.name}`}
                style={typeVars(resource.name)}
              >
                {titleCase(resource.name)}
              </Link>
            ))}
          </div>
        ) : (
          shown.length > 0 && (
            <ul className="list">
              {shown.map((resource) => (
                <li key={resource.name}>
                  <Link className="list-row" to={`/${kind}/${resource.name}`}>
                    <span className="list-text">
                      <strong>{titleCase(resource.name)}</strong>
                    </span>
                    <ChevronRight className="list-chevron" size={18} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}
        <div ref={sentinel} className="scroll-sentinel" aria-hidden="true" />
      </div>
    </main>
  )
}

export function ReferenceDetailPage({ kind }: { kind: ResourceKind }) {
  const { name = '' } = useParams()
  const collection = collections[kind]
  const query = useQuery({
    queryKey: resourceKeys.detail(kind, name),
    queryFn: ({ signal }) => getResource(kind, name, signal),
    enabled: Boolean(name),
    staleTime: 1000 * 60 * 60 * 24,
  })
  const data = query.data
  usePageTitle(data ? titleCase(data.name) : collection.singular)
  if (query.isLoading)
    return (
      <main className="page">
        <TopBar title="" back={`/${kind}`} />
        <LoadingState label={`Loading ${collection.singular.toLowerCase()}`} />
      </main>
    )
  if (!data)
    return (
      <main className="page">
        <TopBar title={collection.singular} back={`/${kind}`} />
        <ErrorState
          message={friendlyError(query.error, `This ${collection.singular.toLowerCase()}`)}
          onRetry={() => void query.refetch()}
        />
      </main>
    )
  return <ReferenceRecord kind={kind} data={data} />
}

const cleanText = (value?: string) =>
  value
    ?.replace(/[\n\f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function ReferenceRecord({ kind, data }: { kind: ResourceKind; data: ResourceDetail }) {
  const heading = titleCase(data.name)
  const effect = data.effect_entries?.find((entry) => entry.language.name === 'en')
  const flavor = cleanText(
    data.flavor_text_entries?.find((entry) => entry.language.name === 'en')?.flavor_text,
  )
  const description =
    cleanText(effect?.short_effect || effect?.effect)?.replaceAll(
      '$effect_chance',
      String(data.effect_chance ?? ''),
    ) || flavor

  return (
    <main className="page">
      <TopBar title={heading} back={`/${kind}`} />
      <div className="page-body">
        {kind === 'moves' && <MoveFigures data={data} />}
        {kind === 'items' && data.sprites?.default && (
          <PokemonImage className="item-art sprite" src={data.sprites.default} alt="" eager />
        )}
        {kind === 'types' && (
          <div className="type-banner hero-plate" style={typeVars(data.name)}>
            <strong>
              {heading}
              <span className="title-dot">.</span>
            </strong>
            <span>
              {(data.pokemon?.length ?? 0).toLocaleString()} Pokémon ·{' '}
              {(data.moves?.length ?? 0).toLocaleString()} moves
            </span>
          </div>
        )}
        {kind === 'types' && <TypeRelations relations={data.damage_relations} />}
        {kind !== 'types' &&
          (description ? (
            <p className="reference-description">{description}</p>
          ) : (
            <p className="note">No English description is listed for this {kind.slice(0, -1)}.</p>
          ))}

        {kind === 'moves' && <MoveFacts data={data} />}
        {kind === 'items' && <ItemFacts data={data} />}
        {kind === 'abilities' && data.generation && (
          <dl className="facts">
            <Fact label="Introduced">{formatGeneration(data.generation.name)}</Fact>
          </dl>
        )}

        {kind === 'moves' && (
          <RelatedPokemon
            title={`Learned by ${data.learned_by_pokemon?.length ?? 0} Pokémon`}
            entries={(data.learned_by_pokemon ?? []).map((pokemon) => ({ pokemon }))}
            note="Open a Pokémon to see how and in which game it learns this move."
          />
        )}
        {kind === 'abilities' && (
          <RelatedPokemon
            title={`Pokémon with ${heading}`}
            entries={(data.pokemon ?? []).map(({ pokemon, is_hidden }) => ({
              pokemon,
              meta: is_hidden ? 'Hidden' : undefined,
            }))}
          />
        )}
        {kind === 'items' && (
          <RelatedPokemon
            title="Held by wild Pokémon"
            entries={(data.held_by_pokemon ?? []).map(({ pokemon, version_details: versions }) => ({
              pokemon,
              meta: versions[0] ? `${versions[0].rarity}%` : undefined,
            }))}
          />
        )}
        {kind === 'types' && (
          <>
            <RelatedPokemon
              title={`${heading} Pokémon`}
              entries={(data.pokemon ?? []).map(({ pokemon }) => ({ pokemon }))}
            />
            <TypeMoves moves={data.moves ?? []} />
          </>
        )}
      </div>
    </main>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function MoveFigures({ data }: { data: ResourceDetail }) {
  const figures: [string, string][] = [
    ['Power', data.power == null ? '—' : String(data.power)],
    ['Accuracy', data.accuracy == null ? '—' : `${data.accuracy}%`],
    ['PP', data.pp == null ? '—' : String(data.pp)],
  ]
  return (
    <div className="move-figures hero-plate" style={typeVars(data.type?.name)}>
      {figures.map(([label, value]) => (
        <div key={label}>
          <b>{value}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}

function MoveFacts({ data }: { data: ResourceDetail }) {
  const machineGames = [
    ...new Set((data.machines ?? []).map(({ version_group }) => titleCase(version_group.name))),
  ]
  return (
    <>
      <dl className="facts">
        {data.type && (
          <Fact label="Type">
            <TypeBadge type={data.type.name} link />
          </Fact>
        )}
        {data.damage_class && <Fact label="Class">{titleCase(data.damage_class.name)}</Fact>}
        {data.priority != null && <Fact label="Priority">{data.priority}</Fact>}
        {data.target && <Fact label="Target">{titleCase(data.target.name)}</Fact>}
        {data.generation && (
          <Fact label="Introduced">{formatGeneration(data.generation.name)}</Fact>
        )}
      </dl>
      {machineGames.length > 0 && (
        <details className="card disclosure">
          <summary>
            Available as a machine <span className="count">{machineGames.length} games</span>
          </summary>
          <p className="note">{machineGames.join(', ')}</p>
        </details>
      )}
    </>
  )
}

function ItemFacts({ data }: { data: ResourceDetail }) {
  return (
    <dl className="facts">
      {data.category && <Fact label="Category">{titleCase(data.category.name)}</Fact>}
      {data.cost ? <Fact label="Cost">{data.cost.toLocaleString()} Pokédollars</Fact> : null}
      {data.fling_power != null && <Fact label="Fling power">{data.fling_power}</Fact>}
      {data.generation && <Fact label="Introduced">{formatGeneration(data.generation.name)}</Fact>}
      {data.attributes?.length ? (
        <Fact label="Attributes">
          {data.attributes.map((attribute) => titleCase(attribute.name)).join(', ')}
        </Fact>
      ) : null}
    </dl>
  )
}

function TypeRelations({ relations }: { relations: ResourceDetail['damage_relations'] }) {
  if (!relations) return null
  const blocks: { title: string; groups: [string, NamedResource[]][] }[] = [
    {
      title: 'When attacking',
      groups: [
        ['2× damage to', relations.double_damage_to],
        ['½ damage to', relations.half_damage_to],
        ['No damage to', relations.no_damage_to],
      ],
    },
    {
      title: 'When defending',
      groups: [
        ['Takes 2× from', relations.double_damage_from],
        ['Takes ½ from', relations.half_damage_from],
        ['Immune to', relations.no_damage_from],
      ],
    },
  ]
  return (
    <>
      {blocks.map(({ title, groups }, blockIndex) => (
        <section
          className={`section ${blockIndex === 0 ? 'section-after-banner' : ''}`}
          key={title}
          aria-label={title}
        >
          <h2 className="section-title">{title}</h2>
          <div className="card matchups">
            {groups.map(([label, entries]) =>
              entries.length ? (
                <div className="matchup-group" key={label}>
                  <h3>{label}</h3>
                  <div className="type-row">
                    {entries.map((entry) => (
                      <TypeBadge key={entry.name} type={entry.name} link />
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </section>
      ))}
    </>
  )
}

function ExpandButton({
  total,
  initial,
  expanded,
  onToggle,
}: {
  total: number
  initial: number
  expanded: boolean
  onToggle: () => void
}) {
  if (total <= initial) return null
  return (
    <button type="button" className="button button-secondary button-block" onClick={onToggle}>
      {expanded ? 'Show fewer' : `Show all ${total}`}
    </button>
  )
}

function RelatedPokemon({
  title,
  entries,
  note,
  initialCount = 24,
}: {
  title: string
  entries: { pokemon: NamedResource; meta?: string }[]
  note?: string
  initialCount?: number
}) {
  const [expanded, setExpanded] = useState(false)
  if (!entries.length) return null
  const visible = expanded ? entries : entries.slice(0, initialCount)
  return (
    <section className="section" aria-label={title}>
      <h2 className="section-title">{title}</h2>
      {note && <p className="note">{note}</p>}
      <ul className="pokemon-tiles">
        {visible.map(({ pokemon, meta }) => (
          <li key={pokemon.name}>
            <Link to={`/pokemon/${pokemon.name}`}>
              <PokemonSprite id={pokemonIdFromUrl(pokemon.url)} />
              <span>{titleCase(pokemon.name)}</span>
              {meta && <small>{meta}</small>}
            </Link>
          </li>
        ))}
      </ul>
      <ExpandButton
        total={entries.length}
        initial={initialCount}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
    </section>
  )
}

function TypeMoves({ moves }: { moves: NamedResource[] }) {
  const [expanded, setExpanded] = useState(false)
  const initial = 12
  if (!moves.length) return null
  return (
    <section className="section" aria-label="Moves of this type">
      <h2 className="section-title">
        Moves <span className="count">{moves.length}</span>
      </h2>
      <ul className="list">
        {(expanded ? moves : moves.slice(0, initial)).map((move) => (
          <li key={move.name}>
            <Link className="list-row" to={`/moves/${move.name}`}>
              <span className="list-text">
                <strong>{titleCase(move.name)}</strong>
              </span>
              <ChevronRight className="list-chevron" size={18} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <ExpandButton
        total={moves.length}
        initial={initial}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />
    </section>
  )
}

export function ReferenceRoute({ kind }: { kind: string }) {
  return isResourceKind(kind) ? <ReferenceIndexPage key={kind} kind={kind} /> : null
}

export function ReferenceDetailRoute({ kind }: { kind: string }) {
  return isResourceKind(kind) ? <ReferenceDetailPage kind={kind} /> : null
}
