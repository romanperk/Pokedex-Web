import { Link } from 'react-router-dom'
import { TopBar } from '../components/common/TopBar'
import { EmptyState } from '../components/ui'
import { usePageTitle } from '../lib/usePageTitle'

export function NotFoundPage() {
  usePageTitle('Not found')
  return (
    <main className="page">
      <TopBar title="Not found" back="/" />
      <EmptyState
        title="This page doesn’t exist"
        action={
          <Link className="button button-primary" to="/">
            Go to Discover
          </Link>
        }
      />
    </main>
  )
}

export function RouteErrorPage() {
  return (
    <main className="page">
      <EmptyState
        title="Something went wrong"
        action={
          <button
            type="button"
            className="button button-primary"
            onClick={() => window.location.assign('/')}
          >
            Reload the app
          </button>
        }
      >
        Your collection is safe on this device.
      </EmptyState>
    </main>
  )
}
