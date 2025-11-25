// types/Collection.ts
export interface Collection {
  name: string
  beatmap_hashes: string[]
}

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
  beatmaps: OsuBeatmap[]
}

export interface CollectionData {
  collections: ParsedCollection[]
  totalBeatmaps: number
  unmatchedHashes: string[]
}