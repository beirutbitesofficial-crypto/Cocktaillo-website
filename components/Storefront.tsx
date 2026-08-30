'use client'

import { useEffect, useMemo, useState } from 'react'
import { Instagram, Facebook, MapPin, Minus, Plus, Search, ShoppingBag, X, CheckCircle2, Bike, PackageCheck, CreditCard, Banknote, Phone } from 'lucide-react'

type Addon = { id: string; name: string; nameAr: string; priceLbp: number; price: number }
type Product = { id: number; name: string; description: string | null; price: number; imageUrl: string | null; featured: boolean; allowAddons: boolean; subcategory: string }
type Category = { id: number; name: string; slug: string; products: Product[] }
type Props = { categories: Category[]; settings: Record<string, string>; addons: Addon[]; exchangeRate: number }
type CartItem = Product & { quantity: number; addons: Addon[]; cartKey: string }
type OrderType = 'DELIVERY' | 'TAKEAWAY'
type Payment = 'CASH' | 'WHISH'

const money = (n: number) => `$${n.toFixed(2)}`
const lbp = (n: number) => `${Math.round(n).toLocaleString('en-US')} LBP`
const makeCartKey = (productId: number, selected: Addon[]) => `${productId}:${selected.map(a => a.id).sort().join(',')}`
const addonTotal = (item: Pick<CartItem, 'addons'>) => item.addons.reduce((n, addon) => n + addon.price, 0)

