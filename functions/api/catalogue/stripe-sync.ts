import { catalogue, singleLicenceTier } from '../../../src/catalogue';
import { libraryCourses } from '../../../src/libraryCatalogue';
import { ownCourseIndividualPrice } from '../../../src/ownCoursePricing';
import type { CentralPaymentsEnv } from '../../_shared/central-payments';
import type { ProductionLmsEnv } from '../../_shared/production-lms';

type SyncEnv = ProductionLmsEnv & CentralPaymentsEnv;

type CourseProductManifestItem = {
  family: 'sousa_murray' | 'highfield';
  courseId: string;
  courseCode: string;
  courseSlug: string;
  name: string;
  description: string;
  url: string;
  level?: 'Foundation' | 'Intermediate';
  durationMinutes?: number;
  moduleCount?: number;
  lessonCount?: number;
  assessmentQuestionCount?: number;
  pricingBand?: string;
  pricingScore?: number;
  baseValuePence?: number;
  commercialUpliftBasisPoints?: number;
  vatBasisPoints?: number;
  grossPence?: number;
  netPence?: number;
  vatPence?: number;
  priceSource?: string;
};

type HeadOfficeSyncResult = {
  synced: number;
  createdProducts: number;
  existingProducts: number;
  createdPrices: number;
  replacedPrices: number;
  pendingPrices: number;
  ownCoursePricingConfigured: boolean;
  ownCourseAccessConfigured: boolean;
  results?: Array<{
    courseCode: string;
    family: string;
    productCode: string;
    stripeProductId: string;
    productCreated: boolean;
    priceStatus: string;
    stripePriceId: string | null;
    grossPence: number | null;
  }>;
};

type RetirementResult = { activeCourseCount: number; retiredCount: number; retired: Array<{ productCode: string; name: string; stripeProductId: string | null }> };
type TrialCatalogueResult = { synced: number; createdProducts: number; updatedProducts: number; createdPrices: number; results?: unknown[] };

const HEAD_OFFICE_DEFAULT = 'https://customerops.jagroupservices.co.uk';
const MAX_BATCH = 25;
const encoder = new TextEncoder();

function connector(env: SyncEnv) {
  const token = String(env.CUSTOMEROPS_API_KEY || env.HEAD_OFFICE_PLATFORM_KEY || '').trim();
  const base = String(env.CUSTOMEROPS_BASE_URL || env.HEAD_OFFICE_API_BASE_URL || HEAD_OFFICE_DEFAULT).trim().replace(/\/$/, '');
  return { token, base };
}

