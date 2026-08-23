import Link from 'next/link'
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Settings, LogOut, ExternalLink } from 'lucide-react'

export default function AdminShell({ children, active }: { children: React.ReactNode; active: string }) {
  const links = [
    ['dashboard','/admin',LayoutDashboard,'Dashboard'],['orders','/admin/orders',ClipboardList,'Orders'],['products','/admin/products',UtensilsCrossed,'Menu'],['settings','/admin/settings',Settings,'Settings']
  ] as const
  return <div className="adminApp"><aside className="adminSidebar"><div className="adminBrand"><img src="/cocktaillo-logo.jpg"/><div><strong>Cocktaillo</strong><small>CONTROL PANEL</small></div></div><nav>{links.map(([id,href,Icon,label]) => <Link className={active===id?'active':''} href={href} key={id}><Icon size={18}/>{label}</Link>)}</nav><div className="sideBottom"><a href="/" target="_blank"><ExternalLink size={17}/>View website</a><form action="/api/admin/logout" method="post"><button><LogOut size={17}/>Sign out</button></form></div></aside><div className="adminMain"><header className="adminTop"><div><span>COCKTAILLO RESTO - CAFÉ</span><b>Administration</b></div><a href="/" target="_blank">Open storefront <ExternalLink size={14}/></a></header><main className="adminContent">{children}</main></div></div>
}
