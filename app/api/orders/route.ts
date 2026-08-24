import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/settings'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const type = String(body.type || '') as 'DELIVERY' | 'TAKEAWAY'
    const paymentMethod = String(body.paymentMethod || '') as 'CASH' | 'WHISH'
    const items = Array.isArray(body.items) ? body.items : []

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

    const ids = items.map((i: any) => Number(i.productId)).filter(Number.isFinite)
    const products = await db.product.findMany({ where: { id: { in: ids }, active: true } })
    const map = new Map(products.map(p => [p.id, p]))
    const validItems = items
      .map((i: any) => ({
        product: map.get(Number(i.productId)),
        quantity: Math.max(1, Math.min(50, Number(i.quantity) || 1))
      }))
      .filter((i: any) => i.product)

    if (!validItems.length) {
      return NextResponse.json({ error: 'No valid products in cart' }, { status: 400 })
    }

    const subtotal = validItems.reduce((n: number, i: any) => n + i.product.price * i.quantity, 0)
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
          create: validItems.map((i: any) => ({
            productId: i.product.id,
            name: i.product.name,
            price: i.product.price,
            quantity: i.quantity
          }))
        }
      }
    })

    return NextResponse.json({ ok: true, orderNumber: order.orderNumber, total: order.total })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Could not place order. Please try again.' }, { status: 500 })
  }
}
