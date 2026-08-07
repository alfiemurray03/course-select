import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const central = await readFile(new URL('../functions/_shared/central-payments.ts', import.meta.url), 'utf8');
const entitlements = await readFile(new URL('../functions/_shared/course-entitlements.ts', import.meta.url), 'utf8');
const schema = await readFile(new URL('../functions/_shared/production-lms-schema.ts', import.meta.url), 'utf8');
const trialApi = await readFile(new URL('../functions/api/lms/course-trial.ts', import.meta.url), 'utf8');
const courseApi = await readFile(new URL('../functions/api/lms/courses/[slug].ts', import.meta.url), 'utf8');
const enrolments = await readFile(new URL('../functions/api/lms/enrolments.ts', import.meta.url), 'utf8');
const progress = await readFile(new URL('../functions/api/lms/progress.ts', import.meta.url), 'utf8');
const assessment = await readFile(new URL('../functions/api/lms/assessment.ts', import.meta.url), 'utf8');
const ui = await readFile(new URL('../src/free-course-trial.ts', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/free-course-trial.css', import.meta.url), 'utf8');

assert.ok(central.includes("FREE_TRIAL_COURSE_SLUG = 'ai-literacy-for-everyday-work'"), 'AI Literacy for Everyday Work must be the trial course.');
assert.ok(central.includes('FREE_TRIAL_DURATION_DAYS = 7'), 'The course trial must last seven days.');
assert.ok(central.includes("FREE_TRIAL_PRICE_CODE = 'ELEARNING_AI_LITERACY_TRIAL_FREE'"), 'The trial must use the governed Head Office free price code.');
assert.ok(central.includes('/api/v1/payments/checkout'), 'The trial must use Head Office Central Payments checkout.');
assert.ok(central.includes('/api/v1/payments/status'), 'The LMS must confirm the Central Payments outcome rather than trusting the browser return alone.');

assert.ok(schema.includes('lms_course_entitlements'), 'Standalone course access must have a dedicated entitlement table.');
assert.ok(schema.includes("'free_trial','individual_purchase','manual'"), 'The entitlement schema must distinguish free trials from future purchases.');
assert.ok(entitlements.includes('courseEntitlementHasAccess'), 'Course access must enforce entitlement status and expiry.');
assert.ok(entitlements.includes('FREE_TRIAL_DURATION_DAYS'), 'Free-trial expiry must be derived from the governed trial duration.');
assert.ok(entitlements.includes("status='paused'"), 'Standalone course enrolment bridging must not accidentally create an active Learning Library subscription.');

for (const implementation of [courseApi, enrolments, progress, assessment]) {
  assert.ok(implementation.includes('resolveCourseAccess'), 'Course runtime paths must accept both plan and standalone course entitlements.');
}

assert.ok(trialApi.includes('free_trial_already_claimed'), 'The API must enforce one free trial claim per learning account.');
assert.ok(trialApi.includes('free_course_trial_checkout_created'), 'Trial Checkout creation must be audit logged.');
assert.ok(trialApi.includes('free_course_trial_activated'), 'Trial activation must be audit logged after Central Payments confirmation.');
assert.ok(ui.includes('Start free trial with Stripe'), 'The course page must clearly send the learner to Stripe Checkout.');
assert.ok(ui.includes('Because the order total is £0.00, Stripe will not collect payment details'), 'The no-cost Stripe Checkout behaviour must be explained accurately.');
assert.ok(ui.includes('Free 7-day trial'), 'The catalogue must visibly identify the trial course.');
assert.ok(css.includes('var(--muted-foreground)') && css.includes('var(--foreground)'), 'Trial UI must use the established readable theme tokens.');

console.log('Sousa Murray free course trial checks passed.');
