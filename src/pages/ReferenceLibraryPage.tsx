import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../components/ui'
import {
  getResource,
  getResourcePage,
  formatGeneration,
  POKEMON_TYPES,
  pokemonIdFromUrl,
  resourceKeys,
  titleCase,
  TYPE_COLORS,
  type NamedResource,
  type ResourceDetail,
  type ResourceKind,
} from '../lib/pokeapi/client'

const collections: Record<ResourceKind, { title: string; singular: string; description: string }> =
  {
    moves: {
      title: 'Moves',
      singular: 'Move',
      description: 'Battle moves, effects, and the Pokémon that can learn them.',
    },
    abilities: {
      title: 'Abilities',
      singular: 'Ability',
      description: 'Abilities, their effects, and the Pokémon that have them.',
    },
    items: {
      title: 'Items',
      singular: 'Item',
      description: 'Items found across the Pokémon games and the Pokémon that may hold them.',
    },
    types: {
      title: 'Types',
      singular: 'Type',
      description: 'Type matchups, related moves, and Pokémon of each type.',
    },
  }

function isResourceKind(value: string): value is ResourceKind {
  return Object.hasOwn(collections, value)
}

function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | Pokédex`
    return () => {
      document.title = 'Pokédex — Discover Pokémon'
    }
  }, [title])
}

export function ReferenceIndexPage({ kind }: { kind: ResourceKind }) {
  const collection = collections[kind]
  usePageTitle(`${collection.title} reference`)
  const query = useInfiniteQuery({
    queryKey: resourceKeys.list(kind),
    queryFn: ({ pageParam, signal }) => getResourcePage(kind, pageParam, 24, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined
      return Number(new URL(lastPage.next).searchParams.get('offset') ?? 0)
    },
  })
  const resources = (query.data?.pages.flatMap((page) => page.results) ?? []).filter(
    (resource) =>
      kind !== 'types' || POKEMON_TYPES.includes(resource.name as (typeof POKEMON_TYPES)[number]),
  )
  const total = kind === 'types' ? POKEMON_TYPES.length : query.data?.pages[0]?.count

  return (
    <main className="page-width reference-page">
      <div className="crumb">
        <Link to="/">Discover</Link>
        <span>/</span>
        <b>{collection.title}</b>
      </div>
      <header className="utility-heading">
        <div className="eyebrow">DISCOVER / REFERENCE</div>
        <h1>
          {collection.title}
          <span>.</span>
        </h1>
        <p>{collection.description}</p>
      </header>
      <div className="reference-count" aria-live="polite">
        {total == null
          ? 'Loading collection…'
          : `${resources.length} of ${total} ${collection.title.toLowerCase()}`}
      </div>
      {query.isError && !query.data && (
        <div className="error-box" role="alert">
          {collection.title} could not be loaded. Check your connection and retry.
          <button onClick={() => void query.refetch()}>Retry</button>
        </div>
      )}
      {query.isError && query.data && (
        <div className="error-box" role="alert">
          More {collection.title.toLowerCase()} could not be loaded.
          <button onClick={() => void query.fetchNextPage()}>Retry</button>
        </div>
      )}
      {query.isLoading && (
        <div className="loading-state" role="status">
          <span className="loader" />
          Loading {collection.title.toLowerCase()}…
        </div>
      )}
      {!query.isLoading && !query.isError && resources.length === 0 && (
        <div className="empty-state" role="status">
          No {collection.title.toLowerCase()} are available right now.
        </div>
      )}
      <div className="reference-grid">
        {resources.map((resource) => (
          <Link className="reference-card" to={`/${kind}/${resource.name}`} key={resource.name}>
            <span className="reference-card-id">
              {kind === 'types'
                ? 'TYPE'
                : `#${String(pokemonIdFromUrl(resource.url)).padStart(3, '0')}`}
            </span>
            <span className="reference-card-title">{titleCase(resource.name)}</span>
            <span className="reference-card-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        ))}
      </div>
      {query.hasNextPage && (
        <Button
          className="load-more"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading…' : `Load more ${collection.title.toLowerCase()}`}{' '}
          <span aria-hidden="true">↓</span>
        </Button>
      )}
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
  usePageTitle(data ? titleCase(data.name) : `${collection.singular} reference`)
  if (query.isLoading)
    return (
      <main className="page-width reference-page">
        <div className="loading-state" role="status">
          <span className="loader" />
          Loading {collection.singular.toLowerCase()}…
        </div>
      </main>
    )
  if (!data)
    return (
      <main className="page-width reference-page">
        <div className="crumb">
          <Link to="/">Discover</Link>
          <span>/</span>
          <Link to={`/${kind}`}>{collection.title}</Link>
        </div>
        <section className="reference-error" role="alert">
          <h1>
            {query.error instanceof Error && 'status' in query.error && query.error.status === 404
              ? `${collection.singular} not found`
              : `${collection.singular} unavailable`}
          </h1>
          <p>
            {query.error instanceof Error
              ? query.error.message
              : 'This record could not be loaded.'}
          </p>
          <Button onClick={() => void query.refetch()}>Retry</Button>
          <Link to={`/${kind}`}>Back to {collection.title}</Link>
        </section>
      </main>
    )
  return <ReferenceRecord kind={kind} data={data} refreshError={query.isError} onRetry={() => void query.refetch()} />
}

