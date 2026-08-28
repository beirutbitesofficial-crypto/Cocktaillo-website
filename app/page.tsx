import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getPosMenu, posCategoryId, posProductId } from '@/lib/pos-menu'
import { menuMediaKey, parseMenuMedia } from '@/lib/menu-media'
import Storefront from '@/components/Storefront'

export const dynamic = 'force-dynamic'

const key = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ')
const parentCategoryName = (value: string) => String(value || '').split('>')[0].trim() || String(value || '').trim()
const categorySuffix = (value: string) => String(value || '').split('>').slice(1).join('>').trim()
const normalizedName = (value: string) => key(value).replace(/\s+/g, ' ').trim()
const numericSignature = (value: string) => (normalizedName(value).match(/\d+(?:\/\d+)?/g) || []).join('|')

function editDistanceWithin(left: string, right: string, maxDistance: number) {
  if (Math.abs(left.length - right.length) > maxDistance) return false
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let i = 1; i <= left.length; i += 1) {
    const current = new Array<number>(right.length + 1)
    current[0] = i
    let rowMin = current[0]

    for (let j = 1; j <= right.length; j += 1) {
      const substitution = previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution)
      rowMin = Math.min(rowMin, current[j])
    }

    if (rowMin > maxDistance) return false
    previous = current
  }

  return previous[right.length] <= maxDistance
}

function sameProductName(leftValue: string, rightValue: string) {
  const left = normalizedName(leftValue)
  const right = normalizedName(rightValue)
  if (left === right) return true

  // Never collapse size/quantity variants such as 6 pcs vs 12 pcs or 1 kg vs 1/2 kg.
  if (numericSignature(left) !== numericSignature(right)) return false

  const compactLeft = left.replace(/\s+/g, '')
  const compactRight = right.replace(/\s+/g, '')
  const shortest = Math.min(compactLeft.length, compactRight.length)
  if (shortest < 5) return false

  // Catch safe spelling variants such as Ferrero/Frero and Marshmallow/Marchmellow.
  const maxDistance = shortest >= 12 ? 2 : 1
  return editDistanceWithin(compactLeft, compactRight, maxDistance)
}

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
  const seenProducts = new Map<string, Map<string, string[]>>()

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
      seenProducts.set(groupKey, new Map())
    }

    const targetCategory = grouped.get(groupKey)!
    const seenBySubcategory = seenProducts.get(groupKey)!

    for (const product of sourceCategory.products) {
      const resolvedSubcategory = String(product.subcategory || inferredSubcategory || '').trim()
      const subcategoryKey = key(resolvedSubcategory)
      if (!seenBySubcategory.has(subcategoryKey)) seenBySubcategory.set(subcategoryKey, [])
      const seenNames = seenBySubcategory.get(subcategoryKey)!

      if (seenNames.some(name => sameProductName(name, product.name))) continue
      seenNames.push(product.name)

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
