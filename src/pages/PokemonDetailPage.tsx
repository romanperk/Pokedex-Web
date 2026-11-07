import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeftRight, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { TopBar } from '../components/common/TopBar'
import { ErrorState, Fact, HaloArt, LoadingState, TypeBadge } from '../components/ui'
import { SavePokemonButton } from '../features/collection/SavePokemonButton'
import { rememberRecentPokemon } from '../features/pokedex/recentPokemon'
import { MatchupList } from './MatchupList'
import {
  friendlyError,
  getPokedexFacts,
  getPokemon,
  getPokemonSpecies,
  paddedId,
  randomFactIndex,
  pokemonArtwork,
  pokemonKeys,
  pokemonSprite,
  SPECIES_COUNT,
  statLabel,
  titleCase,
  typeVars,
  type Pokemon,
  type PokemonSpecies,
} from '../lib/pokeapi/client'
import { usePageTitle } from '../lib/usePageTitle'
import {
  AbilitiesSection,
  EncounterSection,
  EvolutionSection,
  FormsSection,
  HeldItemsSection,
  LearnsetSection,
} from './PokemonSections'

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'stats', label: 'Stats' },
  { id: 'moves', label: 'Moves' },
  { id: 'where', label: 'Where' },
] as const
type TabId = (typeof TABS)[number]['id']

/** Tints the status bar to match the hero on platforms that honor theme-color. */
function useThemeColorFrom(element: React.RefObject<HTMLElement | null>, typeName?: string) {
  useEffect(() => {
    if (!typeName || !element.current) return
    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')]
    const originals = metas.map((meta) => meta.content)
    const color = getComputedStyle(element.current).backgroundColor
    metas.forEach((meta) => {
      meta.content = color
    })
    return () => {
      metas.forEach((meta, index) => {
        meta.content = originals[index]
      })
    }
  }, [element, typeName])
}

/** True until the sheet has slid up past the Pokémon's name. The pinned hero itself never moves. */
function useIsAboveLine(element: React.RefObject<HTMLElement | null>, active: boolean) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (!active || !element.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.boundingClientRect.top > (entry.rootBounds?.top ?? 0)),
      { rootMargin: '-112px 0px 0px' },
    )
    observer.observe(element.current)
    return () => observer.disconnect()
  }, [element, active])
  return visible
}

export function PokemonDetailPage() {
  const { name = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab: TabId = TABS.some((item) => item.id === requestedTab)
    ? (requestedTab as TabId)
    : 'about'
  const hero = useRef<HTMLElement>(null)
  const sheetEdge = useRef<HTMLDivElement>(null)

  const pokemon = useQuery({
    queryKey: pokemonKeys.detail(name),
    queryFn: ({ signal }) => getPokemon(name, signal),
    enabled: Boolean(name),
    staleTime: 1000 * 60 * 60 * 12,
  })
  const data = pokemon.data
  // Forms such as charizard-mega-x have no species record of their own.
  const speciesName = data?.species?.name
  const species = useQuery({
    queryKey: pokemonKeys.species(speciesName ?? ''),
    queryFn: ({ signal }) => getPokemonSpecies(speciesName!, signal),
    enabled: Boolean(speciesName),
    staleTime: 1000 * 60 * 60 * 24,
  })

  const headingVisible = useIsAboveLine(sheetEdge, Boolean(data))
  useThemeColorFrom(hero, data?.types[0]?.type.name)
  usePageTitle(data ? titleCase(data.name) : 'Pokémon')
  useEffect(() => {
    if (data) rememberRecentPokemon(data)
  }, [data])

  if (pokemon.isLoading)
    return (
      <main className="page">
        <TopBar title="" back="/pokedex" />
        <LoadingState label="Loading Pokémon" />
      </main>
    )
  if (!data)
    return (
      <main className="page">
        <TopBar title="Pokémon" back="/pokedex" />
        <ErrorState
          message={friendlyError(pokemon.error, 'This Pokémon')}
          onRetry={() => void pokemon.refetch()}
        />
      </main>
    )

  const label = titleCase(data.name)
  // Alternate forms use ids above 10000 and sit outside the numbered Pokédex.
  const isNumbered = data.id <= SPECIES_COUNT
  const search = tab === 'about' ? '' : `?tab=${tab}`
  const genus = species.data?.genera?.find((entry) => entry.language.name === 'en')?.genus

  return (
    <main className="page detail" style={typeVars(data.types[0]?.type.name)}>
      <TopBar
        className="hero-plate"
        title={label}
        titleAs="div"
        titleHidden={headingVisible}
        back="/pokedex"
      />
      <section className="detail-hero hero-plate" ref={hero}>
        <div className="detail-identity">
          <div className="detail-names">
            <h1>
              {label}
              <span className="title-dot" aria-hidden="true">
                .
              </span>
            </h1>
            {genus && <p>{genus}</p>}
          </div>
          <span className="detail-number">{paddedId(data.id)}</span>
        </div>
        <div className="detail-actions">
          <div className="type-row">
            {data.types.map(({ type }) => (
              <TypeBadge key={type.name} type={type.name} link />
            ))}
          </div>
          <SavePokemonButton name={data.name} />
        </div>
        <div className="detail-stage">
          {isNumbered && data.id > 1 ? (
            <Link
              className="icon-button detail-step"
              to={`/pokemon/${data.id - 1}${search}`}
              replace
              aria-label="Previous Pokémon"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </Link>
          ) : (
            <span className="detail-step-spacer" />
          )}
          <HaloArt
            className="detail-art"
            src={pokemonArtwork(data)}
            fallbackSrc={pokemonSprite(data.id)}
            alt={`${label} official artwork`}
          />
          {isNumbered && data.id < SPECIES_COUNT ? (
            <Link
              className="icon-button detail-step"
              to={`/pokemon/${data.id + 1}${search}`}
              replace
              aria-label="Next Pokémon"
            >
              <ChevronRight size={24} aria-hidden="true" />
            </Link>
          ) : (
            <span className="detail-step-spacer" />
          )}
        </div>
      </section>

      <div ref={sheetEdge} aria-hidden="true" />
      <div className="detail-sheet">
        <div className="segmented-wrap">
          <div className="segmented" role="tablist" aria-label={`${label} details`}>
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`tab-${item.id}`}
                aria-selected={tab === item.id}
                aria-controls="detail-panel"
                onClick={() =>
                  setSearchParams(item.id === 'about' ? {} : { tab: item.id }, {
                    replace: true,
                    preventScrollReset: true,
                  })
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className="page-body detail-panel"
          role="tabpanel"
          id="detail-panel"
          aria-labelledby={`tab-${tab}`}
        >
          {tab === 'about' && (
            <AboutTab
              data={data}
              species={species.data}
              speciesFailed={species.isError}
              factKey={`${speciesName}-${species.dataUpdatedAt}`}
              onRetry={() => void species.refetch()}
            />
          )}
          {tab === 'stats' && <StatsTab data={data} />}
          {tab === 'moves' && <LearnsetSection moves={data.moves ?? []} />}
          {tab === 'where' && (
            <>
              <EncounterSection pokemonId={data.id} label={label} />
              <HeldItemsSection items={data.held_items ?? []} />
            </>
          )}
        </div>
      </div>
    </main>
  )
}

/** A random Pokédex entry each time the page opens or the data refetches. */
function FactCard({ species }: { species: PokemonSpecies }) {
  const facts = useMemo(() => getPokedexFacts(species), [species])
  const [index, setIndex] = useState(() => randomFactIndex(facts.length))
  const fact = facts[index]
  if (!fact) return null
  return (
    <div className="card fact-card">
      <p aria-live="polite">{fact.text}</p>
      <div className="fact-card-footer">
        <span>{fact.game ? `Pokémon ${titleCase(fact.game)}` : ''}</span>
        {facts.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex((value) => randomFactIndex(facts.length, value))}
          >
            <Shuffle size={16} aria-hidden="true" />
            Another fact
          </button>
        )}
      </div>
    </div>
  )
}

