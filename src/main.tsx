import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './base.css'
import './styles/shared.css'
import './components/common/AppShell.css'
import './pages/HomePage.css'
import './pages/PokedexPage.css'
import './pages/PokemonDetailPage.css'
import './pages/ComingSoonPage.css'
import './pages/ProductAreas.css'
import './pages/ReferenceLibrary.css'
import './pages/GlobalSearchPage.css'
import './pages/PokemonContextSections.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
