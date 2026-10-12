import { useEffect, useState } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Compass, Heart, Search, Wrench } from 'lucide-react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}
const destinations = [
  { label: 'Discover', to: '/', icon: Compass, end: true },
  { label: 'Pokédex', to: '/pokedex', icon: BookOpen },
  { label: 'Tools', to: '/tools', icon: Wrench },
  { label: 'My Pokémon', to: '/my-pokemon', icon: Heart },
]

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installMessage, setInstallMessage] = useState('')
  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', capture)
    return () => window.removeEventListener('beforeinstallprompt', capture)
  }, [])
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        navigate('/search')
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [navigate])
  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    setInstallMessage(
      (await installPrompt.userChoice).outcome === 'accepted' ? 'Install started.' : '',
    )
    setInstallPrompt(null)
  }
  const navigation = (className = '') => (
    <nav className={className} aria-label="Main navigation">
      {destinations.map(({ label, to, icon: Icon, end }) => {
        const isActive = end
          ? location.pathname === '/' ||
            /^\/(moves|abilities|items|types)(\/|$)/.test(location.pathname)
          : to === '/pokedex'
            ? location.pathname === '/pokedex' || location.pathname.startsWith('/pokemon/')
            : location.pathname === to ||
              location.pathname.startsWith(to + '/') ||
              (to === '/tools' && location.pathname === '/compare')
        return (
          <Link
            key={to}
            to={to}
            aria-current={isActive ? 'page' : undefined}
            className={isActive ? 'nav-active' : ''}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Pokédex home">
          <span className="brand-ball" aria-hidden="true">
            <i />
          </span>
          <span>
            Poké<span className="brand-red">dex</span>
          </span>
        </Link>
        {navigation()}
        <Link
          className="top-search"
          to="/search"
          aria-label="Search Pokémon and reference collections"
          title="Search Pokémon and reference collections"
        >
          <Search size={19} aria-hidden="true" />
        </Link>
      </header>
      {installPrompt && (
        <div className="install-help">
          <button type="button" onClick={() => void installApp()}>
            Install app
          </button>
          <span className="visually-hidden" role="status">
            {installMessage}
          </span>
        </div>
      )}
      <div className="route-content">
        <Outlet />
      </div>
      {navigation('mobile-nav')}
      <ScrollRestoration />
    </div>
  )
}
