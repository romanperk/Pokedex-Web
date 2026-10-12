import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ActionLink, Button } from '../components/ui'
import { SavePokemonButton } from '../features/collection/SavePokemonButton'
import { useQuery } from '@tanstack/react-query'
import { EncounterBrowser, EvolutionSection, FormsSection, LearnsetBrowser, SpeciesFacts } from './PokemonContextSections'
import {
  getEnglishFlavorEntry,
  getEnglishFlavorText,
  getPokemon,
  getPokemonPage,
  getPokemonSpecies,
  paddedId,
  pokemonArtwork,
  pokemonKeys,
  pokemonSprite,
  PokeApiError,
  titleCase,
  TYPE_COLORS,
} from '../lib/pokeapi/client'

export function PokemonDetailPage() {
  const { name = '' } = useParams()
  const pokemon = useQuery({
    queryKey: pokemonKeys.detail(name),
    queryFn: ({ signal }) => getPokemon(name, signal),
    enabled: Boolean(name),
    staleTime: 1000 * 60 * 60 * 12,
  })
  const species = useQuery({
    queryKey: pokemonKeys.species(name),
    queryFn: ({ signal }) => getPokemonSpecies(name, signal),
    enabled: Boolean(name),
    staleTime: 1000 * 60 * 60 * 24,
  })
  const data = pokemon.data
  const pokemonIndex = useQuery({
    queryKey: pokemonKeys.count,
    queryFn: ({ signal }) => getPokemonPage(0, 1, signal),
    enabled: Boolean(data),
    staleTime: 1000 * 60 * 60 * 24,
  })
  const description = useMemo(() => getEnglishFlavorText(species.data), [species.data])
  const descriptionEntry = useMemo(() => getEnglishFlavorEntry(species.data), [species.data])
  const mainType = data?.types[0]?.type.name ?? ''

  useEffect(() => {
    document.title = data ? `${titleCase(data.name)} | Pokédex` : 'Pokémon | Pokédex'
    return () => {
      document.title = 'Pokédex — Discover Pokémon'
    }
  }, [data])

  if (pokemon.isLoading)
    return (
      <main className="detail-page detail-page-loading">
        <div className="detail-loading">
          <span className="loader" />
          Loading Pokémon…
        </div>
      </main>
    )
  if (pokemon.isError || !data) {
    const isMissing = pokemon.error instanceof PokeApiError && pokemon.error.status === 404
    return (
      <main className="detail-page">
        <div className="not-found page-width">
          <h2>{isMissing ? 'Pokémon not found' : 'Could not load Pokémon'}</h2>
          <p>
            {pokemon.error instanceof Error
              ? pokemon.error.message
              : 'This Pokémon could not be loaded.'}
          </p>
          <Button onClick={() => void pokemon.refetch()}>Try again</Button>
          <ActionLink to="/pokedex">Back to Pokédex</ActionLink>
        </div>
      </main>
    )
  }

  return (
    <main
      className="detail-page"
      style={{ '--pokemon-color': TYPE_COLORS[mainType] || '#7ac850' } as React.CSSProperties}
    >
      <div className="detail-top page-width">
        <div className="crumb crumb-light">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/pokedex">Pokédex</Link>
          <span>/</span>
          <b>{titleCase(data.name)}</b>
          <SavePokemonButton name={data.name} />
        </div>
        <div className="detail-title">
          <div>
            <span className="detail-kicker">
              NO. {String(data.id).padStart(3, '0')} ·{' '}
              {data.types
                .map((type) => type.type.name)
                .join(' / ')
                .toUpperCase()}
            </span>
            <h1>
              {titleCase(data.name)}
              <span>.</span>
            </h1>
            <div className="detail-types">
              {data.types.map((type) => (
                <Link className="detail-type" key={type.type.name} to={`/types/${type.type.name}`}>
                  {type.type.name}
                </Link>
              ))}
            </div>
          </div>
          <strong className="detail-number">{paddedId(data.id)}</strong>
        </div>
        <div className="detail-image-wrap">
          <div className="detail-image-ring" />
          <span className="detail-image-star star-left" aria-hidden="true">
            ✦
          </span>
          <span className="detail-image-star star-right" aria-hidden="true">
            ✧
          </span>
          <img
            src={pokemonArtwork(data)}
            onError={(event) => {
              const image = event.currentTarget
              const fallback = pokemonSprite(data.id)
              if (image.src !== fallback) image.src = fallback
              else image.hidden = true
            }}
            alt={`${titleCase(data.name)} official artwork`}
          />
        </div>
        <div className="detail-footnote">
          <span>SPECIES PROFILE</span>
          <span>{paddedId(data.id)}</span>
        </div>
      </div>
      <section className="detail-content">
        <div className="detail-content-inner">
          <div className="fact-block">
            <span className="content-label">A LITTLE ABOUT {data.name.toUpperCase()}</span>
            <h2>Did you know?</h2>
            {species.isLoading ? (
              <p className="muted">Loading description…</p>
            ) : species.isError ? (
              <div className="description-error"><p className="muted">Species information is unavailable right now.</p><Button onClick={() => void species.refetch()}>Retry</Button></div>
            ) : (
              <p>{description}</p>
            )}
          </div>
          {species.data && <>
            <SpeciesFacts species={species.data} descriptionVersion={descriptionEntry?.version_group?.name} />
            <FormsSection species={species.data} currentName={data.name} />
            <EvolutionSection species={species.data} />
          </>}
          <div className="detail-columns">
            <section className="stats-section" aria-labelledby="stats-title">
              <div className="content-heading">
                <div>
                  <span className="content-label">THE NUMBERS</span>
                  <h2 id="stats-title">Base stats</h2>
                </div>
                <span className="stat-total">
                  TOTAL <b>{data.stats.reduce((sum, stat) => sum + stat.base_stat, 0)}</b>
                </span>
              </div>
              {data.stats.map((stat) => (
                <div className="stat-row" key={stat.stat.name}>
                  <span>{stat.stat.name.replace('-', ' ')}</span>
                  <b>{stat.base_stat}</b>
                  <div
                    className="stat-track"
                    role="progressbar"
                    aria-label={stat.stat.name.replace('-', ' ')}
                    aria-valuemin={0}
                    aria-valuemax={255}
                    aria-valuenow={stat.base_stat}
                  >
                    <i style={{ width: `${Math.min((stat.base_stat / 255) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </section>
            <section className="profile-section">
              <span className="content-label">GET TO KNOW IT</span>
              <h2>Profile</h2>
              <div className="profile-grid">
                <div className="profile-item">
                  <span>HEIGHT</span>
                  <b>
                    {(data.height / 10).toFixed(1)} <small>m</small>
                  </b>
                </div>
                <div className="profile-item">
                  <span>WEIGHT</span>
                  <b>
                    {(data.weight / 10).toFixed(1)} <small>kg</small>
                  </b>
                </div>
                <div className="profile-item">
                  <span>BASE XP</span>
                  <b>{data.base_experience ?? '—'}</b>
                </div>
              </div>
              <div className="ability-heading">Abilities</div>
              <div className="ability-list">
                {data.abilities.map((ability) => (
                  <Link to={`/abilities/${ability.ability.name}`} key={ability.ability.name}>
                    {titleCase(ability.ability.name)}
                    {ability.is_hidden && <small>HIDDEN</small>}
                  </Link>
                ))}
              </div>
            </section>
          </div>
          <LearnsetBrowser moves={data.moves ?? []} />
          <EncounterBrowser pokemonId={data.id} pokemonName={data.name} endpointAvailable={Boolean(data.location_area_encounters)} />
          <section className="pokemon-reference-section" aria-labelledby="pokemon-items-title">
            <span className="content-label">ITEM REFERENCE</span>
            <h2 id="pokemon-items-title">Held items</h2>
            {data.held_items?.length ? (
              <ul className="pokemon-held-item-list">
                {data.held_items.map(({ item, version_details: versions }) => (
                  <li key={item.name}>
                    <Link to={`/items/${item.name}`}>{titleCase(item.name)}</Link>
                    <span>
                      {versions.length
                        ? versions
                            .map(
                              (version) =>
                                `${titleCase(version.version.name)} · ${version.rarity}%`,
                            )
                            .join(' / ')
                        : 'Version details unavailable'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No held items are listed in this Pokémon record.</p>
            )}
          </section>
          <nav className="detail-navigation" aria-label="Pokémon navigation">
            {data.id > 1 ? <Link to={`/pokemon/${data.id - 1}`}>← Previous Pokémon</Link> : <span className="detail-navigation-disabled" aria-disabled="true">First Pokémon</span>}
            <Link to="/pokedex">
              Back to Pokédex <span>↗</span>
            </Link>
            {pokemonIndex.data && data.id >= pokemonIndex.data.count ? <span className="detail-navigation-disabled" aria-disabled="true">Last Pokémon</span> : <Link to={`/pokemon/${data.id + 1}`}>Next Pokémon →</Link>}
          </nav>
        </div>
      </section>
    </main>
  )
}
