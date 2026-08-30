import { requireAdmin } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import AdminShell from '@/components/AdminShell'
import HeroImageEditor from '@/components/HeroImageEditor'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin()
  const settings = await getSettings()
  const sp = await searchParams
  const hasHeroImage = Number(settings.heroImageChunkCount || 0) > 0

  return <AdminShell active="settings">
    <div className="adminTitle"><div><span>RESTAURANT SETTINGS</span><h1>Settings</h1><p>Control the homepage image, payments, order methods, contact details and social links.</p></div></div>
    {sp.saved && <div className="adminSuccess">Settings saved successfully.</div>}
    <form className="settingsGrid" method="post" action="/api/admin/settings">
      <section className="adminPanel">
        <div className="panelHead"><div><h2>Restaurant</h2><p>Public website information</p></div></div>
        <div className="adminForm">
          <label>Restaurant name<input name="restaurantName" defaultValue={settings.restaurantName}/></label>
          <label>Tagline<input name="tagline" defaultValue={settings.tagline}/></label>
          <label>Phone<input name="phone" defaultValue={settings.phone}/></label>
          <label>WhatsApp<input name="whatsapp" defaultValue={settings.whatsapp}/></label>
          <label>Google Maps / Location URL<input name="locationUrl" defaultValue={settings.locationUrl}/></label>
        </div>
      </section>

      <section className="adminPanel heroImageAdminPanel">
        <div className="panelHead"><div><h2>Home hero image</h2><p>Background behind “Fresh flavors, made for your moment.”</p></div></div>
        <HeroImageEditor initialImageUrl={hasHeroImage ? '/api/hero-image' : ''}/>
      </section>

      <section className="adminPanel">
        <div className="panelHead"><div><h2>Payments</h2><p>Cash and Whish Money</p></div></div>
        <div className="adminForm">
          <label className="switchRow"><span><b>Cash payment</b><small>Allow cash on delivery or pickup</small></span><input type="checkbox" name="cashEnabled" defaultChecked={settings.cashEnabled === 'true'}/></label>
          <label className="switchRow"><span><b>Whish Money</b><small>Allow manual Whish transfers</small></span><input type="checkbox" name="whishEnabled" defaultChecked={settings.whishEnabled === 'true'}/></label>
          <label>Whish phone number<input name="whishPhone" defaultValue={settings.whishPhone} placeholder="+961 ..."/></label>
        </div>
      </section>

      <section className="adminPanel">
        <div className="panelHead"><div><h2>Ordering</h2><p>Enable or disable service types</p></div></div>
        <div className="adminForm">
          <label className="switchRow"><span><b>Delivery</b><small>Customer enters phone and address</small></span><input type="checkbox" name="deliveryEnabled" defaultChecked={settings.deliveryEnabled === 'true'}/></label>
          <label>Delivery fee (USD)<input type="number" step="0.01" min="0" name="deliveryFee" defaultValue={settings.deliveryFee}/></label>
          <label className="switchRow"><span><b>Take away</b><small>Customer orders before pickup</small></span><input type="checkbox" name="takeawayEnabled" defaultChecked={settings.takeawayEnabled === 'true'}/></label>
        </div>
      </section>

      <section className="adminPanel">
        <div className="panelHead"><div><h2>Social media</h2><p>Links shown on the website</p></div></div>
        <div className="adminForm">
          <label>Instagram URL<input name="instagram" defaultValue={settings.instagram} placeholder="https://instagram.com/..."/></label>
          <label>Facebook URL<input name="facebook" defaultValue={settings.facebook}/></label>
          <label>TikTok URL<input name="tiktok" defaultValue={settings.tiktok}/></label>
          <label>Al Qaima menu source<input name="menuSourceUrl" defaultValue={settings.menuSourceUrl}/></label>
        </div>
      </section>

      <div className="settingsSave"><button className="adminPrimary">Save all settings</button></div>
    </form>
  </AdminShell>
}
