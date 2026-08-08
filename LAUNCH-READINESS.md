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

## Enrolment

- JA Group Services ID authentication is required before a mixed basket can be paid.
- The purchaser/own-course learner email must match the signed-in JA Group Services ID.
- Highfield learner details are collected per licence.
- Sousa Murray course entitlements and enrolments are created only after Central Payments reports payment completion.

## Remaining commercial launch gate

Individual Sousa Murray course purchases remain fail-closed until Head Office has approved:

1. the individual purchase price (or price schedule) for the Sousa Murray catalogue; and
2. the access duration for an individually purchased Sousa Murray course.

This does not affect Highfield course checkout or the existing Learning Library subscription plans. No price or access duration is invented by the application.
