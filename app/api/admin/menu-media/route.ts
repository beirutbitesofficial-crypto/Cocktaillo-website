import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { menuMediaKey } from '@/lib/menu-media'

const MAX_IMAGE_CHARS = 60000
const MAX_DESCRIPTION_CHARS = 1200

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const itemId = String(body.itemId || '').trim()
    const name = String(body.name || '').trim()
    const description = String(body.description || '').trim().slice(0, MAX_DESCRIPTION_CHARS) || null
    const imageUrl = String(body.imageUrl || '').trim() || null

    if (!itemId || itemId.length > 180 || !name) {
      return NextResponse.json({ error: 'Invalid POS menu item.' }, { status: 400 })
    }

    if (imageUrl) {
      const allowed = imageUrl.startsWith('data:image/jpeg;base64,') || imageUrl.startsWith('data:image/webp;base64,') || /^https:\/\//i.test(imageUrl)
      if (!allowed) return NextResponse.json({ error: 'Unsupported image format.' }, { status: 400 })
      if (imageUrl.length > MAX_IMAGE_CHARS) return NextResponse.json({ error: 'Image is still too large. Choose a smaller photo and try again.' }, { status: 413 })
    }

    const value = JSON.stringify({ name, description, imageUrl })
    await db.setting.upsert({
      where: { key: menuMediaKey(itemId) },
      update: { value },
      create: { key: menuMediaKey(itemId), value }
    })

    return NextResponse.json({ ok: true, imageUrl, description })
  } catch (error) {
    console.error('menu media save failed', error)
    return NextResponse.json({ error: 'Could not save menu image.' }, { status: 500 })
  }
}
