import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sync = await readFile(new URL('../functions/api/catalogue/stripe-sync.ts', import.meta.url), 'utf8');
const bootstrap = await readFile(new URL('../src/stripe-catalogue-bootstrap.ts', import.meta.url), 'utf8');

assert.ok(sync.includes('/api/v1/payments/account-info'), 'eLearning catalogue reconciliation must ask Head Office which Stripe account is currently approved.');
assert.ok(sync.includes("stripeAccountId.startsWith('acct_')"), 'eLearning must reject an invalid Head Office Stripe account identity.');
assert.ok(sync.includes('JSON.stringify({ stripeAccountId, items })'), 'The catalogue sync cache fingerprint must include the current Head Office Stripe account ID.');
assert.ok(sync.includes('CUSTOMEROPS_API_KEY') && sync.includes('HEAD_OFFICE_PLATFORM_KEY'), 'Catalogue reconciliation must keep using the existing scoped Head Office connection credential.');
assert.ok(bootstrap.includes("syncFamily('sousa_murray')") && bootstrap.includes("syncFamily('highfield')"), 'Production eLearning must continue background reconciliation for both governed course families.');

console.log('eLearning Central Payments account-aware catalogue cache checks passed.');
