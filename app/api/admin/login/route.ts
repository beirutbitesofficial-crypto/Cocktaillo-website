import { NextResponse } from 'next/server'
import { createAdminToken, adminCookieName } from '@/lib/auth'

function getPublicBaseUrl(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
}

export async function POST(req: Request) {
  const fd = await req.formData()
  const email = String(fd.get('email') || '')
  const password = String(fd.get('password') || '')
  const validEmail = process.env.ADMIN_EMAIL || 'admin@cocktaillo.com'
  const validPassword = process.env.ADMIN_PASSWORD || 'change-this-password'
  const baseUrl = getPublicBaseUrl(req)

  if (email !== validEmail || password !== validPassword) {
    return NextResponse.redirect(new URL('/admin/login?error=1', baseUrl), 303)
  }

  const token = await createAdminToken(email)
  const res = NextResponse.redirect(new URL('/admin', baseUrl), 303)
  res.cookies.set(adminCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
