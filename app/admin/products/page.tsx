import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import AdminShell from '@/components/AdminShell'

export const dynamic = 'force-dynamic'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    imported?: string
    error?: string
    created?: string
    updated?: string
    productError?: string
  }>
}) {
  await requireAdmin()
  const sp = await searchParams

  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { products: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
  })

  return (
    <AdminShell active="products">
      <div className="adminTitle">
        <div>
          <span>MENU MANAGEMENT</span>
          <h1>Menu</h1>
          <p>Edit categories, products, prices, availability and images.</p>
        </div>
        <form method="post" action="/api/admin/import">
          <button className="adminPrimary">Import from Al Qaima</button>
        </form>
      </div>

      {sp.imported && <div className="adminSuccess">Menu imported successfully: {sp.imported} items.</div>}
      {sp.created && <div className="adminSuccess">Menu item added successfully.</div>}
      {sp.updated && <div className="adminSuccess">Menu item updated successfully.</div>}
      {sp.error && <div className="adminError">Menu import failed. You can still manage items manually below.</div>}
      {sp.productError && <div className="adminError">Could not save the menu item. Check its name, price and category.</div>}

      <div className="adminTwoCol">
        <section className="adminPanel">
          <div className="panelHead">
            <div>
              <h2>Categories</h2>
              <p>Organize your menu</p>
            </div>
          </div>
          <form className="inlineCreate" method="post" action="/api/admin/categories">
            <input type="hidden" name="action" value="create" />
            <input name="name" required placeholder="New category name" />
            <button>Add</button>
          </form>
          <div className="simpleList">
            {categories.map((c) => (
              <form method="post" action="/api/admin/categories" key={c.id}>
                <input type="hidden" name="id" value={c.id} />
                <input name="name" defaultValue={c.name} />
                <label className="toggleLine">
                  <input type="checkbox" name="active" defaultChecked={c.active} /> Active
                </label>
                <button name="action" value="update">Save</button>
                <button className="dangerGhost" name="action" value="delete">Delete</button>
              </form>
            ))}
          </div>
        </section>

        <section className="adminPanel">
          <div className="panelHead">
            <div>
              <h2>Add product</h2>
              <p>Create a new menu item</p>
            </div>
          </div>
          <form className="adminForm" method="post" action="/api/admin/products">
            <input type="hidden" name="action" value="create" />
            <label>
              Name
              <input name="name" required />
            </label>
            <div className="formRow">
              <label>
                Price (USD)
                <input name="price" type="number" step="0.01" min="0" required />
              </label>
              <label>
                Category
                <select name="categoryId" required>
                  {categories.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea name="description" />
            </label>
            <label>
              Image URL
              <input name="imageUrl" placeholder="https://..." />
            </label>
            <div className="checkRow">
              <label><input type="checkbox" name="active" defaultChecked />Active</label>
              <label><input type="checkbox" name="featured" />Featured</label>
            </div>
            <button className="adminPrimary">Add product</button>
          </form>
        </section>
      </div>

      <section className="adminPanel productAdminPanel">
        <div className="panelHead">
          <div>
            <h2>Edit menu items</h2>
            <p>{categories.reduce((n, c) => n + c.products.length, 0)} menu items — change price or any item details, then save.</p>
          </div>
        </div>
        <div className="productAdminGrid">
          {categories.flatMap((c) => c.products.map((p) => (
            <form className="productEditCard" method="post" action="/api/admin/products" key={p.id}>
              <input type="hidden" name="id" value={p.id} />
              <div className="editImage">{p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <span>C</span>}</div>
              <div className="editFields">
                <input className="nameInput" name="name" defaultValue={p.name} required />
                <div className="formRow">
                  <label>
                    Price (USD)
                    <input name="price" type="number" step="0.01" min="0" defaultValue={p.price} required />
                  </label>
                  <label>
                    Category
                    <select name="categoryId" defaultValue={p.categoryId} required>
                      {categories.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}
                    </select>
                  </label>
                </div>
                <label>
                  Description
                  <textarea name="description" defaultValue={p.description || ''} />
                </label>
                <label>
                  Image URL
                  <input name="imageUrl" defaultValue={p.imageUrl || ''} />
                </label>
                <div className="checkRow">
                  <label><input type="checkbox" name="active" defaultChecked={p.active} />Active</label>
                  <label><input type="checkbox" name="featured" defaultChecked={p.featured} />Featured</label>
                </div>
                <div className="editActions">
                  <button name="action" value="update">Save changes</button>
                  <button className="dangerGhost" name="action" value="delete">Delete</button>
                </div>
              </div>
            </form>
          )))}
        </div>
      </section>
    </AdminShell>
  )
}
