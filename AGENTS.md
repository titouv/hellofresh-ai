# Repository Guidelines

## Project Structure & Module Organization
This is a Next.js (App Router) TypeScript app.
- `src/app`: routes, layouts, and API handlers (e.g., `src/app/api/ephemeral-token/route.ts`).
- `src/components`, `src/contexts`, `src/hooks`, `src/lib`: UI pieces, state, hooks, and shared utilities.
- `public`: static assets served as-is.
- Root scripts and utilities: `scrape.ts`, `recipe_types.ts`, and `scripts/scrape-recipes.ts`.

## Build, Test, and Development Commands
Use the npm scripts in `package.json`:
- `npm run dev`: start the local dev server (Turbopack) at `http://localhost:3000`.
- `npm run build`: production build.
- `npm run start`: run the built app.
- `npm run lint`: ESLint via Next.js.

## Coding Style & Naming Conventions
- Language: TypeScript/React; Tailwind CSS for styling (`src/app/globals.css`).
- Indentation: 2 spaces in TS/TSX and JSON (match existing files).
- Naming: `camelCase` for variables/functions, `PascalCase` for components, `kebab-case` for route segments.
- Prefer small, focused modules in `src/lib` and feature hooks in `src/hooks`.

## Testing Guidelines
There is no configured automated test runner in this repo.
- If you add tests, document the framework and script in `package.json`.
- Place tests alongside features (e.g., `src/lib/foo.test.ts`) or in a dedicated `tests/` folder, but stay consistent.

## Commit & Pull Request Guidelines
Recent commit history uses short, lowercase, imperative messages (e.g., “fixes ios safari”, “small fixes”).
- Keep commits concise and scoped.
- For PRs: include a clear description, any relevant issue links, and screenshots for UI changes.

## Security & Configuration Tips
- Keep environment secrets out of git. Use `.env.local` for local configuration.
- API routes live under `src/app/api`; validate inputs before hitting external services.
