import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  if (!(await isAdmin())) return new NextResponse('Unauthorized', { status: 401 })

  const fd = await req.formData()
  const action = String(fd.get('action') || '')
  const id = Number(fd.get('id'))

  if (action === 'delete' && id) {
    await db.product.delete({ where: { id } })
    return NextResponse.redirect(new URL('/admin/products', req.url), 303)
  }

  const name = String(fd.get('name') || '').trim()
  const description = String(fd.get('description') || '').trim() || null
  const imageUrl = String(fd.get('imageUrl') || '').trim() || null
  const rawPrice = String(fd.get('price') || '').trim()
  const price = Number(rawPrice)
  const categoryId = Number(fd.get('categoryId'))
  const active = fd.get('active') === 'on'
  const featured = fd.get('featured') === 'on'

  if (!name || !categoryId || rawPrice === '' || !Number.isFinite(price) || price < 0) {
    return NextResponse.redirect(new URL('/admin/products?productError=invalid', req.url), 303)
  }

  const data = {
    name,
    description,
    imageUrl,
    price,
    categoryId,
    active,
    featured,
  }

  if (action === 'create') {
    await db.product.create({ data })
    return NextResponse.redirect(new URL('/admin/products?created=1', req.url), 303)
  }

  if (action === 'update' && id) {
    await db.product.update({ where: { id }, data })
    return NextResponse.redirect(new URL('/admin/products?updated=1', req.url), 303)
  }

  return NextResponse.redirect(new URL('/admin/products?productError=invalid', req.url), 303)
}
