import { useEffect } from 'react'

const APP_TITLE = 'Pokédex'

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_TITLE}` : APP_TITLE
    return () => {
      document.title = APP_TITLE
    }
  }, [title])
}
