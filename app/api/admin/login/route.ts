import { NextResponse } from 'next/server'
import { createAdminToken, adminCookieName } from '@/lib/auth'

export async function POST(req: Request) {
  const fd = await req.formData()
  const email = String(fd.get('email') || '').trim().toLowerCase()
  const password = String(fd.get('password') || '').trim()
  const validEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const validPassword = String(process.env.ADMIN_PASSWORD || '').trim()

  if (!validEmail || !validPassword) {
    console.error('Admin login is not configured: ADMIN_EMAIL or ADMIN_PASSWORD is missing')
    return NextResponse.json(
      { ok: false, error: 'Admin login is not configured on the server.' },
      { status: 503 }
    )
  }

  if (email !== validEmail || password !== validPassword) {
    return NextResponse.json({ ok: false, error: 'Incorrect email or password.' }, { status: 401 })
  }

  const token = await createAdminToken(validEmail)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(adminCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
