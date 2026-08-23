import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'

const COOKIE = 'cocktaillo_admin'
function secret() {
  return new TextEncoder().encode(process.env.ADMIN_SECRET || 'cocktaillo-change-this-secret')
}

export async function createAdminToken(email: string) {
  return new SignJWT({ email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt().setExpirationTime('7d').sign(secret())
}

export async function isAdmin() {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return false
  try { await jwtVerify(token, secret()); return true } catch { return false }
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin/login')
}

export const adminCookieName = COOKIE
