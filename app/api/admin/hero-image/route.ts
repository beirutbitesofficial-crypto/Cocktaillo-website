import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { isAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

const CHUNK_PREFIX = 'heroImageChunk:'
const COUNT_KEY = 'heroImageChunkCount'
const CHUNK_SIZE = 55000
const MAX_IMAGE_CHARS = 480000

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''

    if (imageUrl) {
      const allowed = imageUrl.startsWith('data:image/webp;base64,') || imageUrl.startsWith('data:image/jpeg;base64,')
      if (!allowed) return NextResponse.json({ error: 'Unsupported image format.' }, { status: 400 })
      if (imageUrl.length > MAX_IMAGE_CHARS) return NextResponse.json({ error: 'Image is still too large. Try another photo.' }, { status: 413 })
    }

    const chunks = imageUrl ? Array.from({ length: Math.ceil(imageUrl.length / CHUNK_SIZE) }, (_, index) => imageUrl.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)) : []

    await db.$transaction([
      db.setting.deleteMany({ where: { key: { startsWith: CHUNK_PREFIX } } }),
      ...chunks.map((value, index) => db.setting.upsert({
        where: { key: `${CHUNK_PREFIX}${index}` },
        update: { value },
        create: { key: `${CHUNK_PREFIX}${index}`, value }
      })),
      db.setting.upsert({
        where: { key: COUNT_KEY },
        update: { value: String(chunks.length) },
        create: { key: COUNT_KEY, value: String(chunks.length) }
      })
    ])

    revalidatePath('/')
    revalidatePath('/admin/settings')
    return NextResponse.json({ ok: true, chunks: chunks.length })
  } catch (error) {
    console.error('hero image save failed', error)
    return NextResponse.json({ error: 'Could not save hero image.' }, { status: 500 })
  }
}
