import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import SocialEnhancements from '@/components/SocialEnhancements'
import './globals.css'
import './ordering-overrides.css'
import './responsive-overrides.css'
import './hero-polish.css'
import './hero-glass.css'
import './social-enhancements.css'

export const metadata: Metadata = {
  title: 'Cocktaillo Resto - Café | Order Online',
  description: 'Order online from Cocktaillo Resto - Café for delivery or takeaway.'
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings()
  return <html lang="en"><body>{children}<SocialEnhancements instagram={settings.instagram} whatsapp={settings.whatsapp}/></body></html>
}
