# Shubhangi Collection — Product Directory

A premium, mobile-first fashion jewellery catalogue with WhatsApp enquiry integration.

---

## Quick Start (Local Development)

### 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and open your project
2. Go to **SQL Editor** and paste the full contents of `supabase/schema.sql`
3. Click **Run** — this creates your products table and 5 demo products
4. Go to **Project Settings → API** and copy:
   - Project URL
   - anon public key
   - service_role key (keep this secret!)

### 2. Configure environment variables

Rename `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_SECRET=choose-a-strong-password
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploying to Vercel

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. In **Environment Variables**, add all 5 variables from your `.env.local`
4. Change `NEXT_PUBLIC_SITE_URL` to your Vercel URL (e.g. `https://shubhangi-collection.vercel.app`)
5. Click **Deploy**

---

## Adding Products

### Via Admin Panel (recommended)

1. Open `/admin` on your site
2. Enter your `ADMIN_SECRET` password
3. Click **Add Product** and fill in the form
4. Upload product photos directly from the form

### Via Supabase SQL Editor

You can also insert products directly using SQL — see `supabase/schema.sql` for the format.

---

## Uploading Product Images

Images are uploaded to **Supabase Storage** (bucket: `product-images`).

- The admin form handles uploads automatically
- The first image becomes the thumbnail
- You can add multiple images per product
- Max file size: 5MB per image

---

## Changing the WhatsApp Number

Edit `lib/whatsapp.ts` and change:

```ts
const WHATSAPP_NUMBER = '919004954792';  // Change this
const BUSINESS_NAME = 'Shubhangi Collection';  // Change this too if needed
```

---

## How WhatsApp Messages Are Generated

Every product card and detail page generates a dynamic WhatsApp message using `lib/whatsapp.ts`:

```
Hello Shubhangi Collection,

I am interested in this product:

Product: [PRODUCT NAME]
SKU: [SKU]
Product link: [CURRENT PRODUCT PAGE URL]

Please share the price, availability, and purchase details.
```

The SKU is central — it lets you instantly identify which product the customer is asking about.

---

## SKU Architecture (Future-Ready)

The `sku` field is the primary product identifier across all future phases:

| Future Feature | How SKU is Used |
|---|---|
| Live selling | SKU displayed as overlay code during live sessions |
| OCR automation | Customer screenshots → OCR extracts SKU → auto-lookup |
| WhatsApp bot | Customer sends SKU → bot fetches product + sends link |
| Order processing | SKU maps to inventory item |
| Analytics | Track views, enquiries, and sales by SKU |

**Recommended SKU format:** `SC-[CATEGORY]-[NUMBER]`
- `SC-NK-001` = Shubhangi Collection, Necklaces, #001
- `SC-ER-002` = Shubhangi Collection, Earrings, #002

---

## Admin Panel Security

The admin panel uses a simple password cookie for Phase 1.

**Before going live publicly:**
- Use a strong `ADMIN_SECRET` (at least 20 random characters)
- Consider upgrading to NextAuth.js for full authentication
- Never share your `.env.local` file

---

## Project Structure

```
app/
  page.tsx                    Catalogue home
  products/[slug]/page.tsx    Product detail
  admin/                      Admin panel
  api/                        API routes
components/
  catalog/                    Catalogue components
  product/                    Product detail components
  shared/                     Header, Footer, WhatsApp button
  admin/                      Admin form + image uploader
lib/
  types.ts                    TypeScript types
  supabase.ts                 Database client
  whatsapp.ts                 WhatsApp URL generator
  utils.ts                    Utilities
supabase/
  schema.sql                  Database schema + seed data
```
