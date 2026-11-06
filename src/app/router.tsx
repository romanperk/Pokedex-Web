import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/common/AppShell'
import { GlobalSearchPage } from '../pages/GlobalSearchPage'
import { HomePage } from '../pages/HomePage'
import { GuessPage } from '../pages/GuessPage'
import { NotFoundPage, RouteErrorPage } from '../pages/NotFoundPage'
import { PokedexPage } from '../pages/PokedexPage'
import { PokemonComparePage } from '../pages/PokemonComparePage'
import { PokemonDetailPage } from '../pages/PokemonDetailPage'
import { ReferenceDetailRoute, ReferenceRoute } from '../pages/ReferenceLibraryPage'
import { ToolsPage } from '../pages/ToolsPage'
import { TrainerPage } from '../pages/TrainerPage'
import { TypeChartPage } from '../pages/TypeChartPage'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/pokedex', element: <PokedexPage /> },
      { path: '/pokemon/:name', element: <PokemonDetailPage /> },
      { path: '/tools', element: <ToolsPage /> },
      { path: '/tools/type-effectiveness', element: <TypeChartPage /> },
      { path: '/tools/compare', element: <PokemonComparePage /> },
      { path: '/compare', element: <Navigate to="/tools/compare" replace /> },
      { path: '/tools/guess', element: <GuessPage /> },
      { path: '/trainer', element: <TrainerPage /> },
      { path: '/my-pokemon', element: <Navigate to="/trainer" replace /> },
      { path: '/search', element: <GlobalSearchPage /> },
      { path: '/moves', element: <ReferenceRoute kind="moves" /> },
      { path: '/moves/:name', element: <ReferenceDetailRoute kind="moves" /> },
      { path: '/abilities', element: <ReferenceRoute kind="abilities" /> },
      { path: '/abilities/:name', element: <ReferenceDetailRoute kind="abilities" /> },
      { path: '/items', element: <ReferenceRoute kind="items" /> },
      { path: '/items/:name', element: <ReferenceDetailRoute kind="items" /> },
      { path: '/item', element: <Navigate to="/items" replace /> },
      { path: '/item/:name', element: <ReferenceDetailRoute kind="items" /> },
      { path: '/types', element: <ReferenceRoute kind="types" /> },
      { path: '/types/:name', element: <ReferenceDetailRoute kind="types" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
