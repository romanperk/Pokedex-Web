import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Download, Monitor, Moon, Search, Sun, Upload, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TopBar } from '../components/common/TopBar'
import { DexNumber, EmptyState, PokemonSprite, TypeBadge } from '../components/ui'
import {
  exportCollection,
  importCollection,
  removeCollectionEntry,
  restoreCollectionEntry,
  useCollectionEntries,
  useCollectionStorageUnavailable,
  type CollectionEntry,
} from '../features/collection/savedPokemon'
import { getPokemon, pokemonKeys, SPECIES_COUNT, titleCase } from '../lib/pokeapi/client'
import { usePageTitle } from '../lib/usePageTitle'
import { setThemePreference, useThemePreference, type ThemePreference } from '../lib/theme'

const SESSION_ONLY = ' This change is only for this session because browser storage is unavailable.'
const BACKUP_NAME = 'pokedex-local-collection.json'

type Notice = { text: string; undo?: CollectionEntry }

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

function AppearanceControl() {
  const preference = useThemePreference()
  return (
    <section className="section" aria-labelledby="appearance-heading">
      <h2 className="section-title" id="appearance-heading">
        Appearance
      </h2>
      <div className="segmented" role="radiogroup" aria-labelledby="appearance-heading">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={preference === value}
            onClick={() => setThemePreference(value)}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}

export function TrainerPage() {
  usePageTitle('Trainer')
  const entries = useCollectionEntries()
  const storageUnavailable = useCollectionStorageUnavailable()
  const fileInput = useRef<HTMLInputElement>(null)
  const [sortByName, setSortByName] = useState(false)
  const [search, setSearch] = useState('')
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [notice, setNotice] = useState<Notice | null>(null)
  const queries = useQueries({
    queries: entries.map((entry) => ({
      queryKey: pokemonKeys.detail(entry.name),
      queryFn: ({ signal }: { signal: AbortSignal }) => getPokemon(entry.name, signal),
      staleTime: 1000 * 60 * 60 * 12,
    })),
  })
  const visibleEntries = useMemo(() => {
    const indexed = entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) =>
        titleCase(entry.name).toLowerCase().includes(search.trim().toLowerCase()),
      )
    // Entries are stored oldest first.
    return sortByName
      ? indexed.sort((a, b) => a.entry.name.localeCompare(b.entry.name))
      : indexed.reverse()
  }, [entries, search, sortByName])
  // Alternate forms use ids above the species range and don't count toward the Pokédex total.
  const ownedSpecies =
    entries.length - queries.filter((query) => (query.data?.id ?? 0) > SPECIES_COUNT).length

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 6000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  function notify(text: string, undo?: CollectionEntry) {
    setNotice({ text, undo })
  }

  async function exportBackup() {
    try {
      const backup = exportCollection()
      const json = JSON.stringify(backup, null, 2)
      const file = new File([json], BACKUP_NAME, { type: 'application/json' })
      // Home screen apps on iOS ignore download links, so phones use the share sheet.
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Pokédex collection' })
      } else {
        const url = URL.createObjectURL(file)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = BACKUP_NAME
        anchor.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 0)
      }
      notify(`Backup exported with ${backup.records.length} Pokémon`)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      notify('The backup could not be created on this device')
    }
  }

  async function onImport(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    try {
      if (
        importMode === 'replace' &&
        !window.confirm(`Replace all ${entries.length} Pokémon with this backup?`)
      )
        return
      const result = importCollection(await file.text(), importMode)
      notify(`${result.imported} Pokémon imported.${result.persisted ? '' : SESSION_ONLY}`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The backup could not be imported')
    } finally {
      input.value = ''
    }
  }

  function remove(entry: CollectionEntry) {
    const { persisted } = removeCollectionEntry(entry.name)
    notify(`${titleCase(entry.name)} removed.${persisted ? '' : SESSION_ONLY}`, entry)
  }

  function undo(entry: CollectionEntry) {
    const persisted = restoreCollectionEntry(entry)
    notify(`${titleCase(entry.name)} restored.${persisted ? '' : SESSION_ONLY}`)
  }

  return (
    <main className="page trainer">
      <TopBar title="Trainer" />
      <div className="page-body">
        {storageUnavailable && (
          <p className="note note-warning" role="alert">
            Browser storage is unavailable. Changes last for this session, so export a backup to
            keep them.
          </p>
        )}

        <div
          className="trainer-card hero-plate"
          style={{ '--type-color': '#d3302b' } as React.CSSProperties}
        >
          <span className="trainer-figure">
            <b>{ownedSpecies.toLocaleString()}</b> of {SPECIES_COUNT.toLocaleString()}
          </span>
          <span>Pokémon owned</span>
          <div className="trainer-progress" aria-hidden="true">
            <i style={{ transform: `scaleX(${Math.min(ownedSpecies / SPECIES_COUNT, 1)})` }} />
          </div>
        </div>

        <AppearanceControl />

        <section className="section" aria-labelledby="collection-heading">
          <div className="section-heading-row">
            <h2 className="section-title" id="collection-heading">
              My Pokémon
            </h2>
            {entries.length > 1 && (
              <label className="inline-select">
                <span className="visually-hidden">Sort by</span>
                <select
                  value={sortByName ? 'name' : 'added'}
                  onChange={(event) => setSortByName(event.target.value === 'name')}
                >
                  <option value="added">Recently added</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
            )}
          </div>
          {entries.length === 0 ? (
            <EmptyState
              title="No Pokémon yet"
              action={
                <Link className="button button-primary" to="/pokedex">
                  Open the Pokédex
                </Link>
              }
            >
              Open any Pokémon and tap Mark owned to keep track of it here.
            </EmptyState>
          ) : (
            <>
              {entries.length > 5 && (
                <label className="search-field search-field-surface">
                  <Search size={20} aria-hidden="true" />
                  <input
                    type="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    aria-label="Search your Pokémon"
                    placeholder="Search your Pokémon"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              )}
              {visibleEntries.length === 0 ? (
                <EmptyState title="No matches">Try another name.</EmptyState>
              ) : (
                <ul className="list">
                  {visibleEntries.map(({ entry, index }) => {
                    const query = queries[index]
                    const pokemon = query?.data
                    return (
                      <li className="collection-row" key={entry.name}>
                        {pokemon ? (
                          <Link className="list-row" to={`/pokemon/${pokemon.name}`}>
                            <PokemonSprite id={pokemon.id} className="list-sprite" />
                            <span className="list-text">
                              <strong>{titleCase(pokemon.name)}</strong>
                              <span className="collection-meta">
                                <DexNumber id={pokemon.id} />
                                {pokemon.types.map(({ type }) => (
                                  <TypeBadge key={type.name} type={type.name} />
                                ))}
                              </span>
                            </span>
                          </Link>
                        ) : (
                          <div className="list-row">
                            <span className="list-sprite skeleton" aria-hidden="true" />
                            <span className="list-text">
                              <strong>{titleCase(entry.name)}</strong>
                              {query?.isError && (
                                <button
                                  type="button"
                                  className="text-button"
                                  onClick={() => void query.refetch()}
                                >
                                  Could not load. Try again
                                </button>
                              )}
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Remove ${titleCase(entry.name)}`}
                          onClick={() => remove(entry)}
                        >
                          <X size={20} aria-hidden="true" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </section>

        <section className="section" aria-labelledby="backup-heading">
          <h2 className="section-title" id="backup-heading">
            Backup
          </h2>
          <div className="card backup">
            <p className="note">
              Your collection is saved on this device only. Clearing site data or removing the app
              can erase it, so export a copy now and then.
            </p>
            <div className="backup-actions">
              <button
                type="button"
                className="button button-secondary"
                disabled={!entries.length}
                onClick={() => void exportBackup()}
              >
                <Upload size={18} aria-hidden="true" />
                Export
              </button>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => fileInput.current?.click()}
              >
                <Download size={18} aria-hidden="true" />
                Import
              </button>
            </div>
            <label className="field">
              <span>When importing</span>
              <select
                value={importMode}
                onChange={(event) => setImportMode(event.target.value as 'merge' | 'replace')}
              >
                <option value="merge">Add to this collection</option>
                <option value="replace">Replace this collection</option>
              </select>
            </label>
            <input
              ref={fileInput}
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              tabIndex={-1}
              aria-label="Choose a Pokémon collection backup"
              onChange={(event) => void onImport(event)}
            />
          </div>
        </section>
      </div>

      {notice && (
        <div className="snackbar" role="status">
          <span>{notice.text}</span>
          {notice.undo && (
            <button type="button" onClick={() => undo(notice.undo!)}>
              Undo
            </button>
          )}
        </div>
      )}
    </main>
  )
}
