import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CHUNK_PREFIX = 'heroImageChunk:'
const COUNT_KEY = 'heroImageChunkCount'
const MAX_CHUNKS = 12

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const countRow = await db.setting.findUnique({ where: { key: COUNT_KEY } })
    const count = Math.max(0, Math.min(MAX_CHUNKS, Number(countRow?.value || 0)))
    if (!count) return new NextResponse(null, { status: 404 })

    const rows = await db.setting.findMany({
      where: { key: { in: Array.from({ length: count }, (_, index) => `${CHUNK_PREFIX}${index}`) } }
    })
    const byKey = new Map(rows.map(row => [row.key, row.value]))
    const dataUrl = Array.from({ length: count }, (_, index) => byKey.get(`${CHUNK_PREFIX}${index}`) || '').join('')
    const match = dataUrl.match(/^data:(image\/(?:webp|jpeg));base64,(.+)$/)
    if (!match) return new NextResponse(null, { status: 404 })

    const body = Buffer.from(match[2], 'base64')
    return new NextResponse(body, {
      headers: {
        'content-type': match[1],
        'content-length': String(body.length),
        'cache-control': 'no-store, max-age=0'
      }
    })
  } catch (error) {
    console.error('hero image read failed', error)
    return NextResponse.json({ error: 'Could not load hero image.' }, { status: 500 })
  }
}
