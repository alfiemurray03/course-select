import {
  courseDuration,
  flattenCourseLessons,
  type LibraryCourse,
} from './libraryCatalogue';

export const OWN_COURSE_COMMERCIAL_UPLIFT_BASIS_POINTS = 3000;
export const OWN_COURSE_VAT_BASIS_POINTS = 2000;

export type OwnCoursePricingBandId =
  | 'value'
  | 'essential'
  | 'standard'
  | 'enhanced'
  | 'professional'
  | 'extended';

export type OwnCoursePricingBand = {
  id: OwnCoursePricingBandId;
  maximumScore: number | null;
  baseValuePence: number;
  retailNetPence: number;
  vatPence: number;
  grossPence: number;
};

function commercialPrice(baseValuePence: number) {
  const retailNetPence = Math.round(baseValuePence * (1 + OWN_COURSE_COMMERCIAL_UPLIFT_BASIS_POINTS / 10_000));
  const vatPence = Math.round(retailNetPence * (OWN_COURSE_VAT_BASIS_POINTS / 10_000));
  return { retailNetPence, vatPence, grossPence: retailNetPence + vatPence };
}

function band(
  id: OwnCoursePricingBandId,
  maximumScore: number | null,
  baseValuePence: number,
): OwnCoursePricingBand {
  return { id, maximumScore, baseValuePence, ...commercialPrice(baseValuePence) };
}

/**
 * Customer-facing one-off prices are deliberately arranged from low to high.
 * The internal base value is increased by the approved 30% commercial uplift,
 * then UK standard-rate VAT (20%) is added. The base values are selected so
 * the final VAT-inclusive customer prices remain simple and competitive.
 */
export const OWN_COURSE_PRICING_BANDS: readonly OwnCoursePricingBand[] = [
  band('value', 115, 512),          // £7.99 including VAT
  band('essential', 140, 705),      // £11.00 including VAT
  band('standard', 165, 897),       // £13.99 including VAT
  band('enhanced', 195, 1089),      // £16.99 including VAT
  band('professional', 230, 1474),  // £22.99 including VAT
  band('extended', null, 1922),     // £29.99 including VAT
] as const;

export function ownCourseComplexity(course: LibraryCourse) {
  const lessons = flattenCourseLessons(course);
  const durationMinutes = courseDuration(course);
  const moduleCount = course.modules.length;
  const lessonCount = lessons.length;
  const assessmentQuestionCount = course.finalAssessment.questions.length;
  const levelWeight = course.level === 'Intermediate' ? 22 : 0;
  const score = durationMinutes
    + moduleCount * 4
    + lessonCount
    + assessmentQuestionCount * 2
    + levelWeight;

  return {
    level: course.level,
    durationMinutes,
    moduleCount,
    lessonCount,
    assessmentQuestionCount,
    score,
  } as const;
}

export function ownCourseIndividualPrice(course: LibraryCourse) {
  const complexity = ownCourseComplexity(course);
  const pricingBand = OWN_COURSE_PRICING_BANDS.find((item) => (
    item.maximumScore === null || complexity.score <= item.maximumScore
  )) ?? OWN_COURSE_PRICING_BANDS[OWN_COURSE_PRICING_BANDS.length - 1];

  return {
    ...pricingBand,
    ...complexity,
    commercialUpliftBasisPoints: OWN_COURSE_COMMERCIAL_UPLIFT_BASIS_POINTS,
    vatBasisPoints: OWN_COURSE_VAT_BASIS_POINTS,
  } as const;
}

const expectedGross = [799, 1100, 1399, 1699, 2299, 2999];
OWN_COURSE_PRICING_BANDS.forEach((item, index) => {
  if (item.grossPence !== expectedGross[index]) {
    throw new Error(`Invalid Sousa Murray course pricing band ${item.id}: expected ${expectedGross[index]} pence gross, got ${item.grossPence}.`);
  }
});
