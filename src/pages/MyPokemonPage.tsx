import { useMemo, useRef, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  exportCollection,
  importCollection,
  removeCollectionEntry,
  restoreCollectionEntry,
  setPokemonOwned,
  useCollectionEntries,
  useCollectionStorageUnavailable,
  type CollectionEntry,
} from '../features/collection/savedPokemon'
import {
  getPokemon,
  paddedId,
  pokemonArtwork,
  pokemonKeys,
  pokemonSprite,
  titleCase,
  TYPE_COLORS,
} from '../lib/pokeapi/client'

export function MyPokemonPage() {
  const entries = useCollectionEntries()
  const storageUnavailable = useCollectionStorageUnavailable()
  const fileInput = useRef<HTMLInputElement>(null)
  const [sortByName, setSortByName] = useState(false)
  const [search, setSearch] = useState('')
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [message, setMessage] = useState('')
  const [removed, setRemoved] = useState<CollectionEntry | null>(null)
  const queries = useQueries({
    queries: entries.map((entry) => ({
      queryKey: pokemonKeys.detail(entry.name),
      queryFn: ({ signal }) => getPokemon(entry.name, signal),
      staleTime: 1000 * 60 * 60 * 12,
    })),
  })
  const visibleEntries = useMemo(() => {
    const indexed = entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) =>
        titleCase(entry.name).toLowerCase().includes(search.trim().toLowerCase()),
      )
    if (sortByName)
      indexed.sort((a, b) => titleCase(a.entry.name).localeCompare(titleCase(b.entry.name)))
    return indexed
  }, [entries, search, sortByName])

  function downloadBackup() {
    try {
      const backup = exportCollection()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'pokedex-local-collection.json'
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      setMessage(`Backup exported with ${backup.records.length} Pokémon.`)
    } catch {
      setMessage('The backup could not be created in this browser.')
    }
  }

  async function onImport(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    try {
      const result = importCollection(await file.text(), importMode)
      setMessage(
        `${result.imported} Pokémon imported.${result.persisted ? '' : ' Changes are only in this session because browser storage is unavailable.'}`,
      )
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'The backup could not be imported. No changes were made.',
      )
    } finally {
      input.value = ''
    }
  }

  function updateOwned(entry: CollectionEntry, owned: boolean) {
    const result = owned
      ? setPokemonOwned(entry.name, true)
      : removeCollectionEntry(entry.name).persisted
    if (!owned) {
      setRemoved(entry)
      setMessage(
        `${titleCase(entry.name)} removed from your owned collection.${result ? '' : ' This change is only in this session because browser storage is unavailable.'}`,
      )
    } else {
      setRemoved(null)
      setMessage(
        `${titleCase(entry.name)} marked as owned.${result ? '' : ' This change is only in this session because browser storage is unavailable.'}`,
      )
    }
  }

  function undoRemove() {
    if (!removed) return
    const persisted = restoreCollectionEntry(removed)
    setMessage(
      `${titleCase(removed.name)} restored.${persisted ? '' : ' This change is only in this session because browser storage is unavailable.'}`,
    )
    setRemoved(null)
  }

  return (
    <main className="page-width collection-page">
      <header className="collection-heading">
        <div>
          <div className="eyebrow">YOUR COLLECTION</div>
          <h1>
            My Pokémon<span>.</span>
          </h1>
          <p>Your personal inventory of Pokémon you own.</p>
        </div>
        <Link className="collection-add-link" to="/pokedex">
          Browse Pokédex <span aria-hidden="true">→</span>
        </Link>
      </header>

      <section className="collection-toolbar" aria-label="Search and sort your collection">
        <label className="collection-search">
          <span className="visually-hidden">Search your collection</span>
          <input
            type="search"
            placeholder="Search your Pokémon"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="collection-sort">
          Sort by
          <select
            value={sortByName ? 'name' : 'added'}
            onChange={(event) => setSortByName(event.target.value === 'name')}
          >
            <option value="added">Recently added</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
        <p className="collection-count">
          <strong>{entries.length}</strong> owned
        </p>
      </section>

      {storageUnavailable && (
        <div className="collection-storage-warning" role="alert">
          Browser storage is unavailable. Edits remain visible for this session; export a backup to
          keep a copy.
        </div>
      )}

      <details className="collection-backup">
        <summary>Import or export collection</summary>
        <div className="collection-backup-content">
          <label>
            When importing
            <select
              value={importMode}
              onChange={(event) => setImportMode(event.target.value as 'merge' | 'replace')}
            >
              <option value="merge">Merge with this collection</option>
              <option value="replace">Replace this collection</option>
            </select>
          </label>
          <button type="button" className="secondary-button" onClick={downloadBackup}>
            Export backup
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => fileInput.current?.click()}
          >
            Import backup
          </button>
          <span className="collection-backup-hint">
            JSON backup · Stored in this browser · No account or sync
          </span>
        </div>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void onImport(event)}
          aria-label="Choose a Pokémon collection backup"
        />
      </details>

      {(message || removed) && (
        <div className="collection-message" role="status">
          <span>{message}</span>
          {removed && (
            <button type="button" onClick={undoRemove}>
              Undo
            </button>
          )}
        </div>
      )}

      {!entries.length ? (
        <section className="saved-empty">
          <h2>Your inventory is empty</h2>
          <p>Add Pokémon from their detail pages and track the ones you own here.</p>
          <Link className="primary-button" to="/pokedex">
            Explore the Pokédex <span>→</span>
          </Link>
        </section>
      ) : !visibleEntries.length ? (
        <section className="saved-empty">
          <h2>No Pokémon match this search</h2>
          <p>Try another name.</p>
        </section>
      ) : (
        <div className="collection-inventory" role="list" aria-label="Pokémon you own">
          <div className="collection-columns" aria-hidden="true">
            <span>Pokémon</span>
            <span>Type</span>
            <span>Owned</span>
          </div>
          {visibleEntries.map(({ entry, index }) => {
            const query = queries[index]
            const pokemon = query?.data
            if (query?.isError && !pokemon) {
              return (
                <article
                  className="collection-row collection-row-error"
                  key={entry.name}
                  role="listitem"
                >
                  <span>{titleCase(entry.name)} could not load.</span>
                  <button type="button" onClick={() => void query.refetch()}>
                    Retry
                  </button>
                </article>
              )
            }
            if (!pokemon) {
              return (
                <div
                  className="collection-row collection-row-skeleton"
                  key={entry.name}
                  role="listitem"
                  aria-label={`Loading ${titleCase(entry.name)}`}
                />
              )
            }
            return (
              <article
                className="collection-row"
                key={entry.name}
                role="listitem"
                style={
                  {
                    '--pokemon-color': TYPE_COLORS[pokemon.types[0]?.type.name] ?? '#9ca3ad',
                  } as React.CSSProperties
                }
              >
                <Link
                  className="collection-pokemon-link"
                  to={`/pokemon/${pokemon.name}`}
                  aria-label={`${titleCase(pokemon.name)}, ${paddedId(pokemon.id)}`}
                >
                  <img
                    src={pokemonSprite(pokemon.id)}
                    onError={(event) => {
                      const image = event.currentTarget
                      if (image.src !== pokemonArtwork(pokemon)) image.src = pokemonArtwork(pokemon)
                      else image.hidden = true
                    }}
                    alt=""
                  />
                  <span className="collection-pokemon-name">
                    <small>{paddedId(pokemon.id)}</small>
                    <strong>{titleCase(pokemon.name)}</strong>
                  </span>
                </Link>
                <span className="collection-row-types">
                  {pokemon.types.map(({ type }) => (
                    <span
                      key={type.name}
                      className="type-badge"
                      style={{ '--type-color': TYPE_COLORS[type.name] } as React.CSSProperties}
                    >
                      {type.name}
                    </span>
                  ))}
                </span>
                <label className="collection-owned">
                  <input
                    type="checkbox"
                    checked={entry.owned}
                    onChange={(event) => updateOwned(entry, event.target.checked)}
                  />
                  <span>Owned</span>
                </label>
              </article>
            )
          })}
        </div>
      )}
      <p className="collection-local-note">
        This inventory is saved on this device only and does not sync. Browser site data can be
        cleared at any time.
      </p>
      <span className="visually-hidden" role="status" aria-live="polite">
        {message}
      </span>
    </main>
  )
}
