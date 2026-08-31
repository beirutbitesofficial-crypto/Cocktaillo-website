'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Instagram, X } from 'lucide-react'

const FOLLOW_KEY = 'cocktaillo-instagram-follow-v1'

function normalizeWhatsApp(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits}`
}

function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.52 3.48A11.78 11.78 0 0 0 12.14 0C5.64 0 .35 5.29.35 11.79c0 2.08.54 4.1 1.57 5.89L.25 23.78l6.25-1.64a11.76 11.76 0 0 0 5.63 1.43h.01c6.49 0 11.78-5.29 11.78-11.79 0-3.15-1.21-6.1-3.4-8.3ZM12.14 21.58h-.01a9.78 9.78 0 0 1-4.99-1.37l-.36-.21-3.71.97.99-3.62-.23-.37a9.79 9.79 0 1 1 8.31 4.6Zm5.37-7.33c-.29-.15-1.74-.86-2.01-.96-.27-.1-.47-.15-.66.15-.2.29-.76.96-.93 1.16-.17.2-.34.22-.64.07-.29-.15-1.24-.46-2.36-1.46-.87-.78-1.46-1.74-1.63-2.03-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.07-.15-.66-1.6-.91-2.19-.24-.58-.49-.5-.66-.51h-.56c-.2 0-.51.07-.78.37-.27.29-1.03 1.01-1.03 2.46 0 1.45 1.06 2.85 1.2 3.05.15.2 2.08 3.18 5.04 4.46.7.3 1.25.48 1.68.62.71.22 1.35.19 1.86.12.57-.08 1.74-.71 1.99-1.4.25-.69.25-1.28.17-1.4-.07-.12-.27-.2-.56-.34Z"/>
  </svg>
}

export default function SocialEnhancements({ instagram, whatsapp }: { instagram?: string; whatsapp?: string }) {
  const [navTarget, setNavTarget] = useState<HTMLElement | null>(null)
  const [showInstagram, setShowInstagram] = useState(false)
  const whatsappUrl = normalizeWhatsApp(whatsapp || '')
  const instagramUrl = String(instagram || '').trim()

  useEffect(() => {
    setNavTarget(document.querySelector('.siteHeader nav'))
  }, [])

  useEffect(() => {
    if (!instagramUrl) return
    try {
      if (localStorage.getItem(FOLLOW_KEY)) return
    } catch {}
    const timer = window.setTimeout(() => setShowInstagram(true), 700)
    return () => window.clearTimeout(timer)
  }, [instagramUrl])

  function dismissInstagram() {
    try { localStorage.setItem(FOLLOW_KEY, '1') } catch {}
    setShowInstagram(false)
  }

  const navIcons = navTarget ? createPortal(<span className="navSocialIcons">
    {instagramUrl && <a className="navSocialIcon" href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18}/></a>}
    {whatsappUrl && <a className="navSocialIcon" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="WhatsApp"><WhatsAppIcon size={18}/></a>}
  </span>, navTarget) : null

  return <>
    {navIcons}

    {whatsappUrl && <a className="floatingWhatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label="Chat with Cocktaillo on WhatsApp">
      <WhatsAppIcon size={28}/>
      <span>WhatsApp</span>
    </a>}

    {showInstagram && instagramUrl && <div className="instagramFirstVisitOverlay" onMouseDown={event => event.target === event.currentTarget && dismissInstagram()}>
      <div className="instagramFirstVisitCard" role="dialog" aria-modal="true" aria-label="Follow Cocktaillo on Instagram">
        <button className="instagramDismiss" type="button" onClick={dismissInstagram} aria-label="Close"><X size={20}/></button>
        <div className="instagramBadge"><Instagram size={30}/></div>
        <span className="instagramEyebrow">STAY CONNECTED</span>
        <h2>Follow Cocktaillo<br/>on Instagram</h2>
        <p>New items, offers, moments & more.</p>
        <a className="instagramFollowButton" href={instagramUrl} target="_blank" rel="noreferrer" onClick={dismissInstagram}><Instagram size={19}/> Follow on Instagram</a>
        <button className="instagramLater" type="button" onClick={dismissInstagram}>Maybe later</button>
      </div>
    </div>}
  </>
}
