const DEFAULT_POS_URL = 'https://indigo-ape-952022.hostingersite.com'
const HASH_MASK = (1n << 53n) - 1n

export type PosMenuItem = {
  id: string
  name: string
  name_ar: string
  category: string
  subcategory: string
  price: number
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
  categories: PosMenuCategory[]
  items: PosMenuItem[]
}

function stableNumericId(value: string) {
  let hash = 1469598103934665603n
  for (const ch of value) {
    hash ^= BigInt(ch.codePointAt(0) || 0)
    hash = BigInt.asUintN(64, hash * 1099511628211n)
  }
  const id = Number(hash & HASH_MASK)
  return id || 1
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
  const data = await res.json() as Partial<PosMenuFeed>
  if (data.source !== 'cocktaillo-pos' || !Array.isArray(data.categories) || !Array.isArray(data.items)) {
    throw new Error('Cocktaillo POS returned an invalid menu feed')
  }
  return data as PosMenuFeed
}
