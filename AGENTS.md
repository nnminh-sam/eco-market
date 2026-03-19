# Repository Guidelines

## Project Structure & Module Organization
This is a Vite + React (TypeScript/TSX) frontend project.

- `src/app/App.tsx` wires app-level providers and routing.
- `src/app/routes.tsx` defines route paths and page mapping.
- `src/app/pages/` contains screen-level pages (e.g., `Home.tsx`, `ProductDetail.tsx`).
- `src/app/components/` contains reusable UI; `src/app/components/ui/` holds design-system primitives.
- `src/app/context/` stores React context providers.
- `src/app/data/` and `src/app/types/` contain mock data and shared types.
- `src/styles/` contains global, theme, and Tailwind CSS layers.

## Build, Test, and Development Commands
- `pnpm install` — install dependencies.
- `pnpm exec vite` — run the local dev server.
- `pnpm build` — create a production build in `dist/`.
- `pnpm exec vite preview` — preview the production build locally.

If `pnpm` is unavailable, equivalent `npm` commands may be used (`npm install`, `npx vite`, `npm run build`).

## Coding Style & Naming Conventions
- Use 2-space indentation, semicolons, and double quotes (match existing TSX files).
- Use PascalCase for React components and page filenames (`MyListings.tsx`).
- Use camelCase for utilities, variables, and non-component modules.
- Keep route definitions centralized in `src/app/routes.tsx`.
- Prefer composing from `components/ui` primitives before creating one-off UI patterns.

## Testing Guidelines
No automated test suite is currently configured in this workspace.

- For UI changes, manually verify core flows: home, product detail, login, post ad, messages, and listings.
- When adding tests, place `*.test.tsx` files beside the component/page under test.
- Prioritize behavior-focused tests for routing, context logic, and critical interactions.

## Commit & Pull Request Guidelines
Git history is not available in this workspace snapshot, so use a consistent convention:

- Follow Conventional Commits (e.g., `feat: add post-ad validation`, `fix: handle missing product id`).
- Keep commits focused and small; avoid mixing refactors with feature work.
- PRs should include: summary, affected routes/components, manual test steps, and screenshots for UI changes.
- Link related issue/task IDs when available.

## Security & Configuration Tips
- Do not commit secrets; use Vite environment variables with the `VITE_` prefix.
- Validate and sanitize external/user-provided data before rendering.
