import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftRight,
  Backpack,
  Dna,
  Search,
  Shapes,
  Shield,
  Swords,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/common/BrandMark'
import { TopBar } from '../components/common/TopBar'
import { DexNumber, HaloArt, PokemonSprite, TypeBadge } from '../components/ui'
import { readRecentPokemon } from '../features/pokedex/recentPokemon'
import { dismissInstallHint, promptInstall, useInstallHint } from '../lib/install'
import {
  getPokedexFacts,
  getPokemon,
  getPokemonSpecies,
  pokemonArtwork,
  pokemonKeys,
  SPECIES_COUNT,
  titleCase,
  typeVars,
} from '../lib/pokeapi/client'
import { usePageTitle } from '../lib/usePageTitle'

const browse: { name: string; detail: string; to: string; icon: LucideIcon; color: string }[] = [
  { name: 'Moves', detail: 'Power and effects', to: '/moves', icon: Swords, color: '#4d9ce8' },
  { name: 'Abilities', detail: 'Who has what', to: '/abilities', icon: Dna, color: '#65b86a' },
  { name: 'Items', detail: 'Uses and holders', to: '/items', icon: Backpack, color: '#c9a838' },
  { name: 'Types', detail: 'Pokémon and moves', to: '/types', icon: Shapes, color: '#9b67c8' },
  {
    name: 'Type chart',
    detail: 'Check weaknesses',
    to: '/tools/type-effectiveness',
    icon: Shield,
    color: '#ef5350',
  },
  {
    name: 'Compare',
    detail: 'Stats side by side',
    to: '/tools/compare',
    icon: ArrowLeftRight,
    color: '#2aa198',
  },
]

/** Steps through every species once before repeating; 397 shares no factor with 1025. */
function pokemonOfTheDay() {
  const now = new Date()
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000)
  return ((day * 397) % SPECIES_COUNT) + 1
}

function FeaturedPokemon() {
  const [id, setId] = useState(pokemonOfTheDay)
  const [factSeed] = useState(Math.random)
  // Home screen apps can stay open for days, so check again whenever the app comes back.
  useEffect(() => {
    const refresh = () => setId(pokemonOfTheDay())
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])
  const pokemon = useQuery({
    queryKey: pokemonKeys.detail(id),
    queryFn: ({ signal }) => getPokemon(id, signal),
    staleTime: 1000 * 60 * 60 * 12,
  })
  const species = useQuery({
    queryKey: pokemonKeys.species(id),
    queryFn: ({ signal }) => getPokemonSpecies(id, signal),
    staleTime: 1000 * 60 * 60 * 24,
  })
  const data = pokemon.data
  const facts = getPokedexFacts(species.data)
  const fact = facts[Math.floor(factSeed * facts.length)]
  if (pokemon.isError) return null
  if (!data) return <div className="featured skeleton" aria-hidden="true" />
  return (
    <Link
      className="featured hero-plate"
      to={`/pokemon/${data.name}`}
      style={typeVars(data.types[0]?.type.name)}
    >
      <div className="featured-head">
        <span className="featured-label">Pokémon of the day</span>
        <strong className="featured-name">
          {titleCase(data.name)}
          <span className="title-dot">.</span>
        </strong>
      </div>
      <div className="featured-copy">
        <DexNumber id={data.id} />
        <span className="type-row">
          {data.types.map(({ type }) => (
            <TypeBadge key={type.name} type={type.name} />
          ))}
        </span>
      </div>
      <HaloArt className="featured-art" src={pokemonArtwork(data)} />
      {fact && <p className="featured-text">{fact.text}</p>}
    </Link>
  )
}

function InstallHint() {
  const hint = useInstallHint()
  if (!hint) return null
  return (
    <aside className="install-hint">
      <div>
        <strong>Keep the Pokédex on your phone</strong>
        <span>
          {hint === 'ios'
            ? 'Tap Share, then Add to Home Screen. It opens full screen and works offline.'
            : 'Install it to open full screen and keep browsing offline.'}
        </span>
        {hint === 'prompt' && (
          <button
            type="button"
            className="button button-primary"
            onClick={() => void promptInstall()}
          >
            Install
          </button>
        )}
      </div>
      <button
        type="button"
        className="icon-button"
        aria-label="Dismiss"
        onClick={dismissInstallHint}
      >
        <X size={20} aria-hidden="true" />
      </button>
    </aside>
  )
}

export function HomePage() {
  usePageTitle()
  const [recent] = useState(readRecentPokemon)
  return (
    <main className="page home">
      <TopBar
        title={
          <span className="home-brand">
            <BrandMark size={28} />
            Pokédex
          </span>
        }
        titleAs="div"
        search={false}
      />
      <div className="page-body">
        <h1 className="home-headline">
          What Pokémon
          <br />
          are you <em>looking for?</em>
        </h1>
        <Link className="search-field search-field-link" to="/search">
          <Search size={20} aria-hidden="true" />
          <span>Search Pokémon, moves, items</span>
        </Link>
        <InstallHint />
        <FeaturedPokemon />
        {recent.length > 0 && (
          <section className="section" aria-labelledby="recent-heading">
            <h2 className="section-title" id="recent-heading">
              Recently viewed
            </h2>
            <ul className="recent-strip">
              {recent.map((pokemon) => (
                <li key={pokemon.id}>
                  <Link to={`/pokemon/${pokemon.name}`}>
                    <PokemonSprite id={pokemon.id} />
                    <span>{titleCase(pokemon.name)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="section" aria-labelledby="browse-heading">
          <h2 className="section-title" id="browse-heading">
            Browse
          </h2>
          <ul className="browse-grid">
            {browse.map(({ name, detail, to, icon: Icon, color }) => (
              <li key={to}>
                <Link
                  className="browse-tile"
                  to={to}
                  style={{ '--tile-color': color } as React.CSSProperties}
                >
                  <span className="browse-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <strong>{name}</strong>
                  <small>{detail}</small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <footer className="home-footer">
          Data from PokéAPI. A fan-made reference, not affiliated with Nintendo, Game Freak or The
          Pokémon Company.
        </footer>
      </div>
    </main>
  )
}
