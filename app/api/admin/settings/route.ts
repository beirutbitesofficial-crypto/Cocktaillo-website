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
  return NextResponse.redirect(new URL('/admin/settings?saved=1', req.url), 303)
}
