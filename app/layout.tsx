import type { Metadata } from 'next'
import './globals.css'
import './ordering-overrides.css'
import './responsive-overrides.css'

export const metadata: Metadata = {
  title: 'Cocktaillo Resto - Café | Order Online',
  description: 'Order online from Cocktaillo Resto - Café for delivery or takeaway.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
