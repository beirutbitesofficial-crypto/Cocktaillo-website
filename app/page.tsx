import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getPosMenu, posCategoryId, posProductId } from '@/lib/pos-menu'
import { menuMediaKey, parseMenuMedia } from '@/lib/menu-media'
import Storefront from '@/components/Storefront'

export const dynamic = 'force-dynamic'

const key = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ')
const parentCategoryName = (value: string) => String(value || '').split('>')[0].trim() || String(value || '').trim()
const categorySuffix = (value: string) => String(value || '').split('>').slice(1).join('>').trim()

export default async function Home() {
  const [posMenu, settings, metadata] = await Promise.all([
    getPosMenu(),
    getSettings(),
    db.product.findMany({ select: { name: true, description: true, imageUrl: true } })
  ])

  const byName = new Map(metadata.map(p => [key(p.name), p]))
  const grouped = new Map<string, {
    id: number
    name: string
    slug: string
    products: Array<{
      id: number
      name: string
      description: string | null
      price: number
      imageUrl: string | null
      featured: boolean
      allowAddons: boolean
      subcategory: string
    }>
  }>()
  const seenProducts = new Map<string, Set<string>>()

  for (const sourceCategory of posMenu.categories) {
    const parentName = parentCategoryName(sourceCategory.name)
    const groupKey = parentName.toLowerCase()
    const inferredSubcategory = categorySuffix(sourceCategory.name)

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        id: posCategoryId(`parent:${parentName}`),
        name: parentName,
        slug: `parent:${parentName}`,
        products: []
      })
      seenProducts.set(groupKey, new Set())
    }

    const targetCategory = grouped.get(groupKey)!
    const seen = seenProducts.get(groupKey)!

    for (const product of sourceCategory.products) {
      const resolvedSubcategory = String(product.subcategory || inferredSubcategory || '').trim()
      const duplicateKey = `${key(resolvedSubcategory)}|${key(product.name)}`
      if (seen.has(duplicateKey)) continue
      seen.add(duplicateKey)

      const savedMedia = parseMenuMedia(settings[menuMediaKey(product.id)])
      const legacyMeta = byName.get(key(product.name))
      targetCategory.products.push({
        id: posProductId(product.id),
        name: product.name,
        description: savedMedia ? savedMedia.description || null : legacyMeta?.description || null,
        price: product.price,
        imageUrl: savedMedia ? savedMedia.imageUrl || null : legacyMeta?.imageUrl || null,
        featured: product.best_seller,
        allowAddons: product.allow_addons,
        subcategory: resolvedSubcategory
      })
    }
  }

  const categories = Array.from(grouped.values())

  const addons = posMenu.addons.map(addon => ({
    id: addon.id,
    name: addon.name,
    nameAr: addon.name_ar,
    priceLbp: addon.price_lbp,
    price: addon.price_usd || Math.round((addon.price_lbp / posMenu.exchange_rate) * 100) / 100
  }))

  return <Storefront categories={categories} settings={settings} addons={addons} exchangeRate={posMenu.exchange_rate} />
}
