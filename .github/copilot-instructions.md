# Copilot Instructions for osu-find-songs

## Project Overview
A Next.js 15 app connecting **osu!** beatmaps with **Spotify**. Two main workflows:
1. **from-osu**: Scan `.osu` files → match songs on Spotify/YouTube → generate playlists
2. **from-spotify**: Import Spotify playlist → find osu! beatmaps → download them

Built with Next.js (App Router), TypeScript, TanStack Query, Tailwind, Zustand stores.

## Architecture & Data Flow

### Two-Way Integration Pattern
- **from-osu** (`app/from-osu/`): Local file scan → API batch queries → parallel Spotify/osu! API calls → result virtualization
- **from-spotify** (`app/from-spotify/[playlistId]/`): Spotify OAuth → infinite scroll playlist → osu! search → download management

### API Route Batching System
All external API calls go through batched endpoints (`app/api/batch/`):
- `batch/spotify/route.tsx`: Batches up to 50 songs, uses `searchSongWithConditions()` with fallback strategies
- `batch/osu-search/route.ts`: Batches multiple search queries with Promise.allSettled
- Batch sizes defined in `variables.ts`: `FO_CHUNK_SIZE=10`, `FS_CHUNK_SIZE=100`

### Progressive Search Conditions (lib/Spotify.ts)
Spotify matching uses **cascading fallback strategy** (`utils/spotifySearchConditions.ts`):
1. Exact match: `artist:{author} track:{title}`
2. Remove parentheses `(...)` from title
3. Remove brackets `[...]` from title  
4. Remove `feat.`/`ft.` from author
5. **Hard fallbacks**: empty author, then empty title
6. **Always applied**: Remove `(TV Size)` before search

Example: `"Artist feat. Someone - Title (TV Size)"` → tries 6+ variations before failing.

### Token Management Pattern
Both `lib/osu.ts` and `lib/Spotify.ts` use singleton token caching:
```typescript
let osuToken: string | null = null
let tokenRefreshing: Promise<string> | null = null
```
- Tokens stored in server cookies (not client-side)
- Automatic retry on 429 rate limits with `Retry-After` header
- User OAuth tokens separate from server app tokens

### State Management Layers
1. **Global Context**: `contexts/SongContext.tsx` - shares Song[] between pages (from-osu flow)
2. **Zustand Stores**: 
   - `useAudioStore.ts` - audio playback state
   - `useMapDownloadStore.ts` - download progress tracking with `pending` map
3. **TanStack Query**: All API calls, infinite queries for Spotify playlists, persistent cache

### Virtualization Strategy
- Use `react-virtuoso` when items > `MAPS_AMOUNT_TO_SHOW_VIRTUALIZED` (45)
- from-osu: Virtuoso with dynamic card heights
- from-spotify: VirtuosoCards component for beatmap results
- Reason: Lists can contain 1000+ items

## Key Development Patterns

### Error Handling (lib/errorHandlers.ts)
- All API wrappers use `axiosErrorHandler()` and `unexpectedErrorHandler()`
- Retry logic for rate limits (429) and "Too Many Attempts" errors
- Promise.allSettled for batch operations (never throw, return null on failure)

### Array Processing Utilities (utils/arrayManaging.ts)
Core functions used everywhere:
- `chunkArray<T>(arr, size)` - batch for API calls
- `filterFn(exactSpotify)` - removes results with 20 tracks (Spotify search limit = poor match)
- `searchFilterFn(search)` - client-side filter for title/author/creator
- `uniqueBeatmapsetMatrix(m)` - dedupe by beatmapset.id across nested arrays
- `flatCombinedArray(arr)` - merge parallel query results into unified structure

### Component File Organization
- Page components in `page.tsx` (200-400 lines, heavy logic)
- Page-specific components in `_components/` subdirectory
- Shared components in root `components/` directory
- Utils in `_utils/` for page-specific helpers (e.g., `sortBeatmapsMatrix`, `filterBeatmapsMatrix`)

## Critical Workflows

### Development
```bash
npm run dev          # Next.js with Turbopack
npm run build        # Production build + sourcemap upload
npm run lint         # ESLint check
```

### Adding New API Integration
1. Create wrapper in `lib/` with token management (see `lib/osu.ts` pattern)
2. Add batch route in `app/api/batch/` using Promise.allSettled
3. Update chunk size constant in `variables.ts`
4. Use TanStack Query's `useQueries()` for parallel fetching

### Environment Variables Required
```
# osu! API
OSU_CLIENT=
OSU_SECRET=

# Spotify API
AUTH_SPOTIFY_ID=
AUTH_SPOTIFY_SECRET=
SPOTIFY_REFRESH_TOKEN=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## Conventions

### Styling
- Use `twMerge as tw` for conditional Tailwind classes
- Media queries with Tailwind arbitrary variants: `[@media(max-width:1300px)]:flex-col`
- Global styles in `app/globals.css`, page-specific in `page.css`

### Type Safety
- Types in `types/` directory: `Osu.ts`, `Spotify.ts`, `types.ts`, `yt.ts`
- Use discriminated unions for loading states (see `CombinedSingle` type)
- Avoid `any` - use TODO comments if needed temporarily

### Client vs Server
- All API wrapper functions in `lib/` are `'use server'`
- Page components are `'use client'` (heavy state management)
- API routes handle batching and simplification (remove unused fields)

### Performance Optimizations
- React Compiler enabled (`experimental.reactCompiler: true`)
- List virtualization for 45+ items
- Image optimization disabled (`unoptimized: true`) - using external CDNs
- Source maps for production debugging

## Integration Points

### External APIs
- **osu! API v2**: `/beatmapsets/search`, `/beatmapsets/{id}` - requires OAuth2 client credentials
- **Spotify Web API**: Search, playlist fetch, OAuth2 authorization code flow
- **YouTube**: Scraping via `ytmusic-api` (no official API key)
- **Wikipedia**: Artist info enrichment (via `wiki.ts`)

### Authentication Flow
- NextAuth.js with Spotify provider (`auth.ts`)
- Callback at `/auth/spotify/callback`
- Tokens stored in cookies, refreshed server-side
- User can use app without login (limited to server tokens)

## Common Pitfalls

1. **Don't call APIs directly from components** - always use `lib/` wrappers with retry logic
2. **Batch size limits** - Spotify batch route enforces 50 max, osu! varies by endpoint
3. **Token scope** - User OAuth tokens needed for playlist creation, server tokens for search
4. **Beatmapset vs Beatmap** - osu! API returns beatmapsets (difficulty collections), not individual maps
5. **React 19 + Next 15** - Uses React Compiler, may have compatibility issues with older libs
6. **Virtuoso scroll** - Requires explicit height container, parent must have `overflow-y: auto`
