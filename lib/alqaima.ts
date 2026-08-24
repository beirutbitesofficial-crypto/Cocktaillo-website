import * as cheerio from 'cheerio'

export type ImportedItem = { name: string; description?: string; price: number; imageUrl?: string; category: string }

const clean = (s?: string | null) => (s || '').replace(/\s+/g, ' ').trim()
const money = (text: string) => {
  const m = text.match(/\$\s*([0-9]+(?:\.[0-9]{1,2})?)/)
  return m ? Number(m[1]) : null
}

function walkJson(value: unknown, out: ImportedItem[]) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach(v => walkJson(v, out))
    return
  }

  const obj = value as Record<string, unknown>
  const name = typeof obj.name === 'string' ? clean(obj.name) : ''
  const priceRaw = obj.price ?? obj.priceUSD ?? obj.price_usd
  const p = typeof priceRaw === 'number'
    ? priceRaw
    : typeof priceRaw === 'string'
      ? Number(priceRaw.replace(/[^0-9.]/g, ''))
      : NaN

  if (name && Number.isFinite(p) && p >= 0) {
    const categoryObj = obj.category as Record<string, unknown> | string | undefined
    const category = typeof categoryObj === 'string'
      ? clean(categoryObj)
      : categoryObj && typeof categoryObj.name === 'string'
        ? clean(categoryObj.name as string)
        : 'Menu'
    const desc = typeof obj.description === 'string' ? clean(obj.description) : undefined
    const img = typeof obj.image === 'string'
      ? obj.image
      : typeof obj.imageUrl === 'string'
        ? obj.imageUrl
        : undefined
    out.push({ name, description: desc, price: p, imageUrl: img, category })
  }

  Object.values(obj).forEach(v => walkJson(v, out))
}

export async function fetchAlqaimaMenu(url: string): Promise<ImportedItem[]> {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      'pragma': 'no-cache',
      'referer': 'https://alqaima.com/',
      'upgrade-insecure-requests': '1'
    },
    cache: 'no-store',
    redirect: 'follow'
  })

  if (!res.ok) throw new Error(`Menu source returned ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)
  const items: ImportedItem[] = []

  $('script').each((_, el) => {
    const type = $(el).attr('type') || ''
    const text = $(el).html() || ''
    if (!text || (!type.includes('json') && !text.trim().startsWith('{') && !text.trim().startsWith('['))) return
    try { walkJson(JSON.parse(text), items) } catch {}
  })

  $('h3').each((_, el) => {
    const name = clean($(el).text())
    if (!name || /items?|categories|featured/i.test(name)) return
    let container = $(el).parent()
    for (let i = 0; i < 4; i++) {
      const t = clean(container.text())
      if (/\$\s*[0-9]/.test(t) || /Category\s*:/i.test(t) || /Add to Cart|\bAdd\b/i.test(t)) break
      container = container.parent()
    }

    const text = clean(container.text())
    const price = money(text)
    if (price === null) return
    const categoryMatch = text.match(/Category\s*:\s*([^$]+?)(?:Add|\$|$)/i)
    let category = clean(categoryMatch?.[1]) || 'Menu'
    if (category.length > 60) category = 'Menu'
    const img = container.find('img').first().attr('src')
    const paragraphs = container.find('p').map((_, p) => clean($(p).text())).get().filter(Boolean)
    const description = paragraphs.find(p => p !== name && !p.includes('$') && !/Category:/i.test(p))
    items.push({ name, description, price, imageUrl: img, category })
  })

  const dedup = new Map<string, ImportedItem>()
  for (const item of items) {
    const key = item.name.toLowerCase()
    if (!dedup.has(key) || (dedup.get(key)?.category === 'Menu' && item.category !== 'Menu')) {
      dedup.set(key, item)
    }
  }

  return [...dedup.values()].filter(i => i.name.length < 120)
}
