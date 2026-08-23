# Cocktaillo Resto - Café Ordering Platform

A complete restaurant ordering website and admin dashboard for Cocktaillo.

## Included

- Responsive Cocktaillo-branded storefront
- Menu categories, search, product cards and cart
- Delivery ordering (name, phone, address, notes)
- Takeaway ordering (name, phone, notes)
- Dine-in table ordering using `/?table=12`
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
- One-click Al Qaima menu import from `https://alqaima.com/menu/cocktaillo-resto-cafe/en`
- Prisma + SQLite persistence suitable for a persistent Node.js/Hostinger server

## Setup

1. Copy `.env.example` to `.env`.
2. Change `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and especially `ADMIN_SECRET`.
3. Install dependencies: `npm install`.
4. Create database: `npm run db:push`.
5. Seed defaults: `npm run db:seed`.
6. Run: `npm run dev`.
7. Open `/admin/login` and sign in.
8. Go to **Menu → Import from Al Qaima** to import the current Cocktaillo menu.
9. Go to **Settings** to enter the Whish phone number, delivery fee, contact details and social links.

## Production / Hostinger

Use Node.js 20+ and a persistent application directory. `npm start` automatically runs `prisma db push`, seeds only missing defaults/sample data, then starts Next.js.

Recommended environment variables:

```env
DATABASE_URL="file:./dev.db"
ADMIN_EMAIL="your-admin-email"
ADMIN_PASSWORD="use-a-strong-password"
ADMIN_SECRET="use-a-long-random-secret-at-least-32-characters"
NEXT_PUBLIC_SITE_URL="https://your-domain.com"
```

For table ordering, encode links such as `https://your-domain.com/?table=1`, `?table=2`, etc. into QR codes and place one QR on each table. The checkout automatically switches to **Dine In** and pre-fills the table number.

## Notes

Whish is implemented as a manual transfer flow: the customer sees the Whish number configured by the admin and may enter a transfer reference/sender name. This does not claim an unsupported direct Whish payment API integration.
