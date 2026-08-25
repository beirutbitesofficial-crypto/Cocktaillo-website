import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { getPosBaseUrl, getPosMenu } from '@/lib/pos-menu'
import { getSettings } from '@/lib/settings'
import { menuMediaKey, parseMenuMedia } from '@/lib/menu-media'
import AdminShell from '@/components/AdminShell'
import MenuMediaEditor from '@/components/MenuMediaEditor'

export const dynamic = 'force-dynamic'

const nameKey = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ')

export default async function ProductsPage() {
  await requireAdmin()

  let posMenu
  try {
    posMenu = await getPosMenu()
  } catch (error) {
    console.error('Could not load POS menu in website admin', error)
    return <AdminShell active="products">
      <div className="adminTitle"><div><span>MENU MANAGEMENT</span><h1>Menu images</h1><p>The POS is the source of truth for website menu items.</p></div></div>
      <div className="adminError">Could not connect to the Cocktaillo POS menu right now. Make sure the POS deployment is online, then refresh this page.</div>
    </AdminShell>
  }

  const [settings, oldMetadata] = await Promise.all([
    getSettings(),
    db.product.findMany({ select: { name: true, imageUrl: true, description: true } })
  ])
  const oldByName = new Map(oldMetadata.map(product => [nameKey(product.name), product]))

  const items = posMenu.items.map(item => {
    const saved = parseMenuMedia(settings[menuMediaKey(item.id)])
    const legacy = oldByName.get(nameKey(item.name))
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      price: item.price,
      bestSeller: item.best_seller,
      imageUrl: saved ? saved.imageUrl || null : legacy?.imageUrl || null,
      description: saved ? saved.description || null : legacy?.description || null
    }
  })

  return <AdminShell active="products">
    <div className="adminTitle">
      <div><span>MENU MANAGEMENT</span><h1>Menu images</h1><p>Upload photos and website descriptions for the live POS menu.</p></div>
      <a className="adminPrimary" href={getPosBaseUrl()} target="_blank" rel="noreferrer">Open POS</a>
    </div>
    <div className="posMediaIntro"><strong>POS → Website:</strong> item names, categories, prices, availability and Best Seller status come from the POS. Here you only manage each item&apos;s website photo and description. Photos are compressed automatically on your phone before saving.</div>
    <MenuMediaEditor items={items}/>
  </AdminShell>
}
