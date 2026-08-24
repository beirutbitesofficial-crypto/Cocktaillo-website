import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getPosMenu, posCategoryId, posProductId } from '@/lib/pos-menu'
import Storefront from '@/components/Storefront'

export const dynamic = 'force-dynamic'

const key = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ')

export default async function Home() {
  const [posMenu, settings, metadata] = await Promise.all([
    getPosMenu(),
    getSettings(),
    db.product.findMany({ select: { name: true, description: true, imageUrl: true } })
  ])

  const byName = new Map(metadata.map(p => [key(p.name), p]))
  const categories = posMenu.categories.map(category => ({
    id: posCategoryId(category.id),
    name: category.name,
    slug: category.id,
    products: category.products.map(product => {
      const meta = byName.get(key(product.name))
      return {
        id: posProductId(product.id),
        name: product.name,
        description: meta?.description || null,
        price: product.price,
        imageUrl: meta?.imageUrl || null,
        featured: product.best_seller
      }
    })
  }))

  return <Storefront categories={categories} settings={settings} />
}
