import { Track, TrackFull } from './Spotify'
import { BeatmapSet } from './Osu'
import { UseQueryResult } from '@tanstack/react-query'

/**
 * Unified local beatmap type used throughout the app.
 *
 * - Keeps compatibility fields (`author` / `author_unicode`) used across the UI
 *   while favouring the canonical names (`artist` / `artist_unicode`).
 */
export type LocalBeatmap = {
   // identity
   id: number | string // beatmapset_id (or legacy string id used in UI)
   beatmap_id?: number
   // legacy field present in Osu DB objects: keeps backward compatibility
   beatmapset_id?: number
   hash?: string

   // metadata (prefer unicode, fallback to plain)
   title: string
   artist?: string
   creator?: string
   difficulty_name?: string
   title_unicode?: string | null
   artist_unicode?: string | null

   // compatibility fields (existing code expects these names)
   author: string
   author_unicode?: string | null

   // additional info
   status?: number | string
   tags?: string | null
   total_length?: number

   // legacy UI-compatible helper
   text?: string

   // UI / assets
   image?: string
}
export type SongMin = {
   title: string
   author?: string
   text?: string
}

// Keep `Song` as an alias for backwards compatibility with the rest of the codebase
export type Song = LocalBeatmap

export type SongData = {
   beatmapset?: BeatmapSet
   spotify?: TrackFull[] | null
   local: LocalBeatmap
}

export type SongDataQueried = {
   beatmapsetQuery: UseQueryResult<BeatmapSet, unknown>
   spotifyQuery: UseQueryResult<TrackFull[] | null, unknown>
   local: Song
}
export type CombinedQueried = {
   local: LocalBeatmap[]
   spotifyQuery: UseQueryResult<(Track[] | null)[], Error>
   osuQuery: UseQueryResult<BeatmapSet[] | null, Error>
}
export type Combined = {
   local: LocalBeatmap[]
   spotify: Track[][]
   osu: BeatmapSet[]
}

// TODO розібратися
type WithLoading<T, LoadingKey extends string, DataKey extends string> =
   | ({ [K in LoadingKey]: false } & { [K in DataKey]: T })
   | ({ [K in LoadingKey]: true } & { [K in DataKey]: undefined })

// add error field
export type CombinedSingle = { local: LocalBeatmap; error?: string } & WithLoading<BeatmapSet, 'isOsuLoading', 'osu'> &
   WithLoading<Track[], 'isSpotifyLoading', 'spotify'>
// TODO fix types
export type CombinedSingleSimple = {
   local: LocalBeatmap
   spotify?: Track[] | null
   osu?: BeatmapSet | null
   isSpotifyLoading: boolean
   isOsuLoading: boolean
   error?: string
}
// export type SongDataQueried = {
//    local: Song[]
//    spotifyQuery: UseQueryResult<Track[][], Error>
//    osuQuery: UseQueryResult<BeatmapSet[], Error>
// }
