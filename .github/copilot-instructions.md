# Copilot Instructions for nordencult

## Project snapshot
- This repository is a minimal React 19 + TypeScript + Vite app.
- Current UI is template-level and centered in a single top-level component: `src/App.tsx`.
- Entrypoint flow is `src/main.tsx` → `src/App.tsx` with global styles in `src/index.css` and component styles in `src/App.css`.

## Architecture and boundaries
- Keep app runtime code inside `src/`.
- Keep Vite/Node tooling code in root config files (`vite.config.ts`, `eslint.config.js`, `tsconfig*.json`).
- `tsconfig.json` uses project references:
  - `tsconfig.app.json` for browser/app code (`include: ["src"]`)
  - `tsconfig.node.json` for tooling code (`include: ["vite.config.ts"]`)
- Static assets are split by usage:
  - Bundled/imported assets in `src/assets/` (example: `src/assets/react.svg`)
  - Public root-served files in `public/` (example: `public/vite.svg`)

## Developer workflows
- Install dependencies: `npm install`
- Start dev server with HMR: `npm run dev`
- Build for production: `npm run build` (runs `tsc -b` then `vite build`)
- Lint all files: `npm run lint`
- Preview production build: `npm run preview`
- Regenerate map overlay assets/components: `npm run generate:map-overlay`
  - Input: `src/assets/map/map_overlay.svg`
  - Outputs: `src/assets/map/map_overlay_optimized.svg`, `src/map/components/MapOverlayPlaceRoute.tsx`
  - Note: `MapOverlayPlaceRoute.tsx` is a generated file; update source SVG and re-run instead of manual editing.

## Code and style conventions observed in this repo
- Use function components and hooks (`useState` pattern in `src/App.tsx`).
- Use TypeScript with strict compiler checks enabled; avoid `any` unless unavoidable.
- TS extension imports are allowed and used (`import App from './App.tsx'` in `src/main.tsx`).
- Prefer colocated plain CSS files imported from TSX (`import './App.css'`).
- Keep root rendering wrapped in `StrictMode` (`src/main.tsx`).

## Linting and quality gates
- ESLint is flat-config based in `eslint.config.js`.
- Enabled stacks: `@eslint/js`, `typescript-eslint` recommended, `react-hooks`, `react-refresh`.
- `dist/` is globally ignored by ESLint.
- Before finishing changes, run at least `npm run lint` and, for behavior changes, `npm run build`.

## Guidance for AI coding agents
- Prefer minimal, surgical edits aligned with current template-style structure.
- Do not introduce new frameworks/state managers/router unless explicitly requested.
- If adding new UI sections, keep patterns consistent with existing CSS import structure.
- When adding files, keep names and locations predictable under `src/` and update imports from `src/main.tsx` / `src/App.tsx` as needed.
- If a change touches tooling, ensure it still matches the app/node tsconfig boundary.
