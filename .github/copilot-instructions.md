````markdown
# Copilot instructions — osu-find-songs

This repository is a Next.js 15 full-stack app (App Router) that connects osu! beatmaps with Spotify. Keep changes small and focused — big data/async flows are common and easy to break.

## Big picture (where to look first)
- UI pages live in `app/from-osu/` and `app/from-spotify/` (page.tsx + `_components/`). Shared components are in `components/` and page helpers are in `_utils/`.
- Server API wrappers are in `lib/` (e.g., `lib/Spotify.ts`, `lib/osu.ts`) — these implement token caching, retry logic and must run server-side.
- Server endpoints (batching) are `app/api/batch/*` — these dedupe inputs, chunk requests and call `lib/` wrappers, returning simplified shapes.
- Constants & thresholds are in `variables.ts` (FO_CHUNK_SIZE, FS_CHUNK_SIZE, MAPS_AMOUNT_TO_SHOW_VIRTUALIZED).

## Key patterns and architectural notes
- Client/server split: page files (and most UI components) use `'use client'`. `lib/` files use `'use server'` — never call external APIs from client components; use batch endpoints.
- Batching: Use `utils/chunkArray()` and API batch routes. Keep batch sizes consistent with `variables.ts`. Deduplication uses `hash` or `id` keys.
- Token management: Implement server token caching and refresh with a singleton promise pattern — see `lib/osu.ts` and `lib/Spotify.ts`. Respect 429/Too Many Attempts and retry timings.
- Search strategy: Spotify searches use `getOptimizedSearchQuery()` and progressive fallback steps (`utils/spotifySearchConditions.ts`). Search helper functions are the main place to tune matching.
- Virtualization: Lists with >45 items use `react-virtuoso`. Provide a fixed height scroll container and ensure parent `overflow-y: auto` for virtualization to work.

## How to add or change an integration
1. Add a server-side wrapper in `lib/` following the token + retry pattern.
2. Add a `app/api/batch/<integration>/route.tsx` endpoint that:
   - Validates input, limits batch size, dedupes items
   - Calls the `lib/` wrapper with Promise.allSettled
   - Simplifies and returns limited JSON fields for the client
3. Update `variables.ts` if chunk sizes or virtualization thresholds need changes.
4. Use `useQueries` or `useInfiniteQuery` in client pages to fetch batches.

## Developer workflows & scripts
- Run locally (Dev): `npm run dev` (Next.js with Turbopack)
- Build/Prod: `npm run build` then `npm run start`. The build triggers `postbuild` to upload source maps using `upload-sourcemaps.js`.
- Lint: `npm run lint`.
- Tests (sparse): `npm run test` (Jest) — there are few/no automated tests currently.

## Important files to check for changes
- `app/from-osu/*` and `app/from-spotify/*` — page logic & state
- `app/api/batch/*` — batching, dedupe and simplified responses
- `lib/*` — token handling, central API wrappers, and retry logic
- `utils/*` — chunking (`chunkArray`), array helpers, and search conditions
- `variables.ts` — chunk sizes & virtualization thresholds
- `upload-sourcemaps.js` — build post-processing

## Environment variables and integrations
- OSU API: `OSU_CLIENT`, `OSU_SECRET`
- Spotify: `AUTH_SPOTIFY_ID`, `AUTH_SPOTIFY_SECRET`, `SPOTIFY_REFRESH_TOKEN`, `SPOTIFY_CLIENT`, `SPOTIFY_SECRET` (different routes use minor variations — search repo for exact names)
- NextAuth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Highlight / Sourcemaps: `HIGHLIGHT_API_KEY`, `HIGHLIGHT_APP_NAME`, `VERCEL_GIT_COMMIT_SHA`

## Conventions & gotchas for code edits
- Use `chunkArray()` for batched or parallel work; batch endpoints expect `songs` arrays of limited size (50 for spotify batch).
- Avoid fetching third-party APIs directly from components — use `lib/` + API routes.
- Token refresh is handled server-side. When adding new token flows, keep `cookie` vs `client` token usage in mind.
- Be careful with `react-virtuoso` and dynamic heights — tests should include large lists to reproduce behavior.
- If changing user OAuth flows: check `auth.ts`, `app/api/auth/spotify` and `revalidate-spotify-token` endpoints for cookie setting semantics.

## Quick examples
- Add a batch API: `app/api/batch/<name>/route.tsx` → call `lib/<Name>.ts` functions and return a simplified JSON.
- Add a new search condition: modify `utils/spotifySearchConditions.ts` and test in `lib/Spotify.ts` by calling `searchSongWithConditions()`.

---
If you need more detail or want me to expand any section (e.g., a step-by-step PR template or automation for CI), tell me which parts you prefer deeper coverage.
````
