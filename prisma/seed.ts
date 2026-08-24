import { PrismaClient } from '@prisma/client'
import { fetchAlqaimaMenu } from '../lib/alqaima'

const db = new PrismaClient()
const menuSourceUrl = 'https://alqaima.com/menu/cocktaillo-resto-cafe/en'
const defaults: Record<string, string> = {
  restaurantName: 'Cocktaillo Resto - Café',
  tagline: 'Fresh flavors. Good moments.',
  phone: '',
  whatsapp: '',
  whishEnabled: 'true',
  whishPhone: '',
  cashEnabled: 'true',
  deliveryEnabled: 'true',
  takeawayEnabled: 'true',
  deliveryFee: '0',
  instagram: '',
  facebook: '',
  tiktok: '',
  locationUrl: '',
  menuSourceUrl
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'menu'

async function seedImportedMenu() {
  const items = await fetchAlqaimaMenu(menuSourceUrl)
  if (!items.length) throw new Error('No menu items found at the configured source')

  const categoryIds = new Map<string, number>()
  for (const item of items) {
    const cat = item.category || 'Menu'
    let categoryId = categoryIds.get(cat)
    if (!categoryId) {
      const category = await db.category.create({
        data: { name: cat, slug: `${slugify(cat)}-${categoryIds.size + 1}` }
      })
      categoryId = category.id
      categoryIds.set(cat, categoryId)
    }
    await db.product.create({
      data: {
        name: item.name,
        description: item.description || null,
        price: item.price,
        imageUrl: item.imageUrl || null,
        categoryId
      }
    })
  }
  console.log(`Imported ${items.length} Cocktaillo menu items from Al Qaima.`)
}

async function seedFallbackMenu() {
  const samples = [
    ['Cocktails', 'Fresh Cocktail', 'Fresh fruit cocktail prepared to order.', 5.00],
    ['Coffee', 'Cappuccino', 'Espresso with steamed milk and foam.', 3.00],
    ['Cold Drinks', 'Fresh Orange Juice', 'Freshly squeezed orange juice.', 4.00],
    ['Food', 'Classic Burger', 'Juicy burger served fresh.', 7.00]
  ] as const

  for (const [cat, name, description, price] of samples) {
    const category = await db.category.upsert({
      where: { slug: slugify(cat) },
      update: {},
      create: { name: cat, slug: slugify(cat) }
    })
    await db.product.create({ data: { name, description, price, categoryId: category.id } })
  }
}

async function main() {
  for (const [key, value] of Object.entries(defaults)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } })
  }
  if (await db.product.count()) return

  try {
    await seedImportedMenu()
  } catch (error) {
    console.warn('Live menu import was unavailable during first start; loading fallback items. Re-import anytime from Admin → Menu.', error)
    await seedFallbackMenu()
  }
}

main().finally(() => db.$disconnect())
