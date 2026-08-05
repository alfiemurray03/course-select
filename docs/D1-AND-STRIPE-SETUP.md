# Sousa Murray eLearning D1 and Stripe setup

This guide connects the existing `course-select` Cloudflare Pages project to the technical `aptenvo` D1 database and Stripe for the Sousa Murray eLearning website.

## 1. Create the D1 database

In Cloudflare, create a D1 database named:

```text
aptenvo
```

The customer-facing brand is Sousa Murray eLearning. The Pages project may continue to use the technical name `course-select`, and the D1 database may retain the technical name `aptenvo`.

## 2. Add the Pages binding

Open the `course-select` Pages project and add a D1 database binding for both Production and Preview where required:

```text
Variable name: DB
D1 database: aptenvo
```

Do not add a fake database ID to `wrangler.jsonc`. The live binding should be managed through Cloudflare or replaced with the real D1 ID only after the database exists.

## 3. Apply the schema

From a trusted development environment with Wrangler authenticated to the JA Group Services Cloudflare account:

```bash
npx wrangler d1 execute aptenvo --remote --file=database/schema.sql
```

The schema creates:

- providers and categories;
- courses, learning outcomes and price tiers;
- Stripe product and price mappings;
- customers, learners and organisations;
- orders and order items;
- licence allocations and enrolments;
- completion certificates;
- Stripe and provider webhook event logs;
- audit logs and query indexes.

## 4. Bootstrap all 101 catalogue products

Create a strong random Cloudflare secret:

```text
BOOTSTRAP_TOKEN
```

After the next deployment is live, call:

```bash
curl -X POST "https://sousamurrayelearning.jagroupservices.co.uk/api/admin/bootstrap" \
  -H "Authorization: Bearer <BOOTSTRAP_TOKEN>"
```

A successful response reports counts for providers, categories, courses, price tiers, learning outcomes and Stripe placeholders.

The endpoint uses upserts and deterministic IDs. It can be called again after catalogue changes without creating duplicate courses.

Once the initial import has succeeded, the `BOOTSTRAP_TOKEN` may be rotated or removed until another catalogue deployment is required.

## 5. Verify the database

Public catalogue API:

```text
GET /api/catalogue
```

Course detail API:

```text
GET /api/courses/<course-slug>
```

Health endpoint:

```text
GET /api/health
```

The catalogue API reports `source: d1` after the binding and bootstrap are working. Before that, it deliberately returns the complete static catalogue as a fallback.

## 6. Connect Stripe

Add these Cloudflare secrets and variables:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SITE_URL
```

Set `SITE_URL` to the approved public origin, without a trailing slash:

```text
https://sousamurrayelearning.jagroupservices.co.uk
```

The website sends:

```json
{
  "courseId": "hf-food-safety-level-2",
  "quantity": 1
}
```

to:

```text
POST /api/checkout
```

The function:

1. finds the published course in D1;
2. selects the correct quantity tier;
3. records an awaiting-payment Sousa Murray eLearning order;
4. creates a Stripe Checkout Session;
5. returns the Stripe Checkout URL.

If a Stripe Price ID has been stored for the tier, the endpoint uses it. Otherwise, it creates inline Stripe Checkout price data from the VAT-inclusive D1 amount. This allows testing before permanent Stripe products are mapped.

## 7. Configure the Stripe webhook

Create a Stripe webhook endpoint for:

```text
https://sousamurrayelearning.jagroupservices.co.uk/api/stripe/webhook
```

Subscribe at minimum to:

```text
checkout.session.completed
checkout.session.expired
payment_intent.payment_failed
charge.refunded
```

Copy the webhook signing secret into the Cloudflare secret:

```text
STRIPE_WEBHOOK_SECRET
```

The webhook verifies the Stripe signature, prevents duplicate processing, updates the order and queues paid order items for fulfilment.

## 8. Permanent Stripe product mapping

The bootstrap creates one inactive `stripe_products` record per course and one inactive `stripe_prices` record per quantity tier.

After permanent products and prices are created in Stripe, populate:

```text
stripe_products.stripe_product_id
stripe_prices.stripe_price_id
stripe_products.active = 1
stripe_prices.active = 1
```

The checkout function will automatically prefer the mapped Stripe Price ID.

## 9. Highfield connection fields

Every course record includes:

```text
provider_id
provider_course_id
```

The provider-specific product identifier remains empty until Highfield supplies or confirms it. The enrolment tables are already prepared for:

```text
provider_learner_id
provider_enrolment_id
provider_status
last_synced_at
failure_reason
```

This supports manual fulfilment first and automated Highfield enrolment later.

## 10. Go-live checks

Before accepting real payments:

- confirm Highfield's current retail and reseller scheme;
- populate Highfield product identifiers;
- confirm approved descriptions, certificates and qualification wording;
- verify VAT treatment with the Company's accountant;
- publish approved Sousa Murray eLearning terms, privacy, refund and cancellation wording;
- test Stripe Checkout and all webhook events in test mode;
- complete a test enrolment from payment through to provider access;
- ensure support and refund processes are operational.
