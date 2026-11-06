# Pokédex Web

Client-side React and TypeScript app built with Vite. Data comes from PokéAPI, and the personal collection is stored in browser local storage.

## Conventions

- Put domain-specific behavior in `src/features/` and reuse shared UI from `src/components/ui/` rather than duplicating controls.
- Keep styles that belong to one page or component beside it.
- Use short, imperative commit subjects that describe one change.

## Before Pushing

Run these and make sure they all pass. Fix any failures rather than pushing past them:

- `npm run lint`
- `npm run format:check`
- `npm run build`

There are no automated tests, so also check affected flows in the running app. Service worker changes only take effect in a production build (`npm run build`, then `npm run preview`), because the dev server unregisters the service worker.

## Pushing

This is a solo project, so push straight to `main`. No feature branch or pull request is needed.

Always ask before pushing and wait for a clear yes. Approval covers only that push, not later ones.
