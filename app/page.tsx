import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import Storefront from '@/components/Storefront'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [categories, settings] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { products: { where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } }
    }),
    getSettings()
  ])
  return <Storefront categories={categories} settings={settings} />
}
