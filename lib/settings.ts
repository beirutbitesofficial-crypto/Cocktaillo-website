import { db } from './db'

export const defaultSettings: Record<string, string> = {
  restaurantName: 'Cocktaillo Resto - Café',
  tagline: 'Fresh flavors. Good moments.',
  phone: '',
  whatsapp: '',
  whishEnabled: 'true',
  whishPhone: '',
  cashEnabled: 'true',
  deliveryEnabled: 'true',
  takeawayEnabled: 'true',
  dineInEnabled: 'true',
  deliveryFee: '0',
  instagram: '',
  facebook: '',
  tiktok: '',
  locationUrl: '',
  menuSourceUrl: 'https://alqaima.com/menu/cocktaillo-resto-cafe/en'
}

export async function getSettings() {
  const rows = await db.setting.findMany()
  const merged = { ...defaultSettings }
  for (const row of rows) merged[row.key] = row.value
  return merged
}

export function boolSetting(value?: string) { return value === 'true' }
