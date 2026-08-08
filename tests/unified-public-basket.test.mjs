import assert from 'node:assert/strict';
import fs from 'node:fs';

const header = fs.readFileSync('src/PublicSiteHeader.tsx', 'utf8');
const router = fs.readFileSync('src/LearningPlatformRouter.tsx', 'utf8');
const middleware = fs.readFileSync('functions/api/_middleware.ts', 'utf8');
const unified = fs.readFileSync('functions/_shared/unified-elearning-checkout.ts', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const ownCatalogue = fs.readFileSync('src/own-course-catalogue-commerce.ts', 'utf8');
const ownCoursePage = fs.readFileSync('src/PublicLibraryCoursePage.tsx', 'utf8');

assert.match(header, /to="\/basket"/);
assert.doesNotMatch(header, /Highfield Basket/);
assert.doesNotMatch(header, /Course Basket/);
assert.match(router, /path === '\/learning-library\/basket'.*Navigate to="\/basket"/s);
assert.match(router, /path === '\/basket'.*UnifiedBasketPage/s);
assert.match(router, /if \(path\.startsWith\('\/lms'\)\).*ProductionLearningManagementSystem/s);
assert.match(middleware, /handleUnifiedElearningCheckout/);
assert.match(middleware, /unifiedBasket === true/);
assert.match(unified, /elearning-basket-checkout/);
assert.match(unified, /one governed|centralUnifiedCheckout|highfieldItems/);
assert.doesNotMatch(main, /stripe-catalogue-bootstrap/);
assert.match(main, /public-header-unifier/);
assert.match(ownCatalogue, /window\.location\.assign\('\/basket'\)/);
assert.match(ownCoursePage, /window\.location\.assign\('\/basket'\)/);

console.log('Unified public basket and LMS separation checks passed.');
