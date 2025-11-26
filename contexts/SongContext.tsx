'use client'
import { LocalBeatmap } from '@/types/types'
import { createContext, useContext, useMemo, useState } from 'react'
import { useEffect } from 'react'
import { CollectionData } from '@/types/collection'

type SongsContextType = {
   // canonical all-songs list produced by parser: LocalBeatmap[]
   songs: LocalBeatmap[]
   setSongs: React.Dispatch<React.SetStateAction<LocalBeatmap[]>>
   collections: CollectionData | null  // ADD THIS
   setCollections: React.Dispatch<React.SetStateAction<CollectionData | null>>
}

const SongsContext = createContext<SongsContextType | null>(null)

export function SongContextProvider({ children }: { children: React.ReactNode }) {
   const [songs, setSongs] = useState<LocalBeatmap[]>([])
   const [collections, setCollections] = useState<CollectionData | null>(null)

   // Stabilize the provider value so consumers don't receive a new object ref every render
   const value = useMemo(() => ({ songs, setSongs, collections, setCollections }), [songs, collections])

   // Debug: log changes so UI interaction is easier to trace during development
   useEffect(() => {
      console.debug('SongContext: songs changed —', songs.length)
   }, [songs])

   useEffect(() => {
      console.debug('SongContext: collections changed —', collections?.collections?.length ?? 0)
   }, [collections])

   return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>
}

export function useSongContext() {
   const context = useContext(SongsContext)
   if (!context) {
      throw new Error('useSongContext must be used within a SongContextProvider')
   }
   return context
}
