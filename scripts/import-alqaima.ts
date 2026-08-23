import { PrismaClient } from '@prisma/client'
import { fetchAlqaimaMenu } from '../lib/alqaima'
const db = new PrismaClient()
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'menu'

async function main() {
  const url = process.argv[2] || 'https://alqaima.com/menu/cocktaillo-resto-cafe/en'
  const items = await fetchAlqaimaMenu(url)
  if (!items.length) throw new Error('No products found. Check the source URL or page markup.')
  await db.product.deleteMany()
  await db.category.deleteMany()
  const categoryIds = new Map<string, number>()
  for (const item of items) {
    const key = item.category || 'Menu'
    let id = categoryIds.get(key)
    if (!id) {
      const c = await db.category.create({ data: { name: key, slug: slugify(key) + '-' + categoryIds.size } })
      id = c.id; categoryIds.set(key, id)
    }
    await db.product.create({ data: { name: item.name, description: item.description, price: item.price, imageUrl: item.imageUrl, categoryId: id } })
  }
  console.log(`Imported ${items.length} products from ${url}`)
}
main().finally(() => db.$disconnect())
