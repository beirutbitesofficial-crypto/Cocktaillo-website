import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getPosMenu, posCategoryId, posProductId } from '@/lib/pos-menu'
import { menuMediaKey, parseMenuMedia } from '@/lib/menu-media'
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
      const savedMedia = parseMenuMedia(settings[menuMediaKey(product.id)])
      const legacyMeta = byName.get(key(product.name))
      return {
        id: posProductId(product.id),
        name: product.name,
        description: savedMedia ? savedMedia.description || null : legacyMeta?.description || null,
        price: product.price,
        imageUrl: savedMedia ? savedMedia.imageUrl || null : legacyMeta?.imageUrl || null,
        featured: product.best_seller,
        allowAddons: product.allow_addons,
        subcategory: product.subcategory || ''
      }
    })
  }))

  const addons = posMenu.addons.map(addon => ({
    id: addon.id,
    name: addon.name,
    nameAr: addon.name_ar,
    priceLbp: addon.price_lbp,
    price: addon.price_usd || Math.round((addon.price_lbp / posMenu.exchange_rate) * 100) / 100
  }))

  return <Storefront categories={categories} settings={settings} addons={addons} exchangeRate={posMenu.exchange_rate} />
}
