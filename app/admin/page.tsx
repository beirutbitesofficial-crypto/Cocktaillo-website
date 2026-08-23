import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminShell from '@/components/AdminShell'
import { ClipboardList, DollarSign, ShoppingBag, Clock3 } from 'lucide-react'

export const dynamic = 'force-dynamic'
export default async function AdminDashboard() {
  await requireAdmin()
  const [totalOrders, openOrders, products, revenue, recent] = await Promise.all([
    db.order.count(), db.order.count({ where: { status: { in: ['NEW','CONFIRMED','PREPARING','READY'] } } }), db.product.count(),
    db.order.aggregate({ _sum: { total: true }, where: { status: { not: 'CANCELLED' } } }),
    db.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { items: true } })
  ])
  return <AdminShell active="dashboard"><div className="adminTitle"><div><span>OVERVIEW</span><h1>Dashboard</h1><p>Live overview of Cocktaillo orders and menu activity.</p></div><a className="adminPrimary" href="/admin/orders">Manage orders</a></div><div className="statsGrid"><Stat icon={<ClipboardList/>} label="Total orders" value={String(totalOrders)}/><Stat icon={<Clock3/>} label="Active orders" value={String(openOrders)}/><Stat icon={<ShoppingBag/>} label="Menu items" value={String(products)}/><Stat icon={<DollarSign/>} label="Order value" value={`$${(revenue._sum.total || 0).toFixed(2)}`}/></div><section className="adminPanel"><div className="panelHead"><div><h2>Recent orders</h2><p>Newest customer orders</p></div><a href="/admin/orders">View all</a></div><div className="tableWrap"><table><thead><tr><th>Order</th><th>Type</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>{recent.map(o => <tr key={o.id}><td><b>#{o.orderNumber}</b><small>{o.createdAt.toLocaleString()}</small></td><td>{o.type.replace('_',' ')}</td><td>{o.customerName || o.tableNumber && `Table ${o.tableNumber}` || 'Guest'}</td><td>{o.items.reduce((n,i)=>n+i.quantity,0)}</td><td><b>${o.total.toFixed(2)}</b></td><td><span className={`status s-${o.status.toLowerCase()}`}>{o.status}</span></td></tr>)}</tbody></table>{!recent.length && <div className="adminEmpty">No orders yet.</div>}</div></section></AdminShell>
}
function Stat({icon,label,value}:{icon:React.ReactNode,label:string,value:string}){return <div className="statCard"><div className="statIcon">{icon}</div><div><small>{label}</small><strong>{value}</strong></div></div>}
