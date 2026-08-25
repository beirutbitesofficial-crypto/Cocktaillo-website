import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getPosMenu, posProductId, type PosAddon, type PosMenuItem } from '@/lib/pos-menu'

type CheckoutItem = {
  productId: number | string
  quantity?: number
  addons?: unknown[]
}

type ValidItem = {
  product: PosMenuItem | undefined
  selectedAddons: PosAddon[]
  addonsValid: boolean
  quantity: number
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>
    const type = String(body.type || '') as 'DELIVERY' | 'TAKEAWAY'
    const paymentMethod = String(body.paymentMethod || '') as 'CASH' | 'WHISH'
    const items: CheckoutItem[] = Array.isArray(body.items) ? body.items as CheckoutItem[] : []

    if (!['DELIVERY', 'TAKEAWAY'].includes(type)) {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 })
    }
    if (!['CASH', 'WHISH'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }
    if (!items.length) return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 })

    const settings = await getSettings()
    const serviceKey = type === 'DELIVERY' ? 'deliveryEnabled' : 'takeawayEnabled'
    if (settings[serviceKey] !== 'true') {
      return NextResponse.json({ error: 'This order method is currently unavailable' }, { status: 400 })
    }
    if (paymentMethod === 'CASH' && settings.cashEnabled !== 'true') {
      return NextResponse.json({ error: 'Cash payment is currently unavailable' }, { status: 400 })
    }
    if (paymentMethod === 'WHISH' && settings.whishEnabled !== 'true') {
      return NextResponse.json({ error: 'Whish payment is currently unavailable' }, { status: 400 })
    }
    if (paymentMethod === 'WHISH' && !settings.whishPhone.trim()) {
      return NextResponse.json({ error: 'Whish payment has not been configured yet' }, { status: 400 })
    }
    if (!String(body.phone || '').trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }
    if (type === 'DELIVERY' && !String(body.address || '').trim()) {
      return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 })
    }

    let posMenu: Awaited<ReturnType<typeof getPosMenu>>
    try {
      posMenu = await getPosMenu()
    } catch (error) {
      console.error('POS menu unavailable during checkout', error)
      return NextResponse.json({ error: 'Menu is temporarily unavailable. Please try again.' }, { status: 503 })
    }

    const productMap = new Map<number, PosMenuItem>()
    for (const product of posMenu.items) {
      const id = posProductId(product.id)
      const existing = productMap.get(id)
      if (existing && existing.id !== product.id) throw new Error('POS menu id collision')
      productMap.set(id, product)
    }
    const addonMap = new Map<string, PosAddon>(posMenu.addons.map((addon: PosAddon) => [addon.id, addon]))

    const validItems: ValidItem[] = items.map((item: CheckoutItem): ValidItem => {
      const product = productMap.get(Number(item.productId))
      const requestedAddonIds: string[] = Array.from(new Set<string>(
        Array.isArray(item.addons) ? item.addons.map((id: unknown) => String(id)) : []
      ))
      const selectedAddons: PosAddon[] = requestedAddonIds
        .map((id: string) => addonMap.get(id))
        .filter((addon: PosAddon | undefined): addon is PosAddon => Boolean(addon))
      const addonsValid = requestedAddonIds.length === selectedAddons.length && (!requestedAddonIds.length || Boolean(product?.allow_addons))
      return {
        product,
        selectedAddons,
        addonsValid,
        quantity: Math.max(1, Math.min(50, Number(item.quantity) || 1))
      }
    })

    if (!validItems.length || validItems.some((item: ValidItem) => !item.product || !item.addonsValid)) {
      return NextResponse.json({ error: 'One or more menu items or add-ons changed. Please refresh your cart.' }, { status: 400 })
    }

    const rate = Math.max(1, Number(posMenu.exchange_rate) || 89500)
    const baseSubtotalCents = validItems.reduce((sum: number, item: ValidItem) => sum + Math.round(Number(item.product!.price) * 100) * item.quantity, 0)
    const addonLbpTotal = validItems.reduce((sum: number, item: ValidItem) => sum + item.selectedAddons.reduce((addonSum: number, addon: PosAddon) => addonSum + Number(addon.price_lbp || 0), 0) * item.quantity, 0)
    const addonEquivalentCents = Math.round((addonLbpTotal / rate) * 100)
    const subtotal = (baseSubtotalCents + addonEquivalentCents) / 100
    const deliveryFee = type === 'DELIVERY' ? Math.max(0, Number(settings.deliveryFee) || 0) : 0
    const total = subtotal + deliveryFee
    const orderNumber = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`

    const order = await db.order.create({
      data: {
        orderNumber,
        type,
        paymentMethod,
        customerName: String(body.customerName || '').trim() || null,
        phone: String(body.phone || '').trim() || null,
        address: String(body.address || '').trim() || null,
        notes: String(body.notes || '').trim() || null,
        paymentReference: String(body.paymentReference || '').trim() || null,
        subtotal,
        deliveryFee,
        total,
        items: {
          create: validItems.map((item: ValidItem) => {
            const addonNames = item.selectedAddons.map((addon: PosAddon) => addon.name).filter(Boolean)
            const addonUnitCents = Math.round((item.selectedAddons.reduce((sum: number, addon: PosAddon) => sum + Number(addon.price_lbp || 0), 0) / rate) * 100)
            return {
              productId: null,
              name: addonNames.length ? `${item.product!.name} + ${addonNames.join(', ')}` : item.product!.name,
              price: (Math.round(Number(item.product!.price) * 100) + addonUnitCents) / 100,
              quantity: item.quantity
            }
          })
        }
      }
    })

    return NextResponse.json({ ok: true, orderNumber: order.orderNumber, total: order.total })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Could not place order. Please try again.' }, { status: 500 })
  }
}
