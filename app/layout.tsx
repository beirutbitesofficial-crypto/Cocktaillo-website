import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import SocialEnhancements from '@/components/SocialEnhancements'
import './globals.css'
import './ordering-overrides.css'
import './responsive-overrides.css'
import './hero-polish.css'
import './hero-glass.css'
import './social-enhancements.css'
import './luxury.css'

export const metadata: Metadata = {
  title: 'Cocktaillo Resto - Café | Order Online',
  description: 'Order online from Cocktaillo Resto - Café for delivery or takeaway.'
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings()
  return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=""/><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;600;700&display=swap"/></head><body>{children}<SocialEnhancements instagram={settings.instagram} whatsapp={settings.whatsapp}/></body></html>
}
