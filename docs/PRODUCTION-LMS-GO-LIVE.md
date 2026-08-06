# Sousa Murray Learning Library — Production LMS go-live runbook

**Legal operator:** JA Group Services Ltd  
**Customer-facing division:** Sousa Murray eLearning  
**Production website:** `https://sousamurrayelearning.jagroupservices.co.uk`  
**Cloudflare D1 binding:** `DB`  
**Current technical D1 database name:** `aptenvo`

This runbook must be completed before Learning Library subscriptions are offered to customers. The application fails closed when the production schema, identity service, Stripe secret or webhook secret is missing.

## 1. Live Stripe products and prices

The following live Stripe records were created on 6 August 2026:

| Plan | Product ID | Recurring Price ID | Monthly price | Named seats | Entitlement |
|---|---|---|---:|---:|---|
| Learner | `prod_V1V8DQtZNzY864` | `price_1U1S7kDLIZgCwhkLyNmWwaoL` | £9.99 | 1 | Core library |
| Learner Plus | `prod_V1V8et49jLdlGm` | `price_1U1S7uDLIZgCwhkLEYzSKZ19` | £16.99 | 1 | Complete library |
| Team 5 | `prod_V1V8hWocIbia9T` | `price_1U1S86DLIZgCwhkLXflPN2PB` | £39.99 | 5 | Complete library |
| Team 15 | `prod_V1V8gFQRnUqRvD` | `price_1U1S8HDLIZgCwhkLVGnPyj1O` | £89.99 | 15 | Complete library |

The prices are fixed monthly subscriptions with inclusive tax behaviour. Seat caps are enforced by the LMS application; Stripe quantity must remain `1` for all four plans.

## 2. Apply the D1 production schema

Apply `database/production-lms.sql` to the production D1 database before enabling plan checkout.

Using Wrangler from an authorised local environment:

```bash
npx wrangler d1 execute aptenvo --remote --file=database/production-lms.sql
```

Then confirm that the following tables exist:

- `lms_identity_profiles`
- `lms_plans`
- `lms_checkout_sessions`
- `lms_subscriptions`
- `lms_organisations`
- `lms_organisation_members`
- `lms_enrolments`
- `lms_lesson_progress`
- `lms_assessment_attempts`
- `lms_certificates`
- `lms_audit_logs`

The LMS API returns `503 lms_schema_not_applied` until the schema is present.

## 3. Cloudflare Pages bindings and secrets

The production Pages project must have the D1 binding:

```text
Variable name: DB
D1 database: aptenvo
```

The following production variables and encrypted secrets are required:

| Name | Type | Purpose |
|---|---|---|
| `SITE_URL` | variable | `https://sousamurrayelearning.jagroupservices.co.uk` |
| `ENTRA_AUTHORITY` | variable | JA Group Services ID authority/user-flow URL |
| `ENTRA_CLIENT_ID` | variable | Microsoft Entra External ID application/client ID |
| `ENTRA_CLIENT_SECRET` | encrypted secret | Entra application secret |
| `SESSION_SECRET` | encrypted secret | Long random signing secret for customer sessions |
| `STRIPE_SECRET_KEY` | encrypted secret | Existing live Stripe secret key used by JA Group Services Ltd |
| `STRIPE_LMS_WEBHOOK_SECRET` | encrypted secret | Signing secret returned when the dedicated LMS webhook is created |

Never commit any secret value to GitHub, source code, documentation, screenshots or support tickets.

## 4. Create the dedicated Stripe webhook

Create one live webhook endpoint:

```text
https://sousamurrayelearning.jagroupservices.co.uk/api/stripe/lms-webhook
```

Subscribe it only to:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copy the webhook signing secret once and store it in Cloudflare Pages as `STRIPE_LMS_WEBHOOK_SECRET`.

The handler:

- verifies Stripe's HMAC signature with a five-minute tolerance;
- rejects unsigned or invalid events;
- records events idempotently using `webhook_events` with source `stripe-lms`;
- creates or updates server-side subscription entitlements;
- creates organisation records for Team 5 and Team 15;
- applies a seven-day restricted grace period after a failed payment; and
- removes access when the Stripe subscription lifecycle ends.

