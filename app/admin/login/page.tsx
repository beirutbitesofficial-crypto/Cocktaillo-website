import { isAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect('/admin')
  const sp = await searchParams
  return <div className="adminLoginPage"><div className="loginCard"><img src="/cocktaillo-logo.jpg" alt="Cocktaillo"/><span>COCKTAILLO CONTROL</span><h1>Admin login</h1><p>Manage menu, orders, payments and restaurant settings.</p>{sp.error && <div className="adminError">Incorrect email or password.</div>}<form method="post" action="/api/admin/login"><label>Email<input type="email" name="email" required autoComplete="email"/></label><label>Password<input type="password" name="password" required autoComplete="current-password"/></label><button>Sign in</button></form><a href="/">← Back to website</a></div></div>
}
