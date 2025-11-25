'use client'
import { Track } from '@/types/Spotify'
import { CombinedSingleSimple } from '@/types/types'
import { AddItemsToPlaylist, createPlaylist, fetchMyProfile, fetchSpotify, getServerToken } from '@/lib/Spotify'
import { useMutation } from '@tanstack/react-query'
import React, { useState } from 'react'
import Modal from '@/components/Modal'
import { Button } from '@/components/buttons/Buttons'
import Cookies from 'js-cookie'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpotify } from '@fortawesome/free-brands-svg-icons'
import { twMerge as tw } from 'tailwind-merge'
import ExternalLink from '@/components/ExternalLink'

interface Props extends React.HTMLAttributes<HTMLButtonElement> {
   isDisabled: boolean
   // accept the combined item so we have local metadata for better matching
   data: (CombinedSingleSimple | null | undefined)[]
   className?: string
}

export default function CreatePlaylistButton({ data, className, isDisabled, ...props }: Props) {
   const [isModalOpen, setIsModalOpen] = useState(false)
   const [state, setState] = useState<'error' | 'success' | 'warning' | 'info' | 'loading'>('info')
   const [modalContent, setModalContent] = useState<React.ReactNode | null>(null)
   const [onOkayFn, setOnOkayFn] = useState<() => void>(() => {})
   const [onOkayText, setOnOkayText] = useState<string | undefined>('Okay')

   const mutation = useMutation({
      mutationFn: ({ playlistId, uris }: { playlistId: string; uris: string[] }) => AddItemsToPlaylist(playlistId, uris),
   })

   function handleModal(
      content: React.ReactNode,
      state: 'error' | 'success' | 'warning' | 'info' | 'loading',
      onOkayFn: () => void = () => {},
      onOkayText?: string,
   ) {
      setModalContent(content)
      setState(state)
      setOnOkayFn(() => onOkayFn)
      setOnOkayText(onOkayText)
   }

   async function handleCreatePlaylist() {
      setIsModalOpen(true)
      if (!Cookies.get('spotify_oauth_access_token')) {
         // handleModal(<h1>You must be logged in your Spotify account to continue!</h1>, 'warning', navigateToAuth, 'Login')
         // return
      }

      try {
         handleModal(<h1 className="animate-pulse font-semibold">Getting profile...</h1>, 'loading')
         let profile
         try {
            profile = await fetchMyProfile()
         } catch (err) {
            console.error(err)
            throw new Error('Failed to fetch profile')
         }

         handleModal(<h1 className="animate-pulse font-semibold">Creating playlist...</h1>, 'loading')
         let playlist
         try {
            playlist = await createPlaylist({
               userId: profile.id,
               name: 'osu! to Spotify',
               description: `Generated playlist by ${process.env.NEXT_PUBLIC_URL} at ${new Date().toLocaleString()}`,
            })
         } catch (err) {
            console.error(err)
            throw new Error('Failed to create playlist')
         }

         handleModal(<h1 className="animate-pulse font-semibold">Putting tracks in your playlist...</h1>, 'loading')

         // Ranking heuristic: choose the best track for each search result.
         // data entries are CombinedSingleSimple which include .local and .spotify (Track[] | null)
         const entries = data.filter(Boolean) as CombinedSingleSimple[]

         function normalize(s: string | null | undefined) {
            if (!s) return ''
            return String(s)
               .toLowerCase()
               .replace(/\(.*?\)/g, '') // remove parentheses
               .replace(/\[.*?\]/g, '') // remove brackets
               .replace(/feat\.?\s.*$/i, '') // remove feat.* suffix
               .replace(/ft\.?\s.*$/i, '')
               .replace(/[\p{P}\p{S}]/gu, ' ') // remove punctuation / symbols
               .replace(/\s+/g, ' ')
               .trim()
         }

         function scoreCandidate(localTitle: string, localArtist: string, track: Track) {
            const tName = normalize(track.name)
            const tArtists = (track.artists || []).map((a) => normalize(a.name)).join(' ')
            let score = 0

            // exact title match
            if (localTitle && (tName === localTitle || tName.includes(localTitle) || localTitle.includes(tName))) score += 100

            // artist match increases score
            if (localArtist && (tArtists === localArtist || tArtists.includes(localArtist) || localArtist.includes(tArtists))) score += 50

            // boost by popularity (0-100) scaled down
            score += Math.min(30, Math.round((track.popularity || 0) / 3))

            return score
         }

         const selectedTracks: Track[] = []

         for (const entry of entries) {
            const candidates = entry.spotify || []
            if (!candidates || candidates.length === 0) continue

            const localTitle = normalize(entry.local.title_unicode || entry.local.title)
            const localArtist = normalize(entry.local.author_unicode || entry.local.author)

            // Score each candidate and pick best
            let best: { track: Track; score: number } | null = null
            for (const t of candidates) {
               const sc = scoreCandidate(localTitle, localArtist, t)
               if (!best || sc > best.score) best = { track: t, score: sc }
            }

            if (process.env.NODE_ENV !== 'production') {
               console.debug('Playlist candidate evaluation', {
                  local: { title: entry.local.title, author: entry.local.author },
                  candidatesCount: candidates.length,
                  bestScore: best?.score ?? null,
                  bestName: best?.track?.name ?? null,
               })
            }

            // if best is from a 20-items ambiguous search and score is low, try next fallback later
            if (best && (candidates.length !== 20 || best.score >= 60)) {
               selectedTracks.push(best.track)
            } else if (best && candidates.length === 20) {
               // not confident but choose top-by-popularity if nothing better
               const byPopularity = [...candidates].sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
               if (byPopularity.length) selectedTracks.push(byPopularity[0])
            }
         }

         if (process.env.NODE_ENV !== 'production') console.debug('Playlist creation — picked tracks:', selectedTracks.length, 'of', entries.length)

         if (selectedTracks.length === 0) {
            handleModal(<h1>No tracks selected — nothing to add to playlist</h1>, 'warning')
            return
         }

         const promises = []
         const chunkSize = 100
         for (let i = 0; i < selectedTracks.length; i += chunkSize) {
            const chunk = selectedTracks.slice(i, i + chunkSize)
            promises.push(
               mutation.mutateAsync({
                  playlistId: playlist!.id,
                  uris: chunk.map((track) => track.uri),
               }),
            )
         }

         Promise.all(promises)
            .then(() => {
               handleModal(
                  <>
                     <h1 className="text-lg font-semibold">Success!</h1>
                     <p>
                        ❤️ Like the playlist to save it to your library, <br /> 🔁 or copy tracks with Ctrl+A, C, then V in your
                        playlist.
                     </p>
                     <ExternalLink href={playlist!.external_urls.spotify} className="text-black animate-pulse font-outline">
                        {playlist!.external_urls.spotify}
                     </ExternalLink>
                  </>,
                  'success',
               )
            })
            .catch((err) => {
               console.error(err)
               handleModal(<h1>Failed to add tracks to playlist</h1>, 'error')
            })
      } catch (error) {
         handleModal(<h1>{error instanceof Error ? error.message : 'An unexpected error occurred'}</h1>, 'error')
      }
   }

   return (
      <>
         <Button
            {...props}
            // disabled={isDisabled}
            onClick={() => handleCreatePlaylist()}
            data-tooltip-id="tooltip-1"
            data-tooltip-content="Create playlist on your Spotify account and populate it with tracks with filter 'Exact Spotify match'"
            className={tw('bg-main-dark-vivid md:whitespace-nowrap w-fit py-0.5 px-5', className)}
         >
            Create playlist
            <FontAwesomeIcon icon={faSpotify} className="ml-1.5 text-lg mt-0.5" />
         </Button>

         <Modal
            isOpen={isModalOpen}
            buttons={[
               {
                  onClick: () => setIsModalOpen(false),
                  text: 'Close',
                  className: 'bg-main-dark',
               },
               {
                  onClick: onOkayFn,
                  text: onOkayText,
                  className: 'bg-success',
               },
            ]}
            status={state}
         >
            {modalContent}
         </Modal>
      </>
   )
}