function AboutTab({
  data,
  species,
  speciesFailed,
  factKey,
  onRetry,
}: {
  data: Pokemon
  species?: PokemonSpecies
  speciesFailed: boolean
  factKey: string
  onRetry: () => void
}) {
  const status = species?.is_legendary
    ? 'Legendary'
    : species?.is_mythical
      ? 'Mythical'
      : species?.is_baby
        ? 'Baby'
        : null
  return (
    <>
      {species && <FactCard key={factKey} species={species} />}
      {speciesFailed && <ErrorState message="Species details could not load." onRetry={onRetry} />}
      <dl className="facts">
        <Fact label="Height">{(data.height / 10).toFixed(1)} m</Fact>
        <Fact label="Weight">{(data.weight / 10).toFixed(1)} kg</Fact>
        {species?.generation && (
          <Fact label="Generation">
            {species.generation.name.replace('generation-', '').toUpperCase()}
          </Fact>
        )}
        {species?.habitat && <Fact label="Habitat">{titleCase(species.habitat.name)}</Fact>}
        {data.base_experience != null && <Fact label="Base XP">{data.base_experience}</Fact>}
        {status && <Fact label="Status">{status}</Fact>}
      </dl>
      <AbilitiesSection abilities={data.abilities} />
      {species && <EvolutionSection species={species} />}
      {species && <FormsSection species={species} currentName={data.name} />}
    </>
  )
}

function StatsTab({ data }: { data: Pokemon }) {
  const total = data.stats.reduce((sum, stat) => sum + stat.base_stat, 0)
  return (
    <>
      <section className="section" aria-labelledby="stats-heading">
        <h2 className="section-title" id="stats-heading">
          Base stats
        </h2>
        <div className="card stat-list">
          {data.stats.map((stat) => (
            <div className="stat-row" key={stat.stat.name}>
              <span>{statLabel(stat.stat.name)}</span>
              <b>{stat.base_stat}</b>
              <div className="stat-track" aria-hidden="true">
                <i style={{ transform: `scaleX(${Math.min(stat.base_stat / 255, 1)})` }} />
              </div>
            </div>
          ))}
          <div className="stat-row stat-row-total">
            <span>Total</span>
            <b>{total}</b>
          </div>
        </div>
        <Link
          className="button button-secondary button-block"
          to={`/tools/compare?add=${data.name}`}
        >
          <ArrowLeftRight size={18} aria-hidden="true" />
          Compare with others
        </Link>
      </section>
      <section className="section" aria-labelledby="matchups-heading">
        <h2 className="section-title" id="matchups-heading">
          Type matchups
        </h2>
        <MatchupList types={data.types.map(({ type }) => type.name)} />
      </section>
    </>
  )
}
