// app/from-osu/_components/CollectionBeatmapList.tsx
'use client'
import { LocalBeatmap } from '@/types/types'
import Image from 'next/image'

interface CollectionBeatmapListProps {
  beatmaps: LocalBeatmap[]
  onCreatePlaylist: (beatmaps: LocalBeatmap[]) => void
}

export default function CollectionBeatmapList({ 
  beatmaps,
  onCreatePlaylist 
}: CollectionBeatmapListProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-white text-lg font-semibold">
          {beatmaps.length} Beatmaps
        </h4>
        <button
          onClick={() => onCreatePlaylist(beatmaps)}
          className="bg-green-600 hover:bg-green-700 border-2 border-green-800 rounded px-4 py-2 text-white font-semibold transition-colors"
        >
          Create Spotify Playlist
        </button>
      </div>

      <div className="space-y-2">
        {beatmaps.map((beatmap, idx) => (
          <div
            key={beatmap.hash || idx}
            className="bg-main-dark border-2 border-main-border rounded-lg p-4 hover:bg-main transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h5 className="text-white font-semibold">
                  {beatmap.artist_unicode || beatmap.artist} - {beatmap.title_unicode || beatmap.title}
                </h5>
                <p className="text-white/60 text-sm">
                  [{beatmap.difficulty_name}] mapped by {beatmap.creator}
                </p>
              </div>
              <div className="text-white/40 text-xs">
                {Math.floor((beatmap.total_length ?? 0) / 60)}:{((beatmap.total_length ?? 0) % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}