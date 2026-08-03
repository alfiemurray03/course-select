# CourseSelect

**Choose. Learn. Succeed.**

CourseSelect is the new multi-provider online learning division of JA Group Services Ltd. This repository contains a responsive Vite/React website and the Cloudflare Pages foundation for catalogue, account, payment and course-provider integrations.

## Included

- Responsive CourseSelect public website
- Shared JA Group Services visual system
- Light, dark and system theme modes
- Course catalogue and course detail routes
- Individual, organisation and provider pages
- Cloudflare Pages Functions health/catalogue endpoints
- D1-ready multi-provider schema
- SPA redirects, PWA manifest and favicon
- Placeholder routes for legal documents and JA Group Services ID

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The output directory is `dist`.

## Cloudflare Pages deployment

Use the following project settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Node.js version: `20` or later

The repository includes `wrangler.jsonc` and a `/functions` directory. Replace the placeholder D1 database ID after creating the `course-select` D1 database, or add a binding in the Cloudflare dashboard:

- Variable name: `DB`
- D1 database: `course-select`

Apply the schema with Wrangler after the database exists:

```bash
npx wrangler d1 execute course-select --remote --file=database/schema.sql
```

## Required production secrets

Set these through Cloudflare rather than GitHub:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET`
- `ENTRA_TENANT_ID`
- `SESSION_SECRET`
- `HIGHFIELD_API_URL`
- `HIGHFIELD_API_KEY`

## Current status

This is the deployable website and platform foundation. Catalogue entries and displayed prices are draft placeholders until Highfield confirms the current reseller catalogue, product IDs, approved marketing material and live pricing.
