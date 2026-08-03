# Aptenvo

Aptenvo is the multi-provider online learning division of JA Group Services Ltd. This repository contains the responsive Vite and React website together with the Cloudflare Pages foundation for catalogue, account, payment and course-provider integrations.

## Included

- Responsive Aptenvo public website
- Shared JA Group Services visual system
- Blue Aptenvo wordmark
- Light, dark and system theme modes
- Course catalogue and course detail routes
- Individual, organisation and provider pages
- Cloudflare Pages Functions health and catalogue endpoints
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

The existing GitHub repository and Cloudflare Pages project retain the technical identifier `course-select` so the current deployment connection is not broken. The customer-facing brand throughout the application is Aptenvo.

The repository includes `wrangler.jsonc` and a `/functions` directory. When the D1 database is created, add the following binding through Cloudflare:

- Variable name: `DB`
- D1 database: the database selected for Aptenvo

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

This is the deployable Aptenvo website and platform foundation. Catalogue entries and displayed prices are draft placeholders until Highfield confirms the current reseller catalogue, product identifiers, approved marketing material and live pricing.