function ReferenceRecord({ kind, data, refreshError, onRetry }: { kind: ResourceKind; data: ResourceDetail; refreshError: boolean; onRetry: () => void }) {
  const collection = collections[kind]
  const effect = data.effect_entries?.find((entry) => entry.language.name === 'en')
  const flavor = data.flavor_text_entries
    ?.find((entry) => entry.language.name === 'en')
    ?.flavor_text.replace(/[\n\f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const knownTypes = kind === 'types' ? data.damage_relations : undefined
  const learnedPokemon = data.learned_by_pokemon ?? []
  const linkedPokemon = data.pokemon?.map((entry) => entry.pokemon) ?? []
  const heldPokemon = data.held_by_pokemon?.map((entry) => entry.pokemon) ?? []
  const moveList = data.moves ?? []
  const relatedPokemon =
    kind === 'moves'
      ? learnedPokemon
      : kind === 'abilities' || kind === 'types'
        ? linkedPokemon
        : heldPokemon
  const heading = titleCase(data.name)

  return (
    <main className={`reference-page reference-detail reference-${kind}`}>
      <div className="page-width">
        <div className="crumb">
          <Link to="/">Discover</Link>
          <span>/</span>
          <Link to={`/${kind}`}>{collection.title}</Link>
          <span>/</span>
          <b>{heading}</b>
        </div>
        <header className="reference-detail-heading">
          <div className="eyebrow">{collection.singular.toUpperCase()} REFERENCE</div>
          <h1>
            {heading}
            <span>.</span>
          </h1>
          {data.generation && <p>Introduced in {formatGeneration(data.generation.name)}</p>}
          {kind === 'types' && (
            <span
              className="reference-type-badge"
              style={{ '--type-color': TYPE_COLORS[data.name] ?? '#9299a2' } as React.CSSProperties}
            >
              {heading} type
            </span>
          )}
        </header>
        {refreshError && (
          <div className="error-box" role="status">
            Showing saved details. The latest data could not be refreshed.
            <button onClick={onRetry}>Retry</button>
          </div>
        )}
        <div className="reference-detail-grid">
          <section className="reference-main-panel">
            <h2>
              {kind === 'moves'
                ? 'Effect'
                : kind === 'abilities'
                  ? 'What it does'
                  : kind === 'items'
                    ? 'Description'
                    : 'Type matchups'}
            </h2>
            {kind === 'types' && knownTypes ? (
              <TypeRelations relations={knownTypes} />
            ) : effect ? (
              <p className="reference-effect">
                {(effect.short_effect || effect.effect).replaceAll(
                  '$effect_chance',
                  String(data.effect_chance ?? ''),
                )}
              </p>
            ) : flavor ? (
              <p className="reference-effect">{flavor}</p>
            ) : (
              <p className="muted">
                No English description is available in PokéAPI for this record.
              </p>
            )}
            {kind === 'moves' && <MoveContext data={data} />}
            {kind === 'types' && moveList.length > 0 && (
              <section className="reference-subsection">
                <h2>Moves of this type</h2>
                <ResourceLinks kind="moves" entries={moveList} initialCount={16} />
              </section>
            )}
          </section>
          <aside className="reference-meta-panel">
            {kind === 'moves' && <MoveMetadata data={data} />}
            {kind === 'abilities' && data.generation && (
              <MetadataRow label="Introduced" value={formatGeneration(data.generation.name)} />
            )}
            {kind === 'items' && (
              <>
                <MetadataRow
                  label="Category"
                  value={data.category ? titleCase(data.category.name) : 'Not listed'}
                />
                <MetadataRow
                  label="Cost"
                  value={
                    data.cost == null ? 'Not listed' : `${data.cost.toLocaleString()} Pokédollars`
                  }
                />
                {data.fling_power != null && (
                  <MetadataRow label="Fling power" value={String(data.fling_power)} />
                )}
                {data.attributes?.length ? (
                  <>
                    <h2>Attributes</h2>
                    <ul className="reference-plain-list">
                      {data.attributes.map((attribute) => (
                        <li key={attribute.name}>{titleCase(attribute.name)}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <MetadataRow label="Attributes" value="None listed" />
                )}
              </>
            )}
            {kind === 'types' && (
              <MetadataRow label="Moves in this type" value={String(data.moves?.length ?? 0)} />
            )}
            {kind !== 'types' && data.generation && kind !== 'abilities' && (
              <MetadataRow label="Introduced" value={formatGeneration(data.generation.name)} />
            )}
          </aside>
        </div>
        {kind === 'moves' && (
          <section className="reference-related">
            <h2>Pokémon that can learn {heading}</h2>
            <p>
              PokéAPI lists these Pokémon as compatible. The exact learn method and game version
              vary by Pokémon; open a Pokémon record to see the methods and version groups included
              in its data.
            </p>
            {relatedPokemon.length ? (
              <ResourceLinks kind="pokemon" entries={relatedPokemon} initialCount={24} />
            ) : (
              <p className="muted">PokéAPI does not list any Pokémon for this move.</p>
            )}
          </section>
        )}
        {kind === 'abilities' && (
          <section className="reference-related">
            <h2>Pokémon with {heading}</h2>
            {relatedPokemon.length ? (
              <PokemonAbilityLinks entries={data.pokemon ?? []} initialCount={24} />
            ) : (
              <p className="muted">No Pokémon are listed for this ability.</p>
            )}
          </section>
        )}
        {kind === 'items' && (
          <section className="reference-related">
            <h2>Pokémon that may hold {heading}</h2>
            {data.held_by_pokemon?.length ? (
              <HeldPokemonLinks entries={data.held_by_pokemon} initialCount={24} />
            ) : (
              <p className="muted">PokéAPI does not list any Pokémon that hold this item.</p>
            )}
          </section>
        )}
        {kind === 'types' && (
          <section className="reference-related">
            <h2>Pokémon with the {heading} type</h2>
            {relatedPokemon.length ? (
              <ResourceLinks kind="pokemon" entries={relatedPokemon} initialCount={24} />
            ) : (
              <p className="muted">No Pokémon are listed for this type.</p>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

function TypeRelations({
  relations,
}: {
  relations: NonNullable<ResourceDetail['damage_relations']>
}) {
  const groups: { label: string; caption: string; entries: NamedResource[] }[] = [
    {
      label: 'Deals 2× damage to',
      caption: 'Super effective',
      entries: relations.double_damage_to,
    },
    {
      label: 'Deals ½ damage to',
      caption: 'Not very effective',
      entries: relations.half_damage_to,
    },
    { label: 'Deals no damage to', caption: 'No effect', entries: relations.no_damage_to },
    { label: 'Takes 2× damage from', caption: 'Weak to', entries: relations.double_damage_from },
    { label: 'Takes ½ damage from', caption: 'Resists', entries: relations.half_damage_from },
    { label: 'Takes no damage from', caption: 'Immune to', entries: relations.no_damage_from },
  ]
  return (
    <>
      <p className="muted">
        These are single-type relationships. Dual types and game-specific battle modifiers can
        change the overall result.
      </p>
      <div className="reference-type-relations">
        {groups.map((group) => (
          <div className="type-relation-row" key={group.label}>
            <strong>{group.caption}</strong>
            <span>{group.label}</span>
            {group.entries.length ? (
              <div className="reference-type-chips">
                {group.entries.map((entry) => (
                  <Link
                    key={entry.name}
                    to={`/types/${entry.name}`}
                    style={
                      {
                        '--type-color': TYPE_COLORS[entry.name] ?? '#9299a2',
                      } as React.CSSProperties
                    }
                  >
                    {titleCase(entry.name)}
                  </Link>
                ))}
              </div>
            ) : (
              <span className="muted">None</span>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function MoveContext({ data }: { data: ResourceDetail }) {
  const versionGroups = [
    ...new Map(
      (data.machines ?? []).map(({ version_group }) => [version_group.name, version_group]),
    ).values(),
  ]
  return (
    <section className="reference-subsection">
      <h2>Game and learn-method context</h2>
      <p className="muted">
        This move record does not include per-Pokémon learn methods. Check an individual Pokémon’s
        move data for methods, level, and version group.
      </p>
      <div className="metadata-row">
        <span>Machine availability</span>
        <strong>
          {versionGroups.length
            ? versionGroups.map((group) => titleCase(group.name)).join(', ')
            : 'No machine versions listed'}
        </strong>
      </div>
    </section>
  )
}

function MoveMetadata({ data }: { data: ResourceDetail }) {
  const fields: [string, string][] = [
    ['Damage class', data.damage_class ? titleCase(data.damage_class.name) : 'Not listed'],
    ['Power', data.power == null ? 'Not applicable / not listed' : String(data.power)],
    ['Accuracy', data.accuracy == null ? 'Not applicable / not listed' : `${data.accuracy}%`],
    ['PP', data.pp == null ? 'Not listed' : String(data.pp)],
    ['Priority', data.priority == null ? 'Not listed' : String(data.priority)],
    ['Target', data.target ? titleCase(data.target.name) : 'Not listed'],
  ]
  return (
    <>
      <div className="metadata-row">
        <span>Type</span>
        <strong>
          {data.type ? (
            <Link to={`/types/${data.type.name}`}>{titleCase(data.type.name)}</Link>
          ) : (
            'Not listed'
          )}
        </strong>
      </div>
      {fields.map(([label, value]) => (
        <MetadataRow key={label} label={label} value={value} />
      ))}
    </>
  )
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="metadata-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ResourceLinks({
  kind,
  entries,
  initialCount,
}: {
  kind: 'moves' | 'pokemon'
  entries: NamedResource[]
  initialCount: number
}) {
  const [showMore, setShowMore] = useState(false)
  const visible = showMore ? entries : entries.slice(0, initialCount)
  return (
    <>
      <ul className="reference-related-grid">
        {visible.map((entry) => (
          <li key={entry.name}>
            <Link to={kind === 'pokemon' ? `/pokemon/${entry.name}` : `/moves/${entry.name}`}>
              {titleCase(entry.name)}
              <span aria-hidden="true">↗</span>
            </Link>
          </li>
        ))}
      </ul>
      {entries.length > initialCount && (
        <button className="reference-expand" onClick={() => setShowMore((value) => !value)}>
          {showMore ? 'Show fewer' : `Show ${entries.length - initialCount} more`}
        </button>
      )}
    </>
  )
}

function PokemonAbilityLinks({
  entries,
  initialCount,
}: {
  entries: NonNullable<ResourceDetail['pokemon']>
  initialCount: number
}) {
  const [showMore, setShowMore] = useState(false)
  const visible = showMore ? entries : entries.slice(0, initialCount)
  return (
    <>
      <ul className="reference-related-grid">
        {visible.map((entry) => (
          <li key={entry.pokemon.name}>
            <Link to={`/pokemon/${entry.pokemon.name}`}>
              {titleCase(entry.pokemon.name)}
              {entry.is_hidden && <small>Hidden ability</small>}
              <span aria-hidden="true">↗</span>
            </Link>
          </li>
        ))}
      </ul>
      {entries.length > initialCount && (
        <button className="reference-expand" onClick={() => setShowMore((value) => !value)}>
          {showMore ? 'Show fewer' : `Show ${entries.length - initialCount} more`}
        </button>
      )}
    </>
  )
}

function HeldPokemonLinks({
  entries,
  initialCount,
}: {
  entries: NonNullable<ResourceDetail['held_by_pokemon']>
  initialCount: number
}) {
  const [showMore, setShowMore] = useState(false)
  const visible = showMore ? entries : entries.slice(0, initialCount)
  return (
    <>
      <ul className="reference-related-grid">
        {visible.map((entry) => (
          <li key={entry.pokemon.name}>
            <Link to={`/pokemon/${entry.pokemon.name}`}>
              {titleCase(entry.pokemon.name)}
              {entry.version_details[0] && (
                <small>
                  {titleCase(entry.version_details[0].version.name)} ·{' '}
                  {entry.version_details[0].rarity}%
                </small>
              )}
              <span aria-hidden="true">↗</span>
            </Link>
          </li>
        ))}
      </ul>
      {entries.length > initialCount && (
        <button className="reference-expand" onClick={() => setShowMore((value) => !value)}>
          {showMore ? 'Show fewer' : `Show ${entries.length - initialCount} more`}
        </button>
      )}
    </>
  )
}

export function ReferenceRoute({ kind }: { kind: string }) {
  return isResourceKind(kind) ? (
    <ReferenceIndexPage kind={kind} />
  ) : (
    <main className="page-width reference-page">
      <h1>Reference collection not found</h1>
      <Link to="/">Back to Discover</Link>
    </main>
  )
}

export function ReferenceDetailRoute({ kind }: { kind: string }) {
  return isResourceKind(kind) ? (
    <ReferenceDetailPage kind={kind} />
  ) : (
    <main className="page-width reference-page">
      <h1>Reference record not found</h1>
      <Link to="/">Back to Discover</Link>
    </main>
  )
}
