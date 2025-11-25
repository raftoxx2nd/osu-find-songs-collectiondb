// app/from-osu/_components/CollectionUploader.tsx
'use client'
import { useState } from 'react'
import { parseCollectionWithMetadata } from '@/lib/collection-parser'
import { CollectionData } from '@/types/collection'

interface CollectionUploaderProps {
  onCollectionsParsed: (data: CollectionData) => void
}

export default function CollectionUploader({ onCollectionsParsed }: CollectionUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collectionFile, setCollectionFile] = useState<File | null>(null)
  const [osuDbFile, setOsuDbFile] = useState<File | null>(null)
  const [success, setSuccess] = useState(false)

  const handleProcess = async () => {
    if (!collectionFile || !osuDbFile) {
      setError('Please select both files')
      return
    }

    setIsProcessing(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await parseCollectionWithMetadata(collectionFile, osuDbFile)
      
      if (result.success && result.data) {
        onCollectionsParsed(result.data)
        setSuccess(true)
        
        if (result.data.unmatchedHashes.length > 0) {
          console.warn(
            `⚠️ ${result.data.unmatchedHashes.length} beatmap hashes couldn't be matched.`
          )
        }
      } else {
        setError(result.error || 'Failed to parse files')
      }
    } catch (err) {
      setError('Unexpected error occurred')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-main-dark border-4 border-main-border rounded-lg p-6 mb-6">
      <h3 className="text-xl font-semibold text-white mb-2">
        📁 Import Collections (Optional)
      </h3>
      <p className="text-white/60 text-sm mb-4">
        Upload collection.db and osu!.db to organize your songs by collections
      </p>
      
      <div className="space-y-3">
        {/* Collection.db Upload */}
        <div>
          <label className="text-white text-sm mb-1 block">1. Collection Database</label>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".db"
              onChange={(e) => {
                setCollectionFile(e.target.files?.[0] || null)
                setSuccess(false)
              }}
              disabled={isProcessing}
              className="hidden"
            />
            <div className={`border-2 rounded px-4 py-2 text-white transition-colors inline-flex items-center gap-2 ${
              collectionFile 
                ? 'bg-green-600/20 border-green-500 hover:bg-green-600/30' 
                : 'bg-main border-main-border hover:bg-main-dark'
            }`}>
              {collectionFile ? '✅' : '📂'} 
              {collectionFile ? collectionFile.name : 'Choose collection.db'}
            </div>
          </label>
        </div>

        {/* osu!.db Upload */}
        <div>
          <label className="text-white text-sm mb-1 block">2. osu! Database</label>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".db"
              onChange={(e) => {
                setOsuDbFile(e.target.files?.[0] || null)
                setSuccess(false)
              }}
              disabled={isProcessing}
              className="hidden"
            />
            <div className={`border-2 rounded px-4 py-2 text-white transition-colors inline-flex items-center gap-2 ${
              osuDbFile 
                ? 'bg-green-600/20 border-green-500 hover:bg-green-600/30' 
                : 'bg-main border-main-border hover:bg-main-dark'
            }`}>
              {osuDbFile ? '✅' : '📂'} 
              {osuDbFile ? osuDbFile.name : 'Choose osu!.db'}
            </div>
          </label>
        </div>

        {/* Process Button */}
        <button
          onClick={handleProcess}
          disabled={!collectionFile || !osuDbFile || isProcessing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed border-2 border-blue-800 rounded px-4 py-2 text-white font-semibold transition-colors"
        >
          {isProcessing ? '⏳ Processing...' : '🚀 Load Collections'}
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mt-3 p-3 bg-green-500/20 border border-green-500 rounded text-green-200">
          ✅ Collections loaded successfully! Continue to select your Songs folder.
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-red-500/20 border border-red-500 rounded text-red-200">
          ❌ {error}
        </div>
      )}

      {/* File Location Help */}
      <details className="mt-4 text-sm text-white/60">
        <summary className="cursor-pointer hover:text-white">
          📍 Where to find these files?
        </summary>
        <div className="mt-2 space-y-1 pl-4">
          <p>• <strong>Windows:</strong> <code className="bg-black/30 px-1 rounded">C:\Users\YourName\AppData\Local\osu!</code></p>
          <p>• <strong>macOS:</strong> <code className="bg-black/30 px-1 rounded">~/Library/Application Support/osu!/</code></p>
          <p>• Both files are in your osu! installation folder</p>
        </div>
      </details>
    </div>
  )
}