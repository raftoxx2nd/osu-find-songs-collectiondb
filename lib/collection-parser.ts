// lib/collection-parser.ts
import { CollectionDB, OsuDB } from '@osynicite/osynic-osudb'
import { CollectionData, ParsedCollection } from '@/types/collection'
import { LocalBeatmap } from '@/types/types'

export interface CollectionParseResult {
  success: boolean
  data?: CollectionData
  error?: string
}

export async function parseCollectionWithMetadata(
  collectionFile: File,
  osuDbFile: File
): Promise<CollectionParseResult> {
  try {
    console.log('Parsing collection.db...')
    const collectionBuffer = await collectionFile.arrayBuffer()
    const collectionDB = new CollectionDB(new Uint8Array(collectionBuffer))
    const collectionData = collectionDB.toObject()
    
    console.log('Parsing osu!.db...')
    const osuDbBuffer = await osuDbFile.arrayBuffer()
    const osuDB = new OsuDB(new Uint8Array(osuDbBuffer))
    const osuData = osuDB.toObject()
    
    console.log(`✅ Found ${collectionData.collections.length} collections`)
    console.log(`✅ Found ${osuData.beatmaps.length} beatmaps`)
    
    // Build hash lookup table keyed by md5 hash -> LocalBeatmap
    const beatmapsByHash = new Map<string, LocalBeatmap>()
    const uniqueSetIds = new Set<number>()
    const allUniqueMaps: LocalBeatmap[] = []
    
    if (osuData.beatmaps && Array.isArray(osuData.beatmaps)) {
      osuData.beatmaps.forEach((beatmap: any) => {
        if (!beatmap.hash) return

        const id = beatmap.beatmapset_id || beatmap.beatmap_id || 0

        const mapData: LocalBeatmap = {
          id: beatmap.beatmapset_id || beatmap.beatmap_id || 0,
          beatmap_id: beatmap.beatmap_id || undefined,
          hash: beatmap.hash,

          // prefer unicode where available; fall back to ascii
          title: beatmap.title_unicode || beatmap.title || '',
          artist: beatmap.artist_unicode || beatmap.artist || undefined,
          creator: beatmap.creator || undefined,
          title_unicode: beatmap.title_unicode || null,
          artist_unicode: beatmap.artist_unicode || null,

          // compatibility fields used across the UI
          author: (beatmap.artist_unicode || beatmap.artist || '') as string,
          author_unicode: beatmap.artist_unicode || null,

          status: beatmap.status || 0,
          difficulty_name: beatmap.difficulty_name || undefined,
          tags: beatmap.tags || null,
          total_length: beatmap.total_length || 0,
          text: `${beatmap.artist_unicode || beatmap.artist || ''} - ${beatmap.title_unicode || beatmap.title || ''}`,
          image: undefined,
        }

        beatmapsByHash.set(beatmap.hash, mapData)

        // deduplicate by beatmapset id -> create 'allSongs' list with unique beatmapsets
        if (beatmap.beatmapset_id && !uniqueSetIds.has(beatmap.beatmapset_id)) {
          uniqueSetIds.add(beatmap.beatmapset_id)
          allUniqueMaps.push(mapData)
        }
      })
    }
    
    // Match collections with beatmap metadata
    const unmatchedHashes: string[] = []
    const parsedCollections: ParsedCollection[] = collectionData.collections.map((collection: any) => {
      const beatmaps: LocalBeatmap[] = []
      
      if (collection.beatmap_hashes && Array.isArray(collection.beatmap_hashes)) {
        collection.beatmap_hashes.forEach((hash: string) => {
          const beatmap = beatmapsByHash.get(hash)
          if (beatmap) beatmaps.push(beatmap)
          else unmatchedHashes.push(hash)
        })
      }
      
      return {
        name: collection.name || 'Unnamed Collection',
        beatmap_hashes: collection.beatmap_hashes || [],
        beatmapCount: (collection.beatmap_hashes || []).length,
        beatmaps,
      }
    })
    
    console.log(`✅ Matched collections with beatmaps`)
    console.log(`⚠️ Unmatched hashes: ${unmatchedHashes.length}`)
    
    return {
      success: true,
      data: {
        collections: parsedCollections,
        totalBeatmaps: beatmapsByHash.size,
        unmatchedHashes,
        allSongs: allUniqueMaps,
      } as CollectionData,
    }
  } catch (error) {
    console.error('Failed to parse collections:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    }
  }
}