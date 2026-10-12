import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/common/AppShell'
import { HomePage } from '../pages/HomePage'
import { PokedexPage } from '../pages/PokedexPage'
import { PokemonDetailPage } from '../pages/PokemonDetailPage'
import { ComingSoonPage } from '../pages/ComingSoonPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { TypeChartPage } from '../pages/TypeChartPage'
import { MyPokemonPage } from '../pages/MyPokemonPage'
import { ReferenceDetailRoute, ReferenceRoute } from '../pages/ReferenceLibraryPage'
import { GlobalSearchPage } from '../pages/GlobalSearchPage'
import { ItemDetailPage } from '../pages/ItemDetailPage'
import { PokemonComparePage } from '../pages/PokemonComparePage'
import { ToolsPage } from '../pages/ToolsPage'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <NotFoundPage />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/pokedex', element: <PokedexPage /> },
      { path: '/pokemon/:name', element: <PokemonDetailPage /> },
      { path: '/tools', element: <ToolsPage /> },
      { path: '/tools/type-effectiveness', element: <TypeChartPage /> },
      { path: '/tools/compare', element: <PokemonComparePage /> },
      { path: '/compare', element: <Navigate to="/tools/compare" replace /> },
      { path: '/my-pokemon', element: <MyPokemonPage /> },
      { path: '/search', element: <GlobalSearchPage /> },
      { path: '/moves', element: <ReferenceRoute kind="moves" /> },
      { path: '/moves/:name', element: <ReferenceDetailRoute kind="moves" /> },
      { path: '/abilities', element: <ReferenceRoute kind="abilities" /> },
      { path: '/abilities/:name', element: <ReferenceDetailRoute kind="abilities" /> },
      { path: '/items', element: <ReferenceRoute kind="items" /> },
      { path: '/items/:name', element: <ItemDetailPage /> },
      { path: '/item', element: <Navigate to="/items" replace /> },
      { path: '/item/:name', element: <ItemDetailPage /> },
      { path: '/types', element: <ReferenceRoute kind="types" /> },
      { path: '/types/:name', element: <ReferenceDetailRoute kind="types" /> },
      { path: '/:category', element: <ComingSoonPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
