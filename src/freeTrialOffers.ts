export type FreeTrialOffer = {
  courseSlug: string;
  courseTitle: string;
  productCode: string;
  priceCode: string;
  durationDays: number;
};

export const FREE_TRIAL_OFFERS: readonly FreeTrialOffer[] = Object.freeze([
  {
    courseSlug: 'digital-skills-and-ai-at-work',
    courseTitle: 'Digital Skills & AI at Work',
    productCode: 'ELEARNING_AI_LITERACY_TRIAL',
    priceCode: 'ELEARNING_AI_LITERACY_TRIAL_FREE',
    durationDays: 7,
  },
  {
    courseSlug: 'business-and-enterprise',
    courseTitle: 'Business & Enterprise',
    productCode: 'ELEARNING_BUSINESS_ENTERPRISE_TRIAL',
    priceCode: 'ELEARNING_BUSINESS_ENTERPRISE_TRIAL_FREE',
    durationDays: 7,
  },
  {
    courseSlug: 'microsoft-365-productivity',
    courseTitle: 'Microsoft 365 Productivity',
    productCode: 'ELEARNING_MICROSOFT_365_TRIAL',
    priceCode: 'ELEARNING_MICROSOFT_365_TRIAL_FREE',
    durationDays: 7,
  },
  {
    courseSlug: 'workplace-professional-practice',
    courseTitle: 'Workplace Professional Practice',
    productCode: 'ELEARNING_WORKPLACE_PRACTICE_TRIAL',
    priceCode: 'ELEARNING_WORKPLACE_PRACTICE_TRIAL_FREE',
    durationDays: 7,
  },
]);

export function freeTrialOfferForSlug(courseSlug: string | null | undefined) {
  const slug = String(courseSlug || '').trim().toLowerCase();
  return FREE_TRIAL_OFFERS.find((offer) => offer.courseSlug === slug) ?? null;
}

export function hasFreeTrial(courseSlug: string | null | undefined) {
  return Boolean(freeTrialOfferForSlug(courseSlug));
}
