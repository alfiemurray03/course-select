# Sousa Murray eLearning

Sousa Murray eLearning is the multi-provider online learning division of JA Group Services Ltd. This repository contains the responsive Vite and React storefront together with Cloudflare Pages Functions for catalogue data, D1 bootstrapping, Stripe Checkout and payment webhooks.

## Current catalogue

The Sousa Murray eLearning launch catalogue contains **101 products** from the Highfield E-learning Reseller Scheme:

- 23 complete courses across Highfield price scales 1–3
- 26 short courses
- 3 first-aid courses
- 4 specialist programmes, including the Care Certificate
- 15 individual Care Certificate standards
- 18 individual Level 2 modules
- 12 individual Level 3 modules

Each product has:

- a unique Sousa Murray eLearning course ID and URL slug;
- a full customer-facing page;
- overview, audience and learning outcomes;
- delivery, certificate and qualification notices;
- quantity-based pricing tiers;
- Highfield provider mapping fields;
- Stripe product and price mapping records;
- a published static fallback so every course remains visible before D1 is connected.

## Pricing model

Sousa Murray eLearning pricing is calculated from the **original Highfield retail price**, not the reseller price:

1. Highfield retail price excluding VAT;
2. Sousa Murray eLearning markup of 30%;
3. VAT at 20%;
4. customer-facing gross price including VAT.

Both net and gross values are stored in D1. The website displays VAT-inclusive customer prices.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run check
npm run build
```

The output directory is `dist`.

## Cloudflare Pages deployment

Use:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Node.js version: `20` or later

The GitHub repository and Cloudflare Pages project retain the technical identifier `course-select` so the existing deployment connection is not broken. The customer-facing brand is Sousa Murray eLearning.

## D1 database

Recommended database name:

```text
aptenvo
```

Add the database to the Cloudflare Pages project with the binding name:

```text
DB
```

Apply the schema:

```bash
npx wrangler d1 execute aptenvo --remote --file=database/schema.sql
```

Then set a secret named `BOOTSTRAP_TOKEN` and call the protected bootstrap endpoint once. It imports all 101 catalogue items, categories, learning outcomes, price tiers and empty Stripe mappings from the same catalogue used by the website.

```bash
curl -X POST "https://<YOUR-SOUSA MURRAY ELEARNING-DOMAIN>/api/admin/bootstrap" \
  -H "Authorization: Bearer <BOOTSTRAP_TOKEN>"
```

The bootstrap is safe to run again after catalogue updates because the records use deterministic IDs and upsert logic.

Detailed instructions are in [`docs/D1-AND-STRIPE-SETUP.md`](docs/D1-AND-STRIPE-SETUP.md).

## Stripe connection

Set these Cloudflare secrets and variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SITE_URL`

Checkout endpoint:

```text
POST /api/checkout
```

Stripe webhook endpoint:

```text
POST /api/stripe/webhook
```

The checkout endpoint selects the correct D1 quantity tier. It can use a stored Stripe Price ID or create Checkout price data from the D1 gross price when no Stripe mapping exists yet.

## Other production secrets reserved for later phases

- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET`
- `ENTRA_TENANT_ID`
- `SESSION_SECRET`
- `HIGHFIELD_API_URL`
- `HIGHFIELD_API_KEY`

## Important commercial status

The catalogue structure and pricing calculation are complete. The source reseller document states that its prices were effective from August 2025. Before live public sales begin, JA Group Services Ltd should confirm current Highfield pricing, product identifiers, certificate wording, approved marketing material and enrolment arrangements. The database therefore stores `price_verified = 0` until that confirmation is completed.
