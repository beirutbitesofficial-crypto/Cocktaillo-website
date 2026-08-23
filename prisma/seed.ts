import { PrismaClient } from '@prisma/client'
import { defaultSettings } from '../lib/settings'
const db = new PrismaClient()
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'menu'

async function main() {
  for (const [key, value] of Object.entries(defaultSettings)) await db.setting.upsert({ where: { key }, update: {}, create: { key, value } })
  if (await db.product.count()) return
  const samples = [
    ['Cocktails', 'Fresh Cocktail', 'Fresh fruit cocktail prepared to order.', 5.00],
    ['Coffee', 'Cappuccino', 'Espresso with steamed milk and foam.', 3.00],
    ['Cold Drinks', 'Fresh Orange Juice', 'Freshly squeezed orange juice.', 4.00],
    ['Food', 'Classic Burger', 'Juicy burger served fresh.', 7.00]
  ] as const
  for (const [cat, name, description, price] of samples) {
    const category = await db.category.upsert({ where: { slug: slugify(cat) }, update: {}, create: { name: cat, slug: slugify(cat) } })
    await db.product.create({ data: { name, description, price, categoryId: category.id } })
  }
}
main().finally(() => db.$disconnect())
