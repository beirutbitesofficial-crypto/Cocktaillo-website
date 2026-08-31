import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getPosMenu, posProductId, submitWebsiteOrderToPos, type PosAddon, type PosMenuItem } from '@/lib/pos-menu'

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

function clean(value: unknown, max = 700) {
  return String(value || '').trim().slice(0, max)
}

function whatsappNumber(value: string) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = `961${digits.slice(1)}`
  return digits
}

function orderMessage(input: {
  orderNumber: string
  type: 'DELIVERY' | 'TAKEAWAY'
  paymentMethod: 'CASH' | 'WHISH'
  customerName: string
  phone: string
  address: string
  notes: string
  items: ValidItem[]
  total: number
}) {
  const lines = input.items.map(item => {
    const addons = item.selectedAddons.length ? ` + ${item.selectedAddons.map(addon => addon.name).join(', ')}` : ''
    return `• ${item.quantity}x ${item.product!.name}${addons}`
  })
  return [
    `NEW COCKTAILLO WEBSITE ORDER #${input.orderNumber}`,
    `Type: ${input.type === 'DELIVERY' ? 'Delivery' : 'Takeaway'}`,
    `Payment: ${input.paymentMethod}`,
    input.customerName ? `Customer: ${input.customerName}` : '',
    `Phone: ${input.phone}`,
    input.address ? `Address: ${input.address}` : '',
    '',
    ...lines,
    '',
    `Total: $${input.total.toFixed(2)}`,
    input.notes ? `Notes: ${input.notes}` : ''
  ].filter(Boolean).join('\n').slice(0, 3500)
}

async function sendAutomaticWhatsApp(message: string) {
  const token = clean(process.env.WHATSAPP_ACCESS_TOKEN, 500)
  const phoneNumberId = clean(process.env.WHATSAPP_PHONE_NUMBER_ID, 120)
  const recipient = whatsappNumber(clean(process.env.WHATSAPP_ORDER_RECIPIENT, 80))
  if (!token || !phoneNumberId || !recipient) return false

  const version = clean(process.env.WHATSAPP_GRAPH_VERSION || 'v23.0', 20)
  const templateName = clean(process.env.WHATSAPP_ORDER_TEMPLATE_NAME, 120)
  const language = clean(process.env.WHATSAPP_ORDER_TEMPLATE_LANG || 'en_US', 30)

  const payload = templateName
    ? {
        messaging_product: 'whatsapp',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components: [{ type: 'body', parameters: [{ type: 'text', text: message }] }]
        }
      }
    : {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: { preview_url: false, body: message }
      }

  try {
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) {
      console.error('WhatsApp order notification failed', res.status, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (error) {
    console.error('WhatsApp order notification failed', error)
    return false
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>
    const type = String(body.type || '') as 'DELIVERY' | 'TAKEAWAY'
    const paymentMethod = String(body.paymentMethod || '') as 'CASH' | 'WHISH'
    const items: CheckoutItem[] = Array.isArray(body.items) ? body.items as CheckoutItem[] : []
    const clientOrderId = clean(body.clientOrderId, 160)

    if (!['DELIVERY', 'TAKEAWAY'].includes(type)) {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 })
    }
    if (!['CASH', 'WHISH'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }
    if (!items.length) return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 })
    if (!clientOrderId) return NextResponse.json({ error: 'Checkout session expired. Please try again.' }, { status: 400 })

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

    const customerName = clean(body.customerName, 180)
    const phone = clean(body.phone, 80)
    const address = clean(body.address, 700)
    const notes = clean(body.notes, 700)
    const paymentReference = clean(body.paymentReference, 180)
    if (!phone) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    if (type === 'DELIVERY' && !address) {
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
        quantity: Math.max(1, Math.min(50, Math.floor(Number(item.quantity) || 1)))
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

    let posResult: Awaited<ReturnType<typeof submitWebsiteOrderToPos>>
    try {
      posResult = await submitWebsiteOrderToPos({
        external_id: clientOrderId,
        type: type === 'DELIVERY' ? 'delivery' : 'takeaway',
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        delivery_fee_cents: Math.round(deliveryFee * 100),
        customer: { name: customerName, phone, address, notes },
        lines: validItems.map(item => ({
          menu_item_id: item.product!.id,
          quantity: item.quantity,
          addons: item.selectedAddons.map(addon => ({ id: addon.id, quantity: 1 })),
          note: ''
        }))
      })
    } catch (error) {
      console.error('POS order creation failed', error)
      return NextResponse.json({ error: 'Could not send the order to Cocktaillo POS. Please try again.' }, { status: 503 })
    }

    const orderNumber = String(posResult.order.number)
    const posTotalCents = Number(posResult.order.totals?.total_equivalent_cents || 0)
    const confirmedTotal = posTotalCents > 0 ? posTotalCents / 100 : total
    const mirrorOrderNumber = `POS-${orderNumber}`

    try {
      await db.order.upsert({
        where: { orderNumber: mirrorOrderNumber },
        update: {},
        create: {
          orderNumber: mirrorOrderNumber,
          type,
          paymentMethod,
          customerName: customerName || null,
          phone: phone || null,
          address: address || null,
          notes: notes || null,
          paymentReference: paymentReference || null,
          subtotal,
          deliveryFee,
          total: confirmedTotal,
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
    } catch (error) {
      console.error('Website order mirror failed after POS accepted order', error)
    }

    const message = orderMessage({ orderNumber, type, paymentMethod, customerName, phone, address, notes, items: validItems, total: confirmedTotal })
    const recipient = whatsappNumber(settings.whatsapp || settings.phone || '')
    const whatsappUrl = recipient ? `https://wa.me/${recipient}?text=${encodeURIComponent(message)}` : ''
    const whatsappSent = await sendAutomaticWhatsApp(message)

    return NextResponse.json({
      ok: true,
      orderNumber,
      total: confirmedTotal,
      posOrderId: posResult.order.id,
      duplicate: posResult.duplicate,
      whatsappSent,
      whatsappUrl
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Could not place order. Please try again.' }, { status: 500 })
  }
}
