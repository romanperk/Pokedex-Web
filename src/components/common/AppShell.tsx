import { useEffect } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Compass, UserRound, Wrench } from 'lucide-react'
import '../../lib/theme'
import { useOnlineStatus } from '../../lib/useOnlineStatus'
import { BrandMark } from './BrandMark'

const destinations = [
  {
    label: 'Discover',
    to: '/',
    icon: Compass,
    match: /^\/((moves|abilities|items|item|types)(\/|$)|$)/,
  },
  { label: 'Pokédex', to: '/pokedex', icon: BookOpen, match: /^\/(pokedex|pokemon)(\/|$)/ },
  { label: 'Tools', to: '/tools', icon: Wrench, match: /^\/(tools|compare)(\/|$)/ },
  { label: 'Trainer', to: '/trainer', icon: UserRound, match: /^\/trainer(\/|$)/ },
]

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const isOnline = useOnlineStatus()

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

  return (
    <div className="app-shell">
      <nav className="tabbar" aria-label="Main">
        <Link className="tabbar-brand" to="/">
          <BrandMark />
          Pokédex
        </Link>
        {destinations.map(({ label, to, icon: Icon, match }) => {
          const active = match.test(location.pathname)
          return (
            <Link
              key={to}
              to={to}
              className="tabbar-item"
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={24} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="app-main">
        {!isOnline && (
          <p className="offline-bar" role="status">
            You’re offline. Showing what’s saved on this device.
          </p>
        )}
        <Outlet />
      </div>
      <ScrollRestoration />
    </div>
  )
}
