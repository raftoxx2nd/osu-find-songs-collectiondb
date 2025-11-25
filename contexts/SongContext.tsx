'use client'
import { Song } from '@/types/types'
import { createContext, useContext, useState } from 'react'
import { CollectionData } from '@/types/collection'

type SongsContextType = {
   songs: Song[]
   setSongs: React.Dispatch<React.SetStateAction<Song[]>>
   collections: CollectionData | null  // ADD THIS
   setCollections: (data: CollectionData | null) => void  // ADD THIS
}

const SongsContext = createContext<SongsContextType | null>(null)

export function SongContextProvider({ children }: { children: React.ReactNode }) {
   const [songs, setSongs] = useState<Song[]>([])
   const [collections, setCollections] = useState<CollectionData | null>(null)  // ADD THIS

   return <SongsContext.Provider value={{ songs, setSongs, collections, setCollections }}>{children}</SongsContext.Provider>
}

export function useSongContext() {
   const context = useContext(SongsContext)
   if (!context) {
      throw new Error('useSongContext must be used within a SongContextProvider')
   }
   return context
}
