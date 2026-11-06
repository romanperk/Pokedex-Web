import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { ArrowRight, Dices, Plus, Shapes, type LucideIcon } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { TopBar } from '../components/common/TopBar'
import { PokemonSprite, TypeBadge } from '../components/ui'
import { readComparison } from '../features/pokedex/comparison'
import { readGuessBest } from '../features/pokedex/guessScore'
import { readDefendingTypes, useTypeMatchups } from '../features/types/matchups'
import { getPokemon, pokemonKeys, SPECIES_COUNT, titleCase, typeVars } from '../lib/pokeapi/client'
import { usePageTitle } from '../lib/usePageTitle'

const COMPARE_SLOTS = 3

/** A live preview of the types last checked, so the card answers something before it's opened. */
function TypeEffectivenessCard() {
  const [defenders] = useState(readDefendingTypes)
  const { byMultiplier } = useTypeMatchups(defenders)
  const weaknesses = [...(byMultiplier.get(4) ?? []), ...(byMultiplier.get(2) ?? [])]
  return (
    <Link
      className="tool-card hero-plate"
      to="/tools/type-effectiveness"
      style={typeVars(defenders[0] ?? 'water')}
    >
      <span className="tool-card-label">
        Type effectiveness
        <ArrowRight size={18} aria-hidden="true" />
      </span>
      <strong className="tool-card-title">
        {defenders.length ? defenders.map(titleCase).join(' / ') : 'Pick any type pairing'}
        <span className="title-dot">.</span>
      </strong>
      {weaknesses.length > 0 && (
        <div className="tool-card-weak">
          <span>Weak to</span>
          <div className="type-row">
            {weaknesses.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>
        </div>
      )}
    </Link>
  )
}

/** Shows the saved comparison, with open slots for what can still be added. */
function CompareCard() {
  const [selection] = useState(readComparison)
  const details = useQueries({
    queries: selection.map((name) => ({
      queryKey: pokemonKeys.detail(name),
      queryFn: ({ signal }: { signal: AbortSignal }) => getPokemon(name, signal),
      staleTime: 1000 * 60 * 60 * 12,
    })),
  })
  // Colored by the last Pokémon added, which keeps it distinct from the card above more often.
  const cardType = details.at(-1)?.data?.types[0]?.type.name
  return (
    <Link
      className="tool-card hero-plate"
      to="/tools/compare"
      style={typeVars(cardType ?? 'grass')}
    >
      <span className="tool-card-label">
        Compare Pokémon
        <ArrowRight size={18} aria-hidden="true" />
      </span>
      <strong className="tool-card-title">
        {selection.length ? selection.map(titleCase).join(' vs ') : 'Who has the better stats'}
        <span className="title-dot">.</span>
      </strong>
      <div className="tool-card-slots">
        {Array.from({ length: COMPARE_SLOTS }, (_, slot) => {
          const pokemon = details[slot]?.data
          return (
            <span className="tool-slot" key={slot}>
              {pokemon ? <PokemonSprite id={pokemon.id} /> : <Plus size={20} aria-hidden="true" />}
            </span>
          )
        })}
      </div>
    </Link>
  )
}

/** A different shadow each visit, teasing the quiz. */
function GuessCard() {
  const [teaser] = useState(() => Math.floor(Math.random() * SPECIES_COUNT) + 1)
  const [best] = useState(readGuessBest)
  return (
    <Link
      className="tool-card tool-card-guess hero-plate"
      to="/tools/guess"
      style={typeVars('psychic')}
    >
      <span className="tool-card-label">
        Guess the shadow
        <ArrowRight size={18} aria-hidden="true" />
      </span>
      <strong className="tool-card-title">
        Who’s that Pokémon<span className="title-dot">?</span>
      </strong>
      <span className="tool-card-note">
        {best ? `Best streak ${best}` : 'Name it from its shadow'}
      </span>
      <span className="tool-card-teaser" aria-hidden="true">
        <PokemonSprite id={teaser} />
      </span>
    </Link>
  )
}

function ToolTile({
  title,
  detail,
  icon: Icon,
  color,
  onClick,
  to,
}: {
  title: string
  detail: string
  icon: LucideIcon
  color: string
  onClick?: () => void
  to?: string
}) {
  const style = { '--tile-color': color } as React.CSSProperties
  const content = (
    <>
      <span className="browse-icon">
        <Icon size={20} aria-hidden="true" />
      </span>
      <strong>{title}</strong>
      <small>{detail}</small>
    </>
  )
  return to ? (
    <Link className="browse-tile" to={to} style={style}>
      {content}
    </Link>
  ) : (
    <button type="button" className="browse-tile" style={style} onClick={onClick}>
      {content}
    </button>
  )
}

export function ToolsPage() {
  usePageTitle('Tools')
  const navigate = useNavigate()
  return (
    <main className="page">
      <TopBar title="Tools" />
      <div className="page-body tools-page">
        <TypeEffectivenessCard />
        <CompareCard />
        <GuessCard />
        <div className="browse-grid">
          <ToolTile
            title="Surprise me"
            detail="Open a random Pokémon"
            icon={Dices}
            color="#c9a838"
            onClick={() => navigate(`/pokemon/${Math.floor(Math.random() * SPECIES_COUNT) + 1}`)}
          />
          <ToolTile
            title="All types"
            detail="Pokémon and moves"
            icon={Shapes}
            color="#9b67c8"
            to="/types"
          />
        </div>
      </div>
    </main>
  )
}