## 5. Configure the live Stripe Customer Portal

In live mode, enable:

- payment-method updates;
- invoice history;
- cancellation at the end of the current billing period;
- cancellation reasons; and
- plan switching only between the four Learning Library prices.

Do not enable quantity changes. These products are fixed bundles with application-enforced named-seat caps, not per-seat metered prices.

Recommended plan-change behaviour:

- upgrades: apply immediately with Stripe proration;
- downgrades: apply at the end of the current billing period; and
- cancellation: apply at the end of the current billing period unless mandatory law or a support remedy requires immediate cancellation.

## 6. JA Group Services ID requirements

The registered redirect URI must be:

```text
https://sousamurrayelearning.jagroupservices.co.uk/api/auth/callback
```

The verified ID token must contain:

- `tid` — Entra tenant ID;
- `oid` — Entra object ID;
- an email/preferred username; and
- the standard verified issuer, audience, expiry and nonce claims.

The application stores the stable identity key as `tenant-id:object-id`. Email is contact data and must not be used as the primary customer key.

A new LMS identity profile receives a 10-digit JA Group Services Unique Customer Number. Stripe customer, Checkout and Subscription metadata carry that UCN together with the Entra tenant and object IDs.

## 7. Subscription legal information

The Checkout Session requires affirmative acceptance of:

```text
/learning-library-subscription-terms.html
```

The acceptance message also records the customer's request for immediate course access during any statutory cooling-off period. Checkout and subscription metadata record the terms version:

```text
learning-library-subscription-v1.0-2026-08-06
```

Before go-live, the Board or authorised officer should approve the subscription terms, main Terms of Use, Privacy Policy, Refunds Policy and complaints route. Legal advice should be obtained where required.

## 8. Required production acceptance tests

Use a controlled company test customer and a real low-risk live payment method. Record the evidence and refund the test charge where appropriate.

### Identity and subscription

- New customer signs in through JA Group Services ID.
- Session uses tenant ID plus object ID.
- Head Office UCN is created once and remains stable.
- Stripe Customer metadata contains the expected identity references.
- Each of the four plan buttons opens the correct live Stripe Price.
- Checkout requires terms acceptance.
- Successful Checkout activates the correct plan without manual intervention.
- A repeated Stripe event does not create duplicate subscriptions.

### Entitlements and learning

- Learner plan opens core courses only.
- Learner Plus opens the complete library.
- Team 5 rejects a sixth active/invited learner.
- Team 15 rejects a sixteenth active/invited learner.
- An unpaid or cancelled customer cannot create a new enrolment.
- Lesson answers are marked by the server.
- Final assessment remains locked until every lesson is complete.
- A failed assessment does not issue a certificate.
- A successful assessment issues one certificate only.
- Public verification returns the correct limited certificate record.

### Billing lifecycle

- Customer Portal opens only for the signed-in Stripe customer.
- Payment method can be updated.
- Cancellation is clearly available online.
- Cancellation at period end updates the LMS status.
- A failed renewal produces `past_due` and a grace expiry.
- A successful retry restores `active` and removes the grace expiry.
- A fully ended subscription removes course access but preserves historic learning and certificate records.

### Security and data protection

- Unsigned webhook request is rejected.
- Invalid session is rejected.
- A learner cannot access another learner's enrolment or certificate administration record.
- Organisation learner invitations cannot exceed the plan cap.
- Team invitation must match the JA Group Services ID email used to accept it.
- API responses are marked `no-store` where they contain learner or billing data.
- Audit records are created for checkout, enrolment, progress, assessment, billing portal and team invitation actions.

## 9. Go-live decision

Do not publicly advertise the subscriptions as available until all acceptance tests have passed and the responsible officer has recorded approval.

Suggested status wording before approval:

> Learning Library subscriptions are being prepared for launch. Course information may be viewed, but paid access is not yet available.

After approval, remove any launch-hold wording and test one final production purchase from the public website.
