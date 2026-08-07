# Free AI Literacy course trial

Sousa Murray eLearning offers one governed demonstration trial on **AI Literacy for Everyday Work**.

## Customer journey

1. The learner signs in with JA Group Services ID.
2. The course page offers a **Free 7-day trial** for one named learner.
3. Selecting the trial creates a JA Group Services Central Payments checkout using the internal product/price codes.
4. The learner is redirected to Stripe-hosted Checkout for a **£0.00** one-time order.
5. Central Payments confirms the verified `checkout.session.completed` outcome before the LMS grants access.
6. The LMS creates a standalone course entitlement lasting seven days from confirmed checkout completion.
7. The learner can enrol, complete lessons and knowledge checks, take the final assessment and receive a completion certificate while the entitlement remains active.

The browser return from Stripe is not treated as payment confirmation. The LMS reconciles the authoritative Head Office payment record before activating the trial.

## Trial rules

- Course: `ai-literacy-for-everyday-work`
- Duration: 7 days
- Price: £0.00
- Named learners: 1
- Claim frequency: once per JA Group Services learning account
- Checkout provider: JA Group Services Central Payments / Stripe
- Payment method: not collected for the £0.00 Checkout order
- Highfield Online Training: unaffected and separate

The standalone-entitlement model is deliberately separate from Learning Library subscriptions and can later support individually purchased Sousa Murray courses without treating those purchases as subscriptions.