export default function Storefront({ categories, settings, addons, exchangeRate }: Props) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [category, setCategory] = useState('all')
  const [subcategory, setSubcategory] = useState('all')
  const [query, setQuery] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [customizing, setCustomizing] = useState<Product | null>(null)
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [orderType, setOrderType] = useState<OrderType>('TAKEAWAY')
  const [payment, setPayment] = useState<Payment>('CASH')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{ orderNumber: string; total: number } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('cocktaillo-cart')
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed)) return
      setCart(parsed.map((item: any) => {
        const selected = Array.isArray(item.addons) ? item.addons : []
        return {
          ...item,
          subcategory: String(item.subcategory || ''),
          allowAddons: Boolean(item.allowAddons),
          addons: selected,
          cartKey: String(item.cartKey || makeCartKey(Number(item.id), selected))
        }
      }))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('cocktaillo-cart', JSON.stringify(cart))
  }, [cart])

  const selectedCategory = useMemo(
    () => categories.find(c => String(c.id) === category) || null,
    [categories, category]
  )

  const subcategories = useMemo(() => {
    if (!selectedCategory) return []
    return Array.from(new Set(
      selectedCategory.products
        .map(product => product.subcategory.trim())
        .filter(Boolean)
    ))
  }, [selectedCategory])

  const products = useMemo(() => categories
    .flatMap(c => c.products.map(p => ({ ...p, categoryId: c.id, categoryName: c.name })))
    .filter(p => {
      const matchCat = category === 'all' || String(p.categoryId) === category
      const matchSubcategory = subcategory === 'all' || p.subcategory === subcategory
      const matchQuery = !query || `${p.name} ${p.description || ''} ${p.subcategory}`.toLowerCase().includes(query.toLowerCase())
      return matchCat && matchSubcategory && matchQuery
    })
    .sort((a,b) => Number(b.featured) - Number(a.featured)), [categories, category, subcategory, query])

  const count = cart.reduce((n, i) => n + i.quantity, 0)
  const subtotal = cart.reduce((n, i) => n + (i.price + addonTotal(i)) * i.quantity, 0)
  const deliveryFee = orderType === 'DELIVERY' ? Number(settings.deliveryFee || 0) : 0
  const total = subtotal + deliveryFee
  const selectedAddons = addons.filter(addon => selectedAddonIds.includes(addon.id))
  const customTotal = customizing ? customizing.price + selectedAddons.reduce((n, addon) => n + addon.price, 0) : 0

  function selectCategory(value: string) {
    setCategory(value)
    setSubcategory('all')
  }

  function addConfigured(product: Product, selected: Addon[]) {
    const cartKey = makeCartKey(product.id, selected)
    setCart(prev => {
      const found = prev.find(i => i.cartKey === cartKey)
      return found
        ? prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...product, quantity: 1, addons: selected, cartKey }]
    })
    setCustomizing(null)
    setSelectedAddonIds([])
  }

  function add(product: Product) {
    if (product.allowAddons && addons.length) {
      setSelectedAddonIds([])
      setCustomizing(product)
      return
    }
    addConfigured(product, [])
  }

  function change(cartKey: string, delta: number) {
    setCart(prev => prev
      .map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0))
  }

  function toggleAddon(id: string) {
    setSelectedAddonIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function checkout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const payload = {
      type: orderType,
      paymentMethod: payment,
      customerName: String(fd.get('customerName') || ''),
      phone: String(fd.get('phone') || ''),
      address: String(fd.get('address') || ''),
      notes: String(fd.get('notes') || ''),
      paymentReference: String(fd.get('paymentReference') || ''),
      items: cart.map(i => ({ productId: i.id, quantity: i.quantity, addons: i.addons.map(addon => addon.id) }))
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not place order')
      setSuccess({ orderNumber: data.orderNumber, total: data.total })
      setCart([])
      setCheckoutOpen(false)
      setCartOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place order')
    } finally {
      setSubmitting(false)
    }
  }

  const enabled = {
    DELIVERY: settings.deliveryEnabled === 'true',
    TAKEAWAY: settings.takeawayEnabled === 'true'
  }

  return <>
    <header className="siteHeader">
      <div className="container headerInner">
        <a className="brand" href="#top"><img src="/cocktaillo-logo.jpg" alt="Cocktaillo Resto Café" /><span><strong>Cocktaillo</strong><small>Resto - Café</small></span></a>
        <nav><a href="#menu">Menu</a><a href="#order">How to order</a><a href="#contact">Contact</a></nav>
        <button className="cartButton" onClick={() => setCartOpen(true)}><ShoppingBag size={19}/><span>Cart</span>{count > 0 && <b>{count}</b>}</button>
      </div>
    </header>

    <main id="top">
      <section className="hero">
        <div className="container heroGrid">
          <div className="heroCopy">
            <span className="eyebrow">COCKTAILS • COFFEE • FOOD • GOOD TIMES</span>
            <h1>Fresh flavors,<br/><em>made for your moment.</em></h1>
            <p>{settings.tagline || 'Order your Cocktaillo favorites for delivery or takeaway.'}</p>
            <div className="heroActions"><a className="primary" href="#menu">Explore Menu</a><button className="secondary" onClick={() => setCartOpen(true)}>Start Order</button></div>
            <div className="servicePills">
              {enabled.DELIVERY && <span><Bike size={16}/> Delivery</span>}
              {enabled.TAKEAWAY && <span><PackageCheck size={16}/> Takeaway</span>}
            </div>
          </div>
          <div className="heroVisual"><div className="heroPhotoFrame"><img src="/cocktaillo-home-hero.webp" alt="Cocktaillo Resto Café interior" /></div></div>
        </div>
      </section>

      <section className="orderStrip" id="order"><div className="container threeCols">
        <div><Bike/><div><strong>Delivery</strong><small>Order to your doorstep</small></div></div>
        <div><PackageCheck/><div><strong>Take Away</strong><small>Order ahead & pick up</small></div></div>
      </div></section>

      <section className="menuSection" id="menu">
        <div className="container">
          <div className="sectionHeading"><div><span className="eyebrow">OUR MENU</span><h2>What are you craving?</h2></div><p>Freshly prepared, easy to order.</p></div>
          <div className="menuTools">
            <div className="categories"><button className={category === 'all' ? 'active' : ''} onClick={() => selectCategory('all')}>All</button>{categories.map(c => <button key={c.id} className={category === String(c.id) ? 'active' : ''} onClick={() => selectCategory(String(c.id))}>{c.name}</button>)}</div>
            <label className="searchBox"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search menu..." /></label>
          </div>
          {category !== 'all' && subcategories.length > 0 && <div className="categories subcategories">
            <button className={subcategory === 'all' ? 'active' : ''} onClick={() => setSubcategory('all')}>All</button>
            {subcategories.map(name => <button key={name} className={subcategory === name ? 'active' : ''} onClick={() => setSubcategory(name)}>{name}</button>)}
          </div>}
          {products.length ? <div className="productGrid">{products.map(p => <article className="productCard" key={p.id}>
            <div className="productImage">{p.imageUrl ? <img src={p.imageUrl} alt={p.name}/> : <div className="imageFallback"><span>C</span></div>}{p.featured && <span className="featured">Best Seller</span>}{p.allowAddons && addons.length > 0 && <span className="customizableBadge">Customizable</span>}</div>
            <div className="productInfo"><div><h3>{p.name}</h3><p>{p.description || 'Prepared fresh by Cocktaillo.'}</p></div><div className="productBottom"><strong>{money(p.price)}</strong><button onClick={() => add(p)}><Plus size={17}/> {p.allowAddons && addons.length ? 'Customize' : 'Add'}</button></div></div>
          </article>)}</div> : <div className="emptyState">No menu items match your search.</div>}
        </div>
      </section>

      <section className="brandBanner"><div className="container"><div><span className="eyebrow light">COCKTAILLO RESTO - CAFÉ</span><h2>One place. Every mood.</h2><p>From your morning coffee to a late-night bite — Cocktaillo is made for good company and easy ordering.</p></div><a className="creamBtn" href="#menu">Order now</a></div></section>
    </main>

    <footer id="contact"><div className="container footerGrid"><div className="footerBrand"><img src="/cocktaillo-logo.jpg" alt="Cocktaillo"/><p>{settings.restaurantName}</p></div><div><strong>Quick links</strong><a href="#menu">Menu</a><a href="#order">Order options</a></div><div><strong>Connect</strong>{settings.phone && <a href={`tel:${settings.phone}`}><Phone size={15}/>{settings.phone}</a>}{settings.instagram && <a target="_blank" rel="noreferrer" href={settings.instagram}><Instagram size={15}/>Instagram</a>}{settings.facebook && <a target="_blank" rel="noreferrer" href={settings.facebook}><Facebook size={15}/>Facebook</a>}{settings.tiktok && <a target="_blank" rel="noreferrer" href={settings.tiktok}>TikTok</a>}{settings.locationUrl && <a target="_blank" rel="noreferrer" href={settings.locationUrl}><MapPin size={15}/>Location</a>}</div></div><div className="copyright">© {new Date().getFullYear()} Cocktaillo Resto - Café</div></footer>

    {cartOpen && <div className="drawerOverlay" onMouseDown={e => e.target === e.currentTarget && setCartOpen(false)}><aside className="cartDrawer"><div className="drawerHead"><div><small>YOUR ORDER</small><h2>Cart <span>({count})</span></h2></div><button onClick={() => setCartOpen(false)}><X/></button></div>
      <div className="cartItems">{cart.length ? cart.map(i => <div className="cartItem" key={i.cartKey}><div className="cartThumb">{i.imageUrl ? <img src={i.imageUrl} alt={i.name}/> : <span>C</span>}</div><div className="cartText"><strong>{i.name}</strong><small>{money(i.price + addonTotal(i))}</small>{i.addons.length > 0 && <div className="cartAddons">{i.addons.map(addon => <span key={addon.id}>+ {addon.name} {money(addon.price)}</span>)}</div>}<div className="qty"><button onClick={() => change(i.cartKey,-1)}><Minus size={14}/></button><span>{i.quantity}</span><button onClick={() => change(i.cartKey,1)}><Plus size={14}/></button></div></div><strong>{money((i.price + addonTotal(i))*i.quantity)}</strong></div>) : <div className="emptyCart"><ShoppingBag/><h3>Your cart is empty</h3><p>Add something delicious from the menu.</p></div>}</div>
      {cart.length > 0 && <div className="drawerFoot"><div className="subtotal"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><button className="checkoutBtn" onClick={() => setCheckoutOpen(true)}>Continue to checkout <span>{money(subtotal)}</span></button></div>}
    </aside></div>}

    {customizing && <div className="modalOverlay" onMouseDown={e => e.target === e.currentTarget && setCustomizing(null)}><div className="addonModal"><div className="drawerHead"><div><small>CUSTOMIZE</small><h2>{customizing.name}</h2></div><button onClick={() => setCustomizing(null)}><X/></button></div><div className="addonModalBody"><p>Choose any optional add-ons. Prices are synced directly from the POS.</p><div className="addonChooserGrid">{addons.map(addon => { const selected = selectedAddonIds.includes(addon.id); return <button type="button" key={addon.id} className={selected ? 'selected' : ''} onClick={() => toggleAddon(addon.id)}><div><strong>{addon.name}</strong>{addon.nameAr && <small>{addon.nameAr}</small>}</div><span>{money(addon.price)}</span></button> })}</div><div className="addonRateNote">POS rate: 1 USD = {lbp(exchangeRate)}</div></div><div className="addonModalFoot"><div><span>Item</span><b>{money(customizing.price)}</b></div>{selectedAddons.length > 0 && <div><span>Add-ons</span><b>{money(selectedAddons.reduce((n, addon) => n + addon.price, 0))}</b></div>}<div className="addonGrand"><span>Total</span><b>{money(customTotal)}</b></div><button className="placeOrder" onClick={() => addConfigured(customizing, selectedAddons)}>Add to order • {money(customTotal)}</button></div></div></div>}

    {checkoutOpen && <div className="modalOverlay"><div className="checkoutModal"><div className="drawerHead"><div><small>CHECKOUT</small><h2>Complete your order</h2></div><button onClick={() => setCheckoutOpen(false)}><X/></button></div>
      <form onSubmit={checkout}>
        <div className="checkoutSection"><label className="fieldLabel">How would you like your order?</label><div className="optionGrid">
          {enabled.DELIVERY && <button type="button" className={orderType==='DELIVERY'?'selected':''} onClick={()=>setOrderType('DELIVERY')}><Bike/><span>Delivery</span></button>}
          {enabled.TAKEAWAY && <button type="button" className={orderType==='TAKEAWAY'?'selected':''} onClick={()=>setOrderType('TAKEAWAY')}><PackageCheck/><span>Take Away</span></button>}
        </div></div>
        <div className="formGrid"><label>Name<input name="customerName" required placeholder="Your name"/></label><label>Phone<input name="phone" required inputMode="tel" placeholder="03 123 456"/></label>{orderType === 'DELIVERY' && <label className="full">Delivery address<textarea name="address" required placeholder="Area, street, building, floor..."/></label>}<label className="full">Notes <span>(optional)</span><textarea name="notes" placeholder="Any special instructions?"/></label></div>
        <div className="checkoutSection"><label className="fieldLabel">Payment method</label><div className="paymentOptions">{settings.cashEnabled==='true' && <button type="button" className={payment==='CASH'?'selected':''} onClick={()=>setPayment('CASH')}><Banknote/><div><strong>Cash</strong><small>Pay when you receive or collect your order</small></div></button>}{settings.whishEnabled==='true' && <button type="button" className={payment==='WHISH'?'selected':''} onClick={()=>setPayment('WHISH')}><CreditCard/><div><strong>Whish Money</strong><small>Transfer to {settings.whishPhone || 'restaurant Whish number'}</small></div></button>}</div>{payment==='WHISH' && <div className="whishBox"><strong>Send your payment via Whish</strong><p>Whish number: <b>{settings.whishPhone || 'Not configured yet'}</b></p><label>Transfer reference / sender name<input name="paymentReference" placeholder="Optional reference"/></label></div>}</div>
        {error && <div className="errorBox">{error}</div>}
        <div className="checkoutTotal"><div><span>Subtotal</span><b>{money(subtotal)}</b></div>{orderType==='DELIVERY' && <div><span>Delivery fee</span><b>{money(deliveryFee)}</b></div>}<div className="grand"><span>Total</span><b>{money(total)}</b></div></div>
        <button disabled={submitting || !cart.length} className="placeOrder">{submitting ? 'Placing order...' : `Place order • ${money(total)}`}</button>
      </form>
    </div></div>}

    {success && <div className="modalOverlay"><div className="successModal"><CheckCircle2/><span>ORDER RECEIVED</span><h2>Thank you!</h2><p>Your order <strong>#{success.orderNumber}</strong> has been sent to Cocktaillo.</p><div className="successTotal"><span>Total</span><strong>{money(success.total)}</strong></div><button className="primary" onClick={()=>setSuccess(null)}>Done</button></div></div>}
  </>
}
