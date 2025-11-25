// app/from-osu/_components/CollectionSelector.tsx
'use client'
import { ParsedCollection } from '@/types/collection'

interface CollectionSelectorProps {
  collections: ParsedCollection[]
  selectedCollection: ParsedCollection | null
  onSelect: (collection: ParsedCollection | null) => void
  totalSongs: number
}

export default function CollectionSelector({ 
  collections, 
  selectedCollection,
  onSelect,
  totalSongs
}: CollectionSelectorProps) {
  if (collections.length === 0) return null

  return (
    <div className="mb-4 px-4">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-white text-sm font-semibold">
          📚 Filter by Collection
        </h4>
        <span className="text-white/40 text-xs">
          ({collections.length} collections)
        </span>
      </div>
      
      <div className="flex gap-2 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-main-border scrollbar-track-transparent">
        <button
          onClick={() => onSelect(null)}
          className={`px-4 py-2 rounded-lg border-2 whitespace-nowrap transition-all ${
            selectedCollection === null
              ? 'bg-main border-main-border text-white shadow-lg scale-105'
              : 'bg-main-dark border-main-border/50 text-white/60 hover:text-white hover:border-main-border/80'
          }`}
        >
          All Songs ({totalSongs})
        </button>
        
        {collections.map((collection) => (
          <button
            key={collection.name}
            onClick={() => onSelect(collection)}
            className={`px-4 py-2 rounded-lg border-2 whitespace-nowrap transition-all ${
              selectedCollection?.name === collection.name
                ? 'bg-main border-main-border text-white shadow-lg scale-105'
                : 'bg-main-dark border-main-border/50 text-white/60 hover:text-white hover:border-main-border/80'
            }`}
          >
            📁 {collection.name} ({collection.beatmaps.length})
          </button>
        ))}
      </div>
    </div>
  )
}