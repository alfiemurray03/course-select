# Sousa Murray eLearning D1 operating mode

Sousa Murray eLearning uses a code-first catalogue and an operational-only D1 database.

## Stored in the codebase

The following are deployed with the application and must not be seeded or synchronised into D1 during normal requests:

- course titles, slugs, categories and levels;
- course descriptions, intended audiences and learning outcomes;
- course delivery and certificate wording;
- qualification and awareness notices;
- standard VAT-inclusive pricing and quantity tiers;
- provider display information;
- public help content, service information and legal policies;
- public navigation and sitemap routes.

`src/catalogue.ts` is the single source of truth for the public course catalogue and standard prices. Both the browser and the server-side checkout import the same catalogue module. Customers cannot alter the server-side values used to create Stripe Checkout.

## Stored in D1

D1 is reserved for records that change because a customer or staff member takes an action:

- authenticated Sousa Murray eLearning customer accounts;
- saved customer profiles, authorised adult learners and reusable baskets;
- orders, order items and Stripe references;
- learner submissions, licence allocations and enrolment status;
- contact requests, complaints and support workflow records;
- webhook processing and operational audit records.

## Stored in R2

Private spreadsheets and PDFs containing learner information are stored in the private `LEARNER_UPLOADS` R2 bucket. Only file metadata and the private storage key are retained in D1.

## Runtime rules

- Public page views must not write to D1.
- Catalogue and sitemap requests must not query D1.
- Application requests must not run `CREATE`, `ALTER`, `DROP` or catalogue bootstrap operations.
- Schema changes are controlled deployment work, not customer-request work.
- Updates should avoid rewriting an unchanged row.
- Static catalogue rows already present in the production database are frozen compatibility references for existing foreign keys. They are not the live public content source and must not be routinely reseeded.

## Retired behaviour

`/api/admin/bootstrap` is retired and returns HTTP 410. It must not be restored as a public or repeatable catalogue-writing endpoint.
