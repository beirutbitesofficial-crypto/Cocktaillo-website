import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { defaultSettings } from '@/lib/settings'

export async function POST(req: Request) {
  if (!(await isAdmin())) return new NextResponse('Unauthorized', { status: 401 })
  const fd = await req.formData()
  for (const key of Object.keys(defaultSettings)) {
    const isBool = ['whishEnabled', 'cashEnabled', 'deliveryEnabled', 'takeawayEnabled'].includes(key)
    const value = isBool ? (fd.get(key) === 'on' ? 'true' : 'false') : String(fd.get(key) || '')
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
  }

  // Use a relative Location header instead of req.url. Behind Hostinger's proxy,
  // req.url can contain the internal 0.0.0.0 origin, which Safari refuses to open.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: '/admin/settings?saved=1' }
  })
}
