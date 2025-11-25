'use client'
import BgImage from '@/components/BgImage'
import { Song } from '@/types/types'
import { useSongContext } from '@/contexts/SongContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Cookies from 'js-cookie'
import { ToastContainer, toast } from 'react-toastify'
import { getServerToken } from '@/lib/Spotify'
import Footer from '@/components/Footer'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCopy, faUpload } from '@fortawesome/free-solid-svg-icons'
import CollectionUploader from '@/app/from-osu/_components/CollectionUploader'
import { CollectionData } from '@/types/collection'

// prettier-ignore
export default function SelectPage() {
   const { setSongs, setCollections } = useSongContext()
   const router = useRouter()

   const handleCollectionsParsed = (data: CollectionData) => {
      setCollections(data)
      console.log(`✅ Loaded ${data.collections.length} collections`)
   }

   useEffect(() => {
      if (Cookies.get('showSpotifyEmbeds') === undefined) Cookies.set('showSpotifyEmbeds', 'true')
      if (Cookies.get('showYouTubeEmbeds') === undefined) Cookies.set('showYouTubeEmbeds', 'true')
   }, [])

   function readFileAsText(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
         const reader = new FileReader()
         reader.onload = () => resolve(reader.result as string)
         reader.onerror = () => reject(reader.error)
         reader.readAsText(file)
      })
   }

   async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      await getServerToken()
   
      const files = e.target.files
      if (!files || files.length === 0) throw new Error('No files selected')
      
      const songs: Song[] = []
      const fileList = Array.from(files)
      
      // grouping files by folders
      const folders = new Map<string, File[]>()
      for (const file of fileList) {
         const parts = file.webkitRelativePath.split('/')
         const folderName = parts[1]
         if (!folders.has(folderName)) {
            folders.set(folderName, [])
         }
         folders.get(folderName)!.push(file)
      }

      // getting data
      for (const [folderName, files] of folders) {
         const songParts = folderName.split(' ')

         // check if folder is map folder
         const id = songParts.length > 0 && !isNaN(parseInt(songParts[0])) ? songParts.shift() : null
         if (!id) continue

         const osuFile = files.find(f => f.name.endsWith('.osu'))
         if (!osuFile) continue

         // parse file content for unicode metadata and background filename
         const content = await readFileAsText(osuFile)
         const lines = content.split('\n')

         let bgFileName: null | string = null
         let unicodeArtist: string | null = null
         let unicodeTitle: string | null = null

         for (let i = 0; i < lines.length; i++) {
            const raw = lines[i] || ''
            const line = raw.trim()

            if (!bgFileName && line.startsWith('//Background and Video events')) {
               const bgLine = lines[i + 1] || ''
               const match = bgLine.match(/"(.*?)"/)
               if (match) bgFileName = match[1]
            }

            if (line.startsWith('TitleUnicode:')) {
               unicodeTitle = line.split(':').slice(1).join(':').trim() || null
            } else if (line.startsWith('ArtistUnicode:')) {
               unicodeArtist = line.split(':').slice(1).join(':').trim() || null
            } else if (line.startsWith('Title:') && !unicodeTitle) {
               // fallback to non-unicode Title
               unicodeTitle = line.split(':').slice(1).join(':').trim() || null
            } else if (line.startsWith('Artist:') && !unicodeArtist) {
               unicodeArtist = line.split(':').slice(1).join(':').trim() || null
            }
         }

         // background image is optional — try to find it
         const imageFile = bgFileName ? files.find((f) => f.name === bgFileName) : files.find((f) => f.name.endsWith('.jpg') || f.name.endsWith('.png'))
         const image = imageFile ? URL.createObjectURL(imageFile) : ''

         const songName = songParts.join(' ').split(' - ')
         const author = unicodeArtist || songName[0]
         const title = unicodeTitle || songName[1]

         songs.push({
            author,
            title,
            // preserve raw unicode values (if present)
            author_unicode: unicodeArtist || null,
            title_unicode: unicodeTitle || null,
            text: `${author} - ${title}`,
            image,
            id,
         })
      }
      setSongs(songs)
      router.push('/from-osu')
   }

   return (
      <div className="flex flex-col justify-center items-center min-h-screen text-white">
         <BgImage />
         <div className="flex flex-col justify-center items-center flex-1 text-nowrap max-w-2xl px-4">
            <h1 className="text-4xl tracking-tight font-semibold mb-3">Select your osu! beatmaps folder</h1>
            <h3 className="text-lg text-white/60 mb-8">This may take some time</h3>
            
            {/* ADD COLLECTION UPLOADER HERE */}
            <CollectionUploader onCollectionsParsed={handleCollectionsParsed} />
            
            {/* EXISTING FOLDER INPUT */}
            <div className="text-xl flex items-center gap-2 mt-6">
               <h2 className="text-white/80">or just point to your</h2>
               <label className="cursor-pointer px-5 py-2 bg-main border-4 border-main-border rounded-lg font-semibold transition-colors hover:bg-main-dark">
                  <input
                     {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
                     className="hidden"
                     type="file"
                     onChange={(e) => {
                        toast.promise(handleFileChange(e), {
                           pending: 'Loading beatmaps...',
                           error: {
                              render({ data }) {
                                 console.error(data)
                                 return 'Please select a valid osu! beatmaps directory'
                              },
                              autoClose: false,
                              hideProgressBar: true,
                           },
                        })
                     }}
                  />
                  Songs folder
               </label>
            </div>
         </div>
            <ToastContainer />
            <Footer />
         </div>
      )
   }
