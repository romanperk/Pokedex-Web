import { useEffect } from 'react'
import { ArrowLeftRight, Calculator } from 'lucide-react'
import { Link } from 'react-router-dom'

const availableTools = [
  {
    title: 'Type effectiveness',
    description:
      'Check how attacking types work against one or two defending types, including combined weaknesses and immunities.',
    to: '/tools/type-effectiveness',
    icon: Calculator,
    label: 'TYPE MATCHUPS',
  },
  {
    title: 'Compare Pokémon',
    description: 'Compare types, abilities, and base stats for up to three Pokémon side by side.',
    to: '/tools/compare',
    icon: ArrowLeftRight,
    label: 'SIDE-BY-SIDE',
  },
]

export function ToolsPage() {
  useEffect(() => {
    document.title = 'Tools | Pokédex'
    return () => {
      document.title = 'Pokédex — Discover Pokémon'
    }
  }, [])
  return (
    <main className="page-width utility-page tools-directory">
      <div className="crumb">
        <Link to="/">Discover</Link>
        <span>/</span>
        <b>Tools</b>
      </div>
      <header className="utility-heading">
        <div className="eyebrow">DISCOVER / UTILITIES</div>
        <h1>
          Tools<span>.</span>
        </h1>
        <p>Choose a tool for the question you want to answer.</p>
      </header>
      <section aria-labelledby="available-tools-heading">
        <div className="tools-directory-heading">
          <h2 id="available-tools-heading">Available tools</h2>
          <span>{availableTools.length}</span>
        </div>
        <div className="tool-directory-grid">
          {availableTools.map(({ title, description, to, icon: Icon, label }) => (
            <Link className="tool-directory-card" key={to} to={to}>
              <span className="tool-directory-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="tool-directory-label">{label}</span>
              <strong>{title}</strong>
              <span className="tool-directory-description">{description}</span>
              <span className="tool-directory-open">
                Open tool <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
