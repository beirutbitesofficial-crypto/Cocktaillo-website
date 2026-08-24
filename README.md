# Cocktaillo Resto - Café Ordering Platform

A production-ready restaurant ordering website and admin dashboard for Cocktaillo.

## Included

- Responsive Cocktaillo-branded storefront
- Menu categories, search, product cards and cart
- Delivery ordering with customer name, phone, address and notes
- Takeaway ordering with customer name, phone and notes
- Cash payment
- Whish Money payment with editable Whish phone number
- Order totals and configurable delivery fee
- Admin authentication
- Admin dashboard with order/revenue/menu stats
- Order management and status workflow
- Category and product management
- Product availability and featured items
- Restaurant settings
- Editable Instagram, Facebook, TikTok and location links
- Automatic first-start Cocktaillo menu import from `https://alqaima.com/menu/cocktaillo-resto-cafe/en`
- Admin one-click Al Qaima menu re-import
- Prisma + MySQL persistence for production deployment on Hostinger

## Local / server setup

1. Create a MySQL database.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to the MySQL connection string.
4. Change `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and especially `ADMIN_SECRET`.
5. Install dependencies: `npm install`.
6. Create/update the database schema: `npm run db:push`.
7. Seed restaurant settings and the current Cocktaillo menu: `npm run db:seed`.
8. Run locally with `npm run dev` or production with `npm start`.
9. Open `/admin/login` and sign in.
10. Go to **Settings** to enter the Whish phone number, delivery fee, contact details and social links.

## Production / Hostinger

Use Node.js 22+ and a Hostinger MySQL database. The database is external to the application build, so orders, menu settings and customer order data remain persistent across app redeployments.

`npm start` runs `prisma db push`, seeds missing defaults/menu data, and then starts Next.js.

Recommended environment variables:

```env
DATABASE_URL="mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME"
ADMIN_EMAIL="your-admin-email"
ADMIN_PASSWORD="use-a-strong-password"
ADMIN_SECRET="use-a-long-random-secret-at-least-32-characters"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

If the MySQL password contains reserved URL characters such as `@`, `:`, `/`, `?`, `#` or `%`, URL-encode the password before placing it in `DATABASE_URL`.

## Order methods

The website accepts only:

- `DELIVERY`
- `TAKEAWAY`

Dine-in/table ordering has intentionally been removed.

## Whish payment

Whish is implemented as a manual transfer flow. The customer sees the Whish number configured by the admin and may enter a transfer reference/sender name. The restaurant should verify receipt of the transfer before treating it as confirmed payment.
