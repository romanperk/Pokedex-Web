# Pokédex Web

Client-side React and TypeScript app built with Vite. Data comes from PokéAPI, and the personal collection is stored in browser local storage.

## Conventions

- Put domain-specific behavior in `src/features/` and reuse shared UI from `src/components/ui/` rather than duplicating controls.
- Keep styles that belong to one page or component beside it.
- Use short, imperative commit subjects that describe one change.

## Data and Offline

- Lists show Pokémon from `usePokemonSummaries`, which builds name, number and types from the 18 type lists. Use `usePokemonDetails` only for a few Pokémon at a time, because a full record is about 300 KB unpacked and the service worker keeps only 300 API responses.
- Match search input with `matchResources` or `normalizeSearchTerm` from `src/features/pokedex/matchResources.ts`, so names like "Mr. Mime" and "Farfetch'd" keep working.
- Queries use `networkMode: 'always'` so requests still reach the service worker when offline. To test offline, cut the service worker's network as well as the page's, because page-level emulation in Chrome doesn't cover the service worker's own requests.
- The collection in `src/features/collection/savedPokemon.ts` can't be downloaded again, so add a test in `savedPokemon.test.ts` when changing its format, import or saving.

## Before Pushing

Run these and make sure they all pass. Fix any failures rather than pushing past them:

- `npm run lint`
- `npm run format:check`
- `npm run build`
- `npm test`

The tests only cover the saved collection, so also check affected flows in the running app. Service worker changes only take effect in a production build (`npm run build`, then `npm run preview`), because the dev server unregisters the service worker.

## Pushing

This is a solo project, so push straight to `main`. No feature branch or pull request is needed.

Always ask before pushing and wait for a clear yes. Approval covers only that push, not later ones.