function highfieldCode(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `HF-${hash.toString(16).toUpperCase().padStart(8, '0')}`;
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function ownManifest(): CourseProductManifestItem[] {
  return libraryCourses.map((course) => {
    const price = ownCourseIndividualPrice(course);
    return {
      family: 'sousa_murray',
      courseId: course.code,
      courseCode: course.code,
      courseSlug: course.slug,
      name: `Sousa Murray eLearning — ${course.title}`,
      description: `${course.shortDescription} Full ${course.studyPlan?.durationWeeks ?? 12}-week programme with applied assignments, capstone project and final assessment. Delivered through the Sousa Murray LMS for one named learner.`,
      url: `https://sousamurrayelearning.jagroupservices.co.uk/learning-library/courses/${course.slug}`,
      level: price.level,
      durationMinutes: price.durationMinutes,
      moduleCount: price.moduleCount,
      lessonCount: price.lessonCount,
      assessmentQuestionCount: price.assessmentQuestionCount,
      pricingBand: price.id,
      pricingScore: price.score,
      baseValuePence: price.baseValuePence,
      commercialUpliftBasisPoints: price.commercialUpliftBasisPoints,
      vatBasisPoints: price.vatBasisPoints,
      netPence: price.retailNetPence,
      vatPence: price.vatPence,
      grossPence: price.grossPence,
      priceSource: 'Sousa Murray governed programme pricing: 30% commercial uplift, then UK standard-rate VAT',
    };
  });
}

function highfieldManifest(): CourseProductManifestItem[] {
  return catalogue.map((course) => {
    const price = singleLicenceTier(course);
    return {
      family: 'highfield',
      courseId: course.id,
      courseCode: highfieldCode(course.id),
      courseSlug: course.slug,
      name: `Highfield Online Training — ${course.title}`,
      description: `${course.shortDescription} Sold by Sousa Murray eLearning, operated by JA Group Services Ltd, and delivered through the Highfield LMS.`,
      url: `https://sousamurrayelearning.jagroupservices.co.uk/courses/${course.slug}`,
      grossPence: price.aptenvoGrossPence,
      netPence: price.aptenvoNetPence,
      vatPence: price.vatPence,
      priceSource: course.priceSource,
    };
  });
}

async function ensureSyncSchema(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS stripe_course_catalogue_sync_state (
    batch_key TEXT PRIMARY KEY,
    manifest_hash TEXT NOT NULL,
    family TEXT NOT NULL,
    offset_value INTEGER NOT NULL,
    item_count INTEGER NOT NULL,
    status TEXT NOT NULL,
    result_json TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

async function headOfficeRequest<T>(env: SyncEnv, path: string, body: unknown): Promise<T> {
  const { token, base } = connector(env);
  if (!token) throw Object.assign(new Error('The Head Office Central Payments platform key is not configured.'), { status: 503 });
  const target = new URL(path, `${base}/`);
  if (target.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(target.hostname)) {
    throw Object.assign(new Error('The Head Office Central Payments connector must use HTTPS.'), { status: 503 });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(target.toString(), {
      method: 'POST', signal: controller.signal,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json<Record<string, unknown>>().catch(() => ({}));
    if (!response.ok) {
      const detail = result.error && typeof result.error === 'object' ? result.error as Record<string, unknown> : null;
      const message = typeof detail?.message === 'string' ? detail.message : `Head Office catalogue operation returned HTTP ${response.status}.`;
      throw Object.assign(new Error(message), { status: response.status });
    }
    return result as T;
  } finally { clearTimeout(timeout); }
}

async function callHeadOffice(env: SyncEnv, items: CourseProductManifestItem[]) {
  return headOfficeRequest<HeadOfficeSyncResult>(env, '/api/v1/payments/course-catalogue-sync', { brand: 'SOUSA_MURRAY_ELEARNING', items });
}

async function retireStaleOwnCourses(env: SyncEnv) {
  return headOfficeRequest<RetirementResult>(env, '/api/v1/payments/course-catalogue-retire', {
    brand: 'SOUSA_MURRAY_ELEARNING',
    activeCourseCodes: libraryCourses.map((course) => course.code),
  });
}

async function syncProgrammeTrials(env: SyncEnv) {
  return headOfficeRequest<TrialCatalogueResult>(env, '/api/v1/payments/programme-trial-catalogue-sync', {
    brand: 'SOUSA_MURRAY_ELEARNING',
  });
}

export const onRequestGet: PagesFunction<SyncEnv> = async ({ request, env }) => {
  if (!env.DB) return Response.json({ error: 'database_not_bound', message: 'The eLearning database is not configured.' }, { status: 503 });
  const url = new URL(request.url);
  const family = url.searchParams.get('family') === 'highfield' ? 'highfield' : 'sousa_murray';
  const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0);
  const requestedLimit = Number.parseInt(url.searchParams.get('limit') || String(MAX_BATCH), 10) || MAX_BATCH;
  const limit = Math.min(MAX_BATCH, Math.max(1, requestedLimit));
  const force = url.searchParams.get('force') === '1';
  const manifest = family === 'highfield' ? highfieldManifest() : ownManifest();
  const items = manifest.slice(offset, offset + limit);

  if (!items.length) {
    return Response.json({ family, offset, limit, total: manifest.length, synced: 0, complete: true, nextOffset: null }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }

  await ensureSyncSchema(env.DB);
  const manifestHash = await digest(JSON.stringify(items));
  const batchKey = `${family}:${offset}:${items.length}`;
  const previous = await env.DB.prepare(`SELECT manifest_hash,status,result_json FROM stripe_course_catalogue_sync_state WHERE batch_key=? LIMIT 1`)
    .bind(batchKey).first<{ manifest_hash: string; status: string; result_json: string | null }>();
  const finalBatch = offset + items.length >= manifest.length;

  if (!force && previous?.manifest_hash === manifestHash && previous.status === 'completed') {
    let priorResult: HeadOfficeSyncResult | null = null;
    try { priorResult = previous.result_json ? JSON.parse(previous.result_json) as HeadOfficeSyncResult : null; } catch {}
    let retirement: RetirementResult | null = null;
    let trialCatalogue: TrialCatalogueResult | null = null;
    if (family === 'sousa_murray' && finalBatch) {
      retirement = await retireStaleOwnCourses(env);
      trialCatalogue = await syncProgrammeTrials(env);
    }
    return Response.json({ family, offset, limit, total: manifest.length, cached: true, complete: finalBatch, nextOffset: finalBatch ? null : offset + items.length, retirement, trialCatalogue, ...(priorResult ?? { synced: items.length }) }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }

  try {
    await env.DB.prepare(`INSERT INTO stripe_course_catalogue_sync_state
      (batch_key,manifest_hash,family,offset_value,item_count,status,result_json,completed_at,updated_at)
      VALUES (?,?,?,?,?,'running',NULL,NULL,CURRENT_TIMESTAMP)
      ON CONFLICT(batch_key) DO UPDATE SET manifest_hash=excluded.manifest_hash,family=excluded.family,
        offset_value=excluded.offset_value,item_count=excluded.item_count,status='running',result_json=NULL,completed_at=NULL,updated_at=CURRENT_TIMESTAMP`)
      .bind(batchKey, manifestHash, family, offset, items.length).run();

    const result = await callHeadOffice(env, items);
    await env.DB.prepare(`UPDATE stripe_course_catalogue_sync_state SET status='completed',result_json=?,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE batch_key=?`)
      .bind(JSON.stringify(result), batchKey).run();
    let retirement: RetirementResult | null = null;
    let trialCatalogue: TrialCatalogueResult | null = null;
    if (family === 'sousa_murray' && finalBatch) {
      retirement = await retireStaleOwnCourses(env);
      trialCatalogue = await syncProgrammeTrials(env);
    }

    return Response.json({ family, offset, limit, total: manifest.length, cached: false, complete: finalBatch, nextOffset: finalBatch ? null : offset + items.length, retirement, trialCatalogue, ...result }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch (error) {
    await env.DB.prepare(`UPDATE stripe_course_catalogue_sync_state SET status='failed',updated_at=CURRENT_TIMESTAMP WHERE batch_key=?`).bind(batchKey).run().catch(() => undefined);
    return Response.json({ error: 'stripe_catalogue_sync_failed', message: error instanceof Error ? error.message : 'The Stripe course catalogue could not be synchronised.', family, offset, limit, total: manifest.length }, { status: Number((error as { status?: number })?.status || 502), headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
};
