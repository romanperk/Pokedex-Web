import { ActionLink } from '../components/ui'

export function NotFoundPage() {
  return (
    <main className="not-found page-width">
      <h1>Page not found</h1>
      <p>We couldn’t find this page.</p>
      <ActionLink to="/">Return home</ActionLink>
    </main>
  )
}
