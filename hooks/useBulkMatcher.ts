import { useState } from 'react'
import axios from 'axios'
import { chunkArray } from '@/utils/arrayManaging'
import { LocalBeatmap } from '@/types/types'

export function useBulkMatcher() {
   const [progress, setProgress] = useState(0)
   const [isMatching, setIsMatching] = useState(false)

   async function matchAll(allSongs: LocalBeatmap[]) {
      setIsMatching(true)
      setProgress(0)

      const chunks = chunkArray(allSongs, 50)
      const results: (null | any[])[] = []

      for (let i = 0; i < chunks.length; i++) {
         const chunk = chunks[i]
         try {
            const { data } = await axios.post('/api/batch/spotify', chunk)
            results.push(...data)
         } catch (err) {
            console.error('Bulk match chunk failed', err)
            // maintain index alignment: add nulls for failed chunk
            results.push(...new Array(chunk.length).fill(null))
         }

         setProgress(Math.round(((i + 1) / chunks.length) * 100))
         // rate-limit safety
         await new Promise((r) => setTimeout(r, 200))
      }

      setIsMatching(false)
      return results
   }

   return { matchAll, progress, isMatching }
}
