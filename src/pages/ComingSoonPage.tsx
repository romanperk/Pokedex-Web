import { Link, useParams } from 'react-router-dom'
import { ActionLink, ArrowRight, Compass } from '../components/ui'
import { useEffect } from 'react'

const names: Record<string, string> = {
  places: 'Places',
  moves: 'Moves',
  abilities: 'Abilities',
  items: 'Items',
  berries: 'Berries',
}
export function ComingSoonPage() {
  const { category = '' } = useParams()
  const title = names[category.toLowerCase()]
  useEffect(() => {
    document.title = title ? `${title} — Coming soon | Pokédex` : 'Not found | Pokédex'
  }, [title])
  if (!title)
    return (
      <main className="coming-soon page-width">
        <div className="coming-card">
          <h1>Page not found</h1>
          <ActionLink to="/">
            Return home <ArrowRight size={15} />
          </ActionLink>
        </div>
      </main>
    )
  return (
    <main className="coming-soon page-width">
      <div className="crumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <b>{title}</b>
      </div>
      <div className="coming-card">
        <span className="coming-icon">
          <Compass size={25} />
        </span>
        <div className="eyebrow">MORE TO EXPLORE</div>
        <p className="coming-label">COMING SOON</p>
        <h1>
          {title}
          <span>.</span>
        </h1>
        <p>
          This collection is being prepared. In the meantime, discover every Pokémon in the Pokédex.
        </p>
        <ActionLink to="/pokedex">
          Open Pokédex <span>→</span>
        </ActionLink>
      </div>
    </main>
  )
}
