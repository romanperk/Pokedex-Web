import { Link } from 'react-router-dom'
import { ActionLink } from '../components/ui'

export function HomePage() {
  const categories = [
    {
      name: 'Pokédex',
      icon: '◉',
      color: '#ef5350',
      subtitle: 'Search and discover Pokémon',
      route: '/pokedex',
    },
    {
      name: 'Type Chart',
      icon: '◈',
      color: '#4d9ce8',
      subtitle: 'Check type effectiveness',
      route: '/tools',
    },
    {
      name: 'My Pokémon',
      icon: '♥',
      color: '#e66d75',
      subtitle: 'Your device-local saves',
      route: '/my-pokemon',
    },
    {
      name: 'Moves',
      icon: '✦',
      color: '#4d9ce8',
      subtitle: 'Moves and battle effects',
      route: '/moves',
    },
    {
      name: 'Abilities',
      icon: '✧',
      color: '#65b86a',
      subtitle: 'Abilities and their effects',
      route: '/abilities',
    },
    {
      name: 'Items',
      icon: '⬡',
      color: '#c9a838',
      subtitle: 'Items and their uses',
      route: '/items',
    },
    {
      name: 'Types',
      icon: '◈',
      color: '#9b67c8',
      subtitle: 'Matchups, Pokémon, and moves',
      route: '/types',
    },
  ]
  return (
    <main className="home page-width">
      <section className="welcome">
        <div className="welcome-copy">
          <div className="eyebrow">
            <span /> THE WORLD OF POKÉMON
          </div>
          <h1>
            What Pokémon
            <br />
            are you <em>looking for?</em>
          </h1>
          <p>
            Explore the world of Pokémon. Find your favorites, learn about their abilities, and
            discover something new.
          </p>
          <ActionLink to="/pokedex">
            Explore Pokédex <span>→</span>
          </ActionLink>
        </div>
        <div className="hero-art">
          <div className="hero-halo" />
          <img
            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
            alt="Pikachu"
          />
          <span className="hero-spark spark-one" aria-hidden="true">
            ✦
          </span>
          <span className="hero-spark spark-two" aria-hidden="true">
            ✧
          </span>
          <div className="hero-caption">
            <span>025 / 1025</span>
            <strong>Pikachu</strong>
            <small>Electric Pokémon</small>
          </div>
        </div>
      </section>
      <section className="category-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow">START EXPLORING</div>
            <h2>Choose your adventure</h2>
          </div>
          <span className="section-note">
            A world full of discoveries <b>↗</b>
          </span>
        </div>
        <div className="category-grid">
          {categories.map((category, index) => (
            <Link
              className="category-card"
              key={category.name}
              to={category.route}
              style={{ '--card-color': category.color } as React.CSSProperties}
              aria-label={category.name}
            >
              <span className="category-index">0{index + 1}</span>
              <span className="category-icon" aria-hidden="true">
                {category.icon}
              </span>
              <span className="category-text">
                <strong>{category.name}</strong>
                <small>{category.subtitle}</small>
              </span>
              <span className="card-arrow" aria-hidden="true">
                ↗
              </span>
              <span className="category-watermark" aria-hidden="true">
                {category.icon}
              </span>
            </Link>
          ))}
        </div>
      </section>
      <footer className="footer">
        <span>Gotta catch ’em all.</span>
        <span>
          PokéAPI <i>·</i> A fan-made Pokédex
        </span>
      </footer>
    </main>
  )
}
