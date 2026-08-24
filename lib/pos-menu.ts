const DEFAULT_POS_URL = 'https://indigo-ape-952022.hostingersite.com'

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
