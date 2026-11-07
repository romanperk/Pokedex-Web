import type { ReactNode } from 'react'
import { ChevronLeft, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

type TopBarProps = {
  title: ReactNode
  /** Where the back button goes when the page was opened directly and has no history. */
  back?: string
  /** Use 'div' when the page shows its own h1, such as a Pokémon hero. */
  titleAs?: 'h1' | 'div'
  titleHidden?: boolean
  search?: boolean
  className?: string
}

export function TopBar({
  title,
  back,
  titleAs: Title = 'h1',
  titleHidden = false,
  search = true,
  className = '',
}: TopBarProps) {
  const navigate = useNavigate()
  function goBack() {
    // React Router numbers history entries; replacing the URL keeps the number, unlike location.key.
    if (window.history.state?.idx > 0) navigate(-1)
    else if (back) navigate(back, { replace: true })
  }
  return (
    <header className={`topbar ${back ? '' : 'topbar-root'} ${className}`}>
      {back && (
        <button type="button" className="icon-button" aria-label="Back" onClick={goBack}>
          <ChevronLeft size={24} aria-hidden="true" />
        </button>
      )}
      <Title className={`topbar-title ${titleHidden ? 'topbar-title-hidden' : ''}`}>{title}</Title>
      {search && (
        <Link className="icon-button" to="/search" aria-label="Search">
          <Search size={20} aria-hidden="true" />
        </Link>
      )}
    </header>
  )
}
