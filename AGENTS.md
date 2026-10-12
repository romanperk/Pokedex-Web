# Repository Guidelines

## Project Structure & Module Organization

This is a client-side React and TypeScript app built with Vite. Application startup and routing live in `src/main.tsx`, `src/App.tsx`, and `src/app/`. Route-level screens are in `src/pages/`; reusable UI and shell components are in `src/components/`; domain-specific behavior belongs in `src/features/`; shared API and browser helpers live in `src/lib/`. Keep styles beside their page or component when they are specific, and put shared styles in `src/styles/` or `src/base.css`. Static files served as-is belong in `public/`; bundled images and other imports belong in `src/assets/`. `docs/` contains project documentation. There is no dedicated test directory currently.

## Build, Test, and Development Commands

- `npm install` installs dependencies.
- `npm run dev` starts the Vite development server.
- `npm run build` runs TypeScript project checks and creates the production app in `dist/`.
- `npm run preview` serves the production build locally.
- `npm run lint` runs Oxlint on `src/` and `vite.config.ts`.
- `npm run format:check` checks Prettier formatting; `npm run format` applies it.

There is no configured automated test command. Run the build and lint checks before submitting changes; manually verify affected flows in the dev server.

## Coding Style & Naming Conventions

Use TypeScript for application code and functional React components. Follow the repository Prettier settings: two spaces, no semicolons, single quotes, and trailing commas where valid. Use PascalCase for React component/page files (for example, `PokemonDetailPage.tsx`), camelCase for hooks and utilities (for example, `usePokemonPages.ts`), and keep page-specific styles adjacent. Follow existing feature boundaries and reuse shared UI from `src/components/ui/` rather than duplicating controls.

## Testing Guidelines

No test framework, test files, or coverage requirement is configured. If adding tests, place them alongside the relevant feature or in a clearly named test directory and document the command needed to run them. Until then, validate behavior manually and run `npm run build` and `npm run lint`.

## Commit & Pull Request Guidelines

Git history currently contains only `Initial commit`, so no established commit convention can be inferred. Use short, imperative commit subjects that describe one change (for example, `Add type filter to Pokédex`). Pull requests should summarize user-visible changes, note relevant routes or behavior, link an issue when one exists, and include screenshots for visual changes. Mention build/lint results and any known limitations.

## Configuration & Data

PokéAPI provides read-only reference data and requires network access for uncached requests. The personal collection is stored in browser local storage; do not add credentials or user data to the repository. Keep generated output such as `dist/` and installed dependencies out of commits.
