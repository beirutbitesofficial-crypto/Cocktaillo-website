import { NextResponse } from 'next/server'
import { adminCookieName } from '@/lib/auth'

export async function POST(req: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
  const res = NextResponse.redirect(new URL('/admin/login', baseUrl), 303)
  res.cookies.set(adminCookieName, '', { path: '/', maxAge: 0 })
  return res
}
