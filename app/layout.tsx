import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cocktaillo Resto - Café | Order Online',
  description: 'Order online from Cocktaillo Resto - Café. Delivery, takeaway and dine-in table ordering.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
