import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../components/ui'
import { getResource, resourceKeys, titleCase } from '../lib/pokeapi/client'

export function ItemDetailPage() {
  const { name = '' } = useParams()
  const item = useQuery({
    queryKey: resourceKeys.detail('items', name),
    queryFn: ({ signal }) => getResource('items', name, signal),
    enabled: Boolean(name),
    staleTime: 1000 * 60 * 60 * 24,
  })
  const data = item.data
  useEffect(() => {
    document.title = data ? `${titleCase(data.name)} | Items | Pokédex` : 'Item | Pokédex'
    return () => {
      document.title = 'Pokédex — Discover Pokémon'
    }
  }, [data])

  if (!data && item.isPending) {
    return (
      <main className="page-width reference-page">
        <p className="loading-state" role="status">
          Loading item…
        </p>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="page-width reference-page">
        <div className="crumb">
          <Link to="/">Discover</Link>
          <span>/</span>
          <Link to="/items">Items</Link>
        </div>
        <section className="reference-error" role="alert">
          <h1>
            {item.error instanceof Error && 'status' in item.error && item.error.status === 404
              ? 'Item not found'
              : 'Item details unavailable'}
          </h1>
          <p>
            {item.error instanceof Error
              ? item.error.message
              : `Details for “${name}” could not be loaded.`}
          </p>
          <Button onClick={() => void item.refetch()}>Retry</Button>
          <Link to="/items">Back to Items</Link>
        </section>
      </main>
    )
  }

  const description = data.effect_entries?.find((entry) => entry.language?.name === 'en')
  const flavor = data.flavor_text_entries?.find(
    (entry) => entry.language?.name === 'en',
  )?.flavor_text
  const heldBy = data.held_by_pokemon ?? []
  return (
    <main className="page-width reference-page reference-detail reference-items">
      <div className="crumb">
        <Link to="/">Discover</Link>
        <span>/</span>
        <Link to="/items">Items</Link>
        <span>/</span>
        <b>{titleCase(data.name)}</b>
      </div>
      <header className="reference-detail-heading">
        <div className="eyebrow">ITEM REFERENCE</div>
        <h1>
          {titleCase(data.name)}
          <span>.</span>
        </h1>
        {data.category?.name && <p>{titleCase(data.category.name)}</p>}
      </header>
      {item.isError && (
        <div className="error-box" role="status">
          Showing saved details. The latest data could not be refreshed.
          <button onClick={() => void item.refetch()}>Retry</button>
        </div>
      )}
      <div className="reference-detail-grid">
        <section className="reference-main-panel">
          <h2>Description</h2>
          <p className="reference-effect">
            {description?.short_effect ||
              description?.effect ||
              flavor
                ?.replace(/[\n\f]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim() ||
              'No English description is available for this item.'}
          </p>
        </section>
        <aside className="reference-meta-panel">
          <div className="metadata-row">
            <span>Category</span>
            <strong>{data.category?.name ? titleCase(data.category.name) : 'Not listed'}</strong>
          </div>
          <div className="metadata-row">
            <span>Cost</span>
            <strong>
              {typeof data.cost === 'number'
                ? `${data.cost.toLocaleString()} Pokédollars`
                : 'Not listed'}
            </strong>
          </div>
          {data.fling_power != null && (
            <div className="metadata-row">
              <span>Fling power</span>
              <strong>{data.fling_power}</strong>
            </div>
          )}
          <div className="metadata-row">
            <span>Attributes</span>
            <strong>
              {data.attributes?.length
                ? data.attributes.map((attribute) => titleCase(attribute.name)).join(', ')
                : 'None listed'}
            </strong>
          </div>
          {data.generation?.name && (
            <div className="metadata-row">
              <span>Introduced</span>
              <strong>{titleCase(data.generation.name)}</strong>
            </div>
          )}
        </aside>
      </div>
      <section className="reference-related">
        <h2>Pokémon that may hold {titleCase(data.name)}</h2>
        {heldBy.length ? (
          <ul className="reference-related-grid">
            {heldBy.map((entry) => {
              const version = entry.version_details?.[0]
              return (
                <li key={entry.pokemon.name}>
                  <Link to={`/pokemon/${entry.pokemon.name}`}>
                    {titleCase(entry.pokemon.name)}
                    {version && (
                      <small>
                        {titleCase(version.version.name)} · {version.rarity}%
                      </small>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="muted">PokéAPI does not list any Pokémon that hold this item.</p>
        )}
      </section>
    </main>
  )
}
