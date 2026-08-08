# Sousa Murray eLearning launch readiness

## Public website structure

- One public website header is used across the customer-facing site.
- The public header has one `Basket` entry at `/basket`.
- Individual Sousa Murray courses and Highfield Online Training courses may coexist in that basket.
- Learning Library subscription plans remain a separate purchase route and are never basket items.
- `/learning-library/basket` is retained only as a compatibility redirect to `/basket`.

## Learning environments

- `/lms/*` is the Sousa Murray learner environment and deliberately does not inherit the public website header/footer.
- Individual Sousa Murray courses are fulfilled into the Sousa Murray LMS.
- Highfield courses remain fulfilled through the Highfield enrolment/LMS process.

## Payments

- Customer payments are created through JA Group Services Head Office Central Payments and Stripe Checkout.
- A mixed individual-course basket is one Central Payments checkout and one Stripe Checkout Session.
- Stripe line items remain linked to the correct governed course Product for each course family.
- The mixed flow validates totals independently in Head Office and the eLearning application before recording local fulfilment orders.
- Individual Sousa Murray course prices use the approved governed VAT-inclusive complexity bands: £7.99, £11.00, £13.99, £16.99, £22.99 and £29.99.

## Enrolment and course access

- JA Group Services ID authentication is required before an individual-course basket can be paid.
- The purchaser/own-course learner email must match the signed-in JA Group Services ID.
- Highfield learner details are collected per licence.
- Sousa Murray course entitlements and enrolments are created only after Central Payments reports payment completion.
- An individually purchased Sousa Murray course provides 12 months of access from confirmed payment.
- The LMS records the entitlement start and expiry timestamps and refuses standalone course access after the expiry timestamp.
- The 12-month expiry is calculated as a calendar-month term in the LMS; the existing 365-day field is retained only as a compatibility/governance value exchanged with Central Payments.
- A new purchase of the same course creates a fresh 12-month entitlement period after payment.

## Commercial status

The individual Sousa Murray course price schedule and access duration are now approved and governed in code. Paid individual-course checkout remains fail-closed if Central Payments does not report the expected approved Stripe Price or the approved 12-month access term.

Highfield course checkout and Learning Library subscription plans retain their separate pricing and access rules.
