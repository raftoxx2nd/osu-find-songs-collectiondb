"use client"
import { useEffect } from 'react'
import { languageOptions } from '@/utils/selectOptions'
import Cookies from 'js-cookie'
import dynamic from 'next/dynamic'
import { twMerge as tw } from 'tailwind-merge'
const Select = dynamic(() => import('react-select'), { ssr: false })

export default function SettingsPopup({ className, isOpen = false, onClose }: { className?: string; isOpen?: boolean; onClose?: () => void }) {
   useEffect(() => {
      function onKey(e: KeyboardEvent) {
         if (e.key === 'Escape' && isOpen) onClose?.()
      }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
   }, [isOpen, onClose])
   return (
      <div
         role="dialog"
         aria-hidden={!isOpen}
         className={tw(
            'transform transition-transform transition-opacity duration-200 z-[100] absolute top-14 left-0 shadow-2xl bg-main border-4 border-main-border min-w-65 w-1/4 flex flex-col gap-4 p-4 rounded-xl rounded-t-none rounded-l-none border-t-0 border-l-0',
            !isOpen ? '-translate-x-full pointer-events-none opacity-0' : 'translate-x-0 pointer-events-auto opacity-100',
            className,
         )}
      >
         <button
            aria-label="Close settings"
            onClick={() => onClose?.()}
            className="absolute right-2 top-2 text-sm text-white/60 hover:text-white"
         >
            ✕
         </button>
         {/* <section className="flex items-center gap-2">
            <Select isDisabled
               id="select-language"
               placeholder='Language'
               defaultValue={languageOptions[0]}
               options={languageOptions}
            />
            <label htmlFor="select-language">Language</label>
         </section> */}
         <section className="flex flex-col ">
            <h2 className="mb-1 font-semibold">Performance</h2>
            <section className="flex items-center gap-2">
               <input
                  type="checkbox"
                  id="performance-spotify"
                  defaultChecked={Cookies.get('showSpotifyEmbeds') === 'false'}
                  onChange={(e) => Cookies.set('showSpotifyEmbeds', (!e.target.checked).toString())}
                  className="w-4 h-4 accent-main-border"
               />
               <label htmlFor="performance-spotify" className="text-sm">
                  Show links instead of <em>Spotify</em> embeds
               </label>
            </section>
            <section className="flex items-center gap-2">
               <input
                  type="checkbox"
                  id="performance-youtube"
                  defaultChecked={Cookies.get('showYouTubeEmbeds') === 'false'}
                  onChange={(e) => Cookies.set('showYouTubeEmbeds', (!e.target.checked).toString())}
                  className="w-4 h-4 accent-main-border"
               />
               <label htmlFor="performance-youtube" className="text-sm">
                  Show links instead of <em>YouTube</em> embeds
               </label>
            </section>
         </section>
      </div>
   )
}
