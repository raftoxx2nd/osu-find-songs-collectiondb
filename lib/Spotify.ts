'use server'
import { cookies } from 'next/headers'
import { LocalBeatmap } from '@/types/types'
import { getOptimizedSearchQuery, applyAlwaysConditions } from '@/utils/spotifySearchConditions'
import { Playlist, SpotifyAuthResponse, SpotifyError, TrackFull } from '@/types/Spotify'
import axios from 'axios'
import { axiosErrorHandler, unexpectedErrorHandler } from './errorHandlers'
// import { H } from '@highlight-run/next/server'

export async function getServerToken(): Promise<string> {
   let token = (await cookies()).get('spotifyToken')?.value
   if (!token) token = await revalidateSpotifyToken()
   return token
}
async function getUserToken(): Promise<string> {
   let token = (await cookies()).get('spotify_oauth_access_token')?.value
   if (!token) token = await refreshToken()
   return token
}

export async function fetchSpotify<T>(func: (token: string) => Promise<T>, isUserToken: boolean = false): Promise<T> {
   let token: string | undefined
   try {
      token = isUserToken ? await getUserToken() : await getServerToken()
      return await func(token)
   } catch (err) {
      if (axios.isAxiosError<SpotifyError>(err)) {
         const is429 = (err.response?.data as any)?.error?.status === 429 || err.response?.status === 429
         if (is429 && token) {
            // Use lowercase header key (axios lowercases headers in Node
            // and some environments). Accept array values and provide a
            // reasonable default (5s) to avoid NaN or undefined waits.
            const headerRaw = (err.response?.headers?.['retry-after'] as any) ?? (err.response?.headers?.['Retry-After'] as any)
            const headerVal = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw
            let wait = headerVal ? parseInt(String(headerVal)) : 5
            // fallback to safe default if parseInt failed
            if (isNaN(wait)) wait = 5
            // Safety check to prevent unexpected long waits or abuse
            if (wait > 60) throw new Error(`Spotify rate limit: wait too long (${wait}s)`)
            console.warn(`Rate limit exceeded. Waiting for ${wait} seconds...`)
            // Add small buffer to ensure the window is clear
            await new Promise((resolve) => setTimeout(resolve, wait * 1000 + 100))
            return await func(token)
         }
         axiosErrorHandler(err, 'Spotify')
      } else unexpectedErrorHandler(err, 'Spotify')
      throw err
   }
}

export const findSong = async (query: string): Promise<{ tracks: { items: [TrackFull] | [] } }> => {
   return fetchSpotify(async (token) => {
      const res = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track`, {
         headers: { Authorization: `Bearer ${token}` },
      })
      return res.data
   })
}

export const searchSongWithConditions = async (beatmap: LocalBeatmap): Promise<[TrackFull] | null> => {
   const normalized = applyAlwaysConditions(beatmap as any)
   const query = getOptimizedSearchQuery(normalized)
   if (!query) return null

   try {
      if (process.env.NODE_ENV !== 'production') console.debug('Spotify search (optimized):', query)
      const result = await findSong(query)
      if (result.tracks.items.length) return result.tracks.items
   } catch (err) {
      console.warn('Failed spotify search (optimized):', query, err)
   }
   return null
}

export async function refreshToken(): Promise<string> {
   const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN!,
      client_id: process.env.AUTH_SPOTIFY_ID!,
      client_secret: process.env.AUTH_SPOTIFY_SECRET!,
   })
   const { data } = await axios.post<SpotifyAuthResponse>('https://accounts.spotify.com/api/token', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
   })
   console.log('refresh_token NEW', data.refresh_token)

   const storage = await cookies()
   storage.set('spotify_oauth_access_token', data.access_token, {
      path: '/',
      expires: new Date(Date.now() + data.expires_in * 1000),
   })
   return data.access_token
}

export async function revalidateSpotifyToken(): Promise<string> {
   const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.AUTH_SPOTIFY_ID!,
      client_secret: process.env.AUTH_SPOTIFY_SECRET!,
   })

   const { data } = await axios.post<SpotifyAuthResponse>('https://accounts.spotify.com/api/token', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
   })
   console.log('spotify token request', data)

   const storage = await cookies()
   storage.set('spotifyToken', data.access_token, {
      path: '/',
      expires: new Date(Date.now() + data.expires_in * 1000),
   })
   return data.access_token
}

export async function getPlaylist(playlistId: string): Promise<Playlist | undefined> {
   return fetchSpotify(async (token) => {
      const { data } = await axios.get<Playlist>(`https://api.spotify.com/v1/playlists/${playlistId}`, {
         headers: { Authorization: `Bearer ${token}` },
      })
      // H.log('get_playlist', 'log')
      return data
   })
}

export async function fetchMyProfile(): Promise<any | undefined> {
   return fetchSpotify(async (token) => {
      const res = await axios.get('https://api.spotify.com/v1/me', {
         headers: { Authorization: `Bearer ${token}` },
      })
      return res.data
   }, true)
}

export async function createPlaylist({
   userId,
   name,
   description,
   isPublic = false,
   collaborative = false,
}: {
   userId: string
   name: string
   isPublic?: boolean
   collaborative?: boolean
   description: string
}): Promise<Playlist | undefined> {
   return fetchSpotify(async (token) => {
      const { data } = await axios.post<Playlist>(
         `https://api.spotify.com/v1/users/${userId}/playlists`,
         {
            name,
            public: isPublic,
            collaborative,
            description,
         },
         { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      )
      // H.log('create_playlist', 'log')
      return data
   }, true)
}

export async function AddItemsToPlaylist(playlistId: string, uris: string[]) {
   return fetchSpotify(async (token) => {
      if (uris.length > 100) throw new Error('Max 100 tracks per request, got ' + uris.length)
      if (uris.length === 0) throw new Error('No tracks provided')
      const res = await axios.post(
         `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
         { uris, position: 0 }, //? add to the beginning of the playlist
         { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      )
      return res.data
   }, true)
}

export async function OAuthAuthorization(code: string) {
   const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.NEXT_PUBLIC_URL! + '/auth/spotify/callback',
      client_id: process.env.AUTH_SPOTIFY_ID!,
      client_secret: process.env.AUTH_SPOTIFY_SECRET!,
   })

   const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
   })

   if (!response.ok) throw new Error(await response.text())
   const data = await response.json()

   const storage = await cookies()
   storage.set('spotify_oauth_refresh_token', data.refresh_token, {
      maxAge: data.expires_in,
   })
   return data
}

export async function fetchWithToken(url: string) {
   return fetchSpotify(async (token) => {
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } })
      return res.data
   })
}
