// lib/collection-parser.ts
import { CollectionDB, OsuDB } from '@osynicite/osynic-osudb'
import { CollectionData, OsuBeatmap, ParsedCollection } from '@/types/collection'

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
    
    // Build hash lookup table
    const beatmapsByHash = new Map<string, OsuBeatmap>()
    
    if (osuData.beatmaps && Array.isArray(osuData.beatmaps)) {
      osuData.beatmaps.forEach((beatmap: any) => {
        if (beatmap.hash) {
          beatmapsByHash.set(beatmap.hash, {
            artist: beatmap.artist || null,
            artist_unicode: beatmap.artist_unicode || null,
            title: beatmap.title || null,
            title_unicode: beatmap.title_unicode || null,
            creator: beatmap.creator || null,
            difficulty_name: beatmap.difficulty_name || null,
            hash: beatmap.hash,
            beatmapset_id: beatmap.beatmapset_id || 0,
            beatmap_id: beatmap.beatmap_id || 0,
            status: beatmap.status || 0,
            file_name: beatmap.file_name || null,
            total_length: beatmap.total_length || 0,
          })
        }
      })
    }
    
    // Match collections with beatmap metadata
    const unmatchedHashes: string[] = []
    const parsedCollections: ParsedCollection[] = collectionData.collections.map((collection: any) => {
      const beatmaps: OsuBeatmap[] = []
      
      if (collection.beatmap_hashes && Array.isArray(collection.beatmap_hashes)) {
        collection.beatmap_hashes.forEach((hash: string) => {
          const beatmap = beatmapsByHash.get(hash)
          if (beatmap) {
            beatmaps.push(beatmap)
          } else {
            unmatchedHashes.push(hash)
          }
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
      },
    }
  } catch (error) {
    console.error('Failed to parse collections:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    }
  }
}