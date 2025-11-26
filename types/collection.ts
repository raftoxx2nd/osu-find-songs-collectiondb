// types/Collection.ts
export interface Collection {
  name: string
  beatmap_hashes: string[]
}

import { LocalBeatmap } from './types'

export interface OsuBeatmap {
  artist: string | null
  artist_unicode: string | null
  title: string | null
  title_unicode: string | null
  creator: string | null
  difficulty_name: string | null
  hash: string | null
  beatmapset_id: number
  beatmap_id: number
  status: number
  file_name: string | null
  total_length: number
}

export interface ParsedCollection extends Collection {
  beatmapCount: number
  // parsed beatmaps include DB metadata; during refactor we prefer LocalBeatmap which
  // contains both canonical fields and UI-friendly compatibility fields
  beatmaps: LocalBeatmap[]
}

export interface CollectionData {
  collections: ParsedCollection[]
  totalBeatmaps: number
  unmatchedHashes: string[]
  // deduplicated list of all unique beatmapsets parsed from osu!.db
  allSongs?: LocalBeatmap[]
}