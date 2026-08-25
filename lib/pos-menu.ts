const DEFAULT_POS_URL = 'https://indigo-ape-952022.hostingersite.com'

export type PosAddon = {
  id: string
  name: string
  name_ar: string
  price_lbp: number
  price_usd: number
}

export type PosMenuItem = {
  id: string
  name: string
  name_ar: string
  category: string
  subcategory: string
  price: number
  allow_addons: boolean
  best_seller: boolean
  sort_order: number
}

export type PosMenuCategory = {
  id: string
  name: string
  products: PosMenuItem[]
}

export type PosMenuFeed = {
  source: 'cocktaillo-pos'
  generated_at: string
  exchange_rate: number
  addons: PosAddon[]
  categories: PosMenuCategory[]
  items: PosMenuItem[]
}

function stableNumericId(value: string) {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 1) || 1
}

export const posProductId = (sourceId: string) => stableNumericId(`product:${sourceId}`)
export const posCategoryId = (sourceId: string) => stableNumericId(`category:${sourceId}`)

export function getPosBaseUrl() {
  return String(process.env.COCKTAILLO_POS_URL || DEFAULT_POS_URL).replace(/\/+$/, '')
}

export async function getPosMenu(): Promise<PosMenuFeed> {
  const res = await fetch(`${getPosBaseUrl()}/api/public-menu`, {
    cache: 'no-store',
    headers: { accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`Cocktaillo POS menu returned ${res.status}`)
  const raw = await res.json() as Partial<PosMenuFeed>
  if (raw.source !== 'cocktaillo-pos' || !Array.isArray(raw.categories) || !Array.isArray(raw.items)) {
    throw new Error('Cocktaillo POS returned an invalid menu feed')
  }

  const normalizeItem = (item: PosMenuItem): PosMenuItem => ({ ...item, allow_addons: Boolean(item.allow_addons) })
  return {
    source: 'cocktaillo-pos',
    generated_at: String(raw.generated_at || ''),
    exchange_rate: Math.max(1, Number(raw.exchange_rate) || 89500),
    addons: Array.isArray(raw.addons) ? raw.addons.map(addon => ({
      id: String(addon.id),
      name: String(addon.name || ''),
      name_ar: String(addon.name_ar || ''),
      price_lbp: Math.max(0, Number(addon.price_lbp) || 0),
      price_usd: Math.max(0, Number(addon.price_usd) || 0)
    })) : [],
    items: raw.items.map(normalizeItem),
    categories: raw.categories.map(category => ({
      ...category,
      products: Array.isArray(category.products) ? category.products.map(normalizeItem) : []
    }))
  }
}
