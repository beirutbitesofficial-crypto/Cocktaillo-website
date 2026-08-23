import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminShell from '@/components/AdminShell'

export const dynamic = 'force-dynamic'
export default async function OrdersPage() {
  await requireAdmin()
  const orders = await db.order.findMany({ orderBy: { createdAt: 'desc' }, include: { items: true }, take: 200 })
  return <AdminShell active="orders"><div className="adminTitle"><div><span>ORDER MANAGEMENT</span><h1>Orders</h1><p>Confirm, prepare and complete incoming orders.</p></div></div><div className="ordersGrid">{orders.map(o => <article className="orderCard" key={o.id}><div className="orderCardHead"><div><span>#{o.orderNumber}</span><small>{o.createdAt.toLocaleString()}</small></div><span className={`status s-${o.status.toLowerCase()}`}>{o.status}</span></div><div className="orderMeta"><div><small>ORDER TYPE</small><b>{o.type.replace('_',' ')}</b></div><div><small>PAYMENT</small><b>{o.paymentMethod}{o.paymentReference ? ` • ${o.paymentReference}` : ''}</b></div>{o.tableNumber && <div><small>TABLE</small><b>{o.tableNumber}</b></div>}</div><div className="customerBox"><b>{o.customerName || 'Guest'}</b>{o.phone && <span>{o.phone}</span>}{o.address && <span>{o.address}</span>}</div><div className="orderItems">{o.items.map(i => <div key={i.id}><span>{i.quantity}× {i.name}</span><b>${(i.price*i.quantity).toFixed(2)}</b></div>)}</div>{o.notes && <div className="noteBox"><small>NOTE</small>{o.notes}</div>}<div className="orderTotal"><span>Total</span><strong>${o.total.toFixed(2)}</strong></div><form className="statusForm" method="post" action="/api/admin/orders"><input type="hidden" name="id" value={o.id}/><select name="status" defaultValue={o.status}>{['NEW','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED'].map(s=><option key={s}>{s}</option>)}</select><button>Update</button></form></article>)}{!orders.length && <div className="adminEmpty">No orders yet. New online orders will appear here.</div>}</div></AdminShell>
}
