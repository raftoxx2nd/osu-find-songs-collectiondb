import { Song } from '@/types/types'

export const conditions = [
   // identity — return same song (applies normalization in applyAlwaysConditions already)
   (s: Song) => ({ ...s, title_unicode: s.title_unicode ?? null, author_unicode: s.author_unicode ?? null }),

   // strip parentheses from titles (both title and title_unicode when present)
   (s: Song) => {
      const hasParen = (s.title && s.title.includes('(') && s.title.includes(')'))
      const hasParenUni = !!s.title_unicode && String(s.title_unicode).includes('(') && String(s.title_unicode).includes(')')
      if (!hasParen && !hasParenUni) return null
      return {
         ...s,
         title: hasParen ? s.title.replace(/\s*\(.*?\)\s*/g, '').trim() : s.title,
         title_unicode: hasParenUni ? String(s.title_unicode).replace(/\s*\(.*?\)\s*/g, '').trim() : s.title_unicode ?? null,
         author_unicode: s.author_unicode ?? null,
      }
   },

   // strip square brackets from titles
   (s: Song) => {
      const hasBr = (s.title && s.title.includes('[') && s.title.includes(']'))
      const hasBrUni = !!s.title_unicode && String(s.title_unicode).includes('[') && String(s.title_unicode).includes(']')
      if (!hasBr && !hasBrUni) return null
      return {
         ...s,
         title: hasBr ? s.title.replace(/\s*\[.*?\]\s*/g, '').trim() : s.title,
         title_unicode: hasBrUni ? String(s.title_unicode).replace(/\s*\[.*?\]\s*/g, '').trim() : s.title_unicode ?? null,
         author_unicode: s.author_unicode ?? null,
      }
   },

   // remove feat.* from authors
   (s: Song) => {
      const hasFeat = s.author && /feat/i.test(s.author)
      const hasFeatUni = !!s.author_unicode && /feat/i.test(String(s.author_unicode))
      if (!hasFeat && !hasFeatUni) return null
      return {
         ...s,
         author: hasFeat ? s.author.replace(/\s*feat.*/i, '').trim() : s.author,
         author_unicode: hasFeatUni ? String(s.author_unicode).replace(/\s*feat.*/i, '').trim() : s.author_unicode ?? null,
         title_unicode: s.title_unicode ?? null,
      }
   },

   // remove ft.* from authors
   (s: Song) => {
      const hasFt = s.author && /\bft\b/i.test(s.author)
      const hasFtUni = !!s.author_unicode && /\bft\b/i.test(String(s.author_unicode))
      if (!hasFt && !hasFtUni) return null
      return {
         ...s,
         author: hasFt ? s.author.replace(/\s*ft.*/i, '').trim() : s.author,
         author_unicode: hasFtUni ? String(s.author_unicode).replace(/\s*ft.*/i, '').trim() : s.author_unicode ?? null,
         title_unicode: s.title_unicode ?? null,
      }
   },
]

export const hardConditions = [
   (s: Song) => ({ ...s, author: '', author_unicode: null }),
   (s: Song) => ({ ...s, title: '', title_unicode: null }),
]

export const always_conditions = [
   (s: Song) => {
      const hasTv = s.title && s.title.includes('(TV Size)')
      const hasTvUni = !!s.title_unicode && String(s.title_unicode).includes('(TV Size)')
      if (!hasTv && !hasTvUni) return null
      return {
         ...s,
         title: hasTv ? s.title.replace('(TV Size)', '').trim() : s.title,
         title_unicode: hasTvUni ? String(s.title_unicode).replace('(TV Size)', '').trim() : s.title_unicode ?? null,
         author_unicode: s.author_unicode ?? null,
      }
   },
]

export const applyAlwaysConditions = (song: Song) => {
   for (const condition of always_conditions) {
      song = condition(song) || song
   }
   // Ensure both title/title_unicode and author/author_unicode are normalized strings
   return {
      ...song,
      title: song.title ?? '',
      author: song.author ?? '',
      title_unicode: song.title_unicode ?? null,
      author_unicode: song.author_unicode ?? null,
   }
}
