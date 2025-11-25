// app/test-collection/page.tsx
'use client'
import { useState } from 'react'
import { CollectionDB, OsuDB } from '@osynicite/osynic-osudb'

export default function TestCollectionPage() {
  const [collectionFile, setCollectionFile] = useState<File | null>(null)
  const [osuDbFile, setOsuDbFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleTest = async () => {
    if (!collectionFile || !osuDbFile) {
      setError('Please select both files')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Parse collection.db
      console.log('📂 Parsing collection.db...')
      const collectionBuffer = await collectionFile.arrayBuffer()
      const collectionDB = new CollectionDB(new Uint8Array(collectionBuffer))
      const collectionData = collectionDB.toObject()
      console.log('✅ Collection data:', collectionData)

      // Parse osu!.db
      console.log('📂 Parsing osu!.db...')
      const osuDbBuffer = await osuDbFile.arrayBuffer()
      const osuDB = new OsuDB(new Uint8Array(osuDbBuffer))
      const osuData = osuDB.toObject()
      console.log('✅ Osu data (first 3 beatmaps):', osuData.beatmaps.slice(0, 3))

      // Build hash lookup
      const beatmapsByHash = new Map()
      osuData.beatmaps.forEach((beatmap: any) => {
        if (beatmap.hash) {
          beatmapsByHash.set(beatmap.hash, beatmap)
        }
      })

      // Match collections
      const matched = collectionData.collections.map((collection: any) => {
        const beatmaps = collection.beatmap_hashes
          .map((hash: string) => beatmapsByHash.get(hash))
          .filter(Boolean)

        return {
          name: collection.name,
          totalHashes: collection.beatmap_hashes.length,
          matchedBeatmaps: beatmaps.length,
          beatmaps: beatmaps.slice(0, 5), // Show first 5
        }
      })

      setResult({
        collections: matched,
        totalBeatmapsInDb: beatmapsByHash.size,
        totalCollections: collectionData.collections.length,
      })
    } catch (err: any) {
      console.error('❌ Error:', err)
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🧪 Collection Reader Test</h1>

        {/* File Inputs */}
        <div className="space-y-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg">
            <label className="block text-sm font-medium mb-2">
              1. Select collection.db
            </label>
            <input
              type="file"
              accept=".db"
              onChange={(e) => setCollectionFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {collectionFile && (
              <p className="text-green-400 text-sm mt-2">✅ {collectionFile.name}</p>
            )}
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <label className="block text-sm font-medium mb-2">
              2. Select osu!.db
            </label>
            <input
              type="file"
              accept=".db"
              onChange={(e) => setOsuDbFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {osuDbFile && (
              <p className="text-green-400 text-sm mt-2">✅ {osuDbFile.name}</p>
            )}
          </div>

          <button
            onClick={handleTest}
            disabled={!collectionFile || !osuDbFile || loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 px-6 rounded-lg font-semibold transition-colors"
          >
            {loading ? '⏳ Testing...' : '🚀 Test Parser'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-red-200 mb-2">❌ Error</h3>
            <pre className="text-sm text-red-300 overflow-auto">{error}</pre>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
              <h3 className="font-bold text-green-200 mb-2">✅ Success!</h3>
              <div className="space-y-1 text-sm">
                <p>📊 Total beatmaps in osu!.db: <strong>{result.totalBeatmapsInDb}</strong></p>
                <p>📁 Total collections: <strong>{result.totalCollections}</strong></p>
              </div>
            </div>

            {/* Collections */}
            {result.collections.map((collection: any, idx: number) => (
              <div key={idx} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-xl font-bold mb-2">📁 {collection.name}</h3>
                <p className="text-sm text-gray-400 mb-3">
                  {collection.matchedBeatmaps} / {collection.totalHashes} beatmaps matched
                </p>
                
                {collection.beatmaps.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 uppercase font-semibold">
                      Sample beatmaps (first 5):
                    </p>
                    {collection.beatmaps.map((beatmap: any, bIdx: number) => (
                      <div key={bIdx} className="bg-gray-900/50 p-3 rounded text-sm">
                        <p className="font-semibold text-blue-300">
                          {beatmap.artist_unicode || beatmap.artist} - {beatmap.title_unicode || beatmap.title}
                        </p>
                        <p className="text-gray-400 text-xs">
                          [{beatmap.difficulty_name}] by {beatmap.creator}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          Hash: {beatmap.hash?.substring(0, 16)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Raw JSON View */}
            <details className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <summary className="cursor-pointer font-semibold text-gray-300">
                📄 View Raw JSON
              </summary>
              <pre className="mt-4 text-xs bg-gray-900 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-900/30 border border-blue-500 rounded-lg p-4">
          <h4 className="font-bold text-blue-200 mb-2">📍 File Locations</h4>
          <div className="text-sm text-blue-100 space-y-1">
            <p>Windows: <code className="bg-black/30 px-2 py-1 rounded">C:\Users\YourName\AppData\Local\osu!\</code></p>
            <p>macOS: <code className="bg-black/30 px-2 py-1 rounded">~/Library/Application Support/osu!/</code></p>
            <p>Linux: <code className="bg-black/30 px-2 py-1 rounded">~/.local/share/osu!/</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}