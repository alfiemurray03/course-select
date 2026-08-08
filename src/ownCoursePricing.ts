import { courseDuration, flattenCourseLessons, type LibraryCourse } from './libraryCatalogue';

export const OWN_COURSE_COMMERCIAL_UPLIFT_BASIS_POINTS = 3000;
export const OWN_COURSE_VAT_BASIS_POINTS = 2000;

export type OwnCoursePricingBandId = 'value' | 'essential' | 'standard' | 'enhanced' | 'professional' | 'extended';
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

function band(id: OwnCoursePricingBandId, maximumScore: number | null, baseValuePence: number): OwnCoursePricingBand {
  return { id, maximumScore, baseValuePence, ...commercialPrice(baseValuePence) };
}

export const OWN_COURSE_PRICING_BANDS: readonly OwnCoursePricingBand[] = [
  band('value', 115, 512),          // £7.99 including VAT
  band('essential', 140, 705),      // £11.00 including VAT
  band('standard', 165, 897),       // £13.99 including VAT
  band('enhanced', 195, 1089),      // £16.99 including VAT
  band('professional', 230, 1474),  // £22.99 including VAT
  band('extended', null, 1922),     // £29.99 including VAT
] as const;

const PROGRAMME_BAND_BY_PREFIX: Record<string, OwnCoursePricingBandId> = {
  WRK: 'standard',
  COM: 'standard',
  SAF: 'enhanced',
  SAL: 'enhanced',
  CAR: 'enhanced',
  BUS: 'professional',
  DAI: 'professional',
  SEC: 'professional',
  DEV: 'professional',
  M36: 'extended',
  LDR: 'extended',
  OPS: 'extended',
  GOV: 'extended',
};

export function ownCourseComplexity(course: LibraryCourse) {
  const lessons = flattenCourseLessons(course);
  const durationMinutes = courseDuration(course);
  const moduleCount = course.modules.length;
  const lessonCount = lessons.length;
  const assessmentQuestionCount = course.finalAssessment.questions.length;
  const levelWeight = course.level === 'Intermediate' ? 22 : 0;
  // Programme duration is intentionally normalised so a real multi-week course
  // can still be compared with the historic complexity scale.
  const score = Math.round(durationMinutes / 40)
    + moduleCount * 4
    + lessonCount
    + assessmentQuestionCount
    + levelWeight;
  return { level: course.level, durationMinutes, moduleCount, lessonCount, assessmentQuestionCount, score } as const;
}

export function ownCourseIndividualPrice(course: LibraryCourse) {
  const complexity = ownCourseComplexity(course);
  const prefix = course.code.split('-')[1] || '';
  const programmeBandId = /-5\d{2}$/.test(course.code) ? PROGRAMME_BAND_BY_PREFIX[prefix] : undefined;
  const pricingBand = programmeBandId
    ? OWN_COURSE_PRICING_BANDS.find((item) => item.id === programmeBandId)!
    : OWN_COURSE_PRICING_BANDS.find((item) => item.maximumScore === null || complexity.score <= item.maximumScore)
      ?? OWN_COURSE_PRICING_BANDS[OWN_COURSE_PRICING_BANDS.length - 1];

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
