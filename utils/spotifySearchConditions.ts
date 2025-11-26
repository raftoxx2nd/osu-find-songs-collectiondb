import { LocalBeatmap as Song } from '@/types/types'

/**
 * Clean input strings for matching/search.
 * Removes common noise like (TV Size), [Difficulty], feat/ft suffixes and normalizes whitespace.
 */
export function cleanString(input: string | null | undefined): string {
   if (!input) return ''
   return String(input)
      .replace(/\(TV Size\)/gi, '')
      .replace(/\(Short Ver\.\)/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\s*feat\.?\s.*$/i, '')
      .replace(/\s*ft\.?\s.*$/i, '')
      .trim()
      .replace(/\s+/g, ' ')
}

/**
 * Normalize a Song object for searching — keep both author/artist in sync
 */
export function normalizeSongForSearch(song: Song): Song {
   const title_unicode = song.title_unicode ?? song.title ?? null
   const title = song.title ?? (song.title_unicode ?? '')
   const artist_unicode = song.artist_unicode ?? song.author_unicode ?? null
   const artist = song.artist ?? song.author ?? ''

   return {
      ...song,
      title: cleanString(title),
      title_unicode: title_unicode ? cleanString(title_unicode) : null,
      artist: cleanString(artist),
      artist_unicode: artist_unicode ? cleanString(artist_unicode) : null,
      author: song.author ?? artist,
      author_unicode: song.author_unicode ?? artist_unicode ?? null,
   }
}

/**
 * Build a single optimized Spotify search query.
 * Prioritize unicode fields when available, fallback to plain fields.
 */
export function getOptimizedSearchQuery(song: Song): string | null {
   const normalized = normalizeSongForSearch(song)
   const rawArtist = normalized.artist_unicode || normalized.artist || normalized.author_unicode || normalized.author
   const rawTitle = normalized.title_unicode || normalized.title

   if (!rawArtist || !rawTitle) return null

   const artist = cleanString(rawArtist)
   const title = cleanString(rawTitle)

   if (!artist || !title) return null

   // Use Spotify field filters for precise matching — artist + track
   return `artist:${artist} track:${title}`
}

// Keep old name for compatibility
export const applyAlwaysConditions = normalizeSongForSearch
