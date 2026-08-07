import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Clock3,
  GraduationCap,
  Library,
  ShieldCheck,
  ShoppingBasket,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  courseDuration,
  findLibraryCourse,
  flattenCourseLessons,
} from './libraryCatalogue';
import {
  addLearningCourseToStoredBasket,
  useLearningCourseBasket,
} from './learning-course-basket';
import './public-library-course-page.css';

type PricingResponse = {
  configured: boolean;
  accessDays: number | null;
  accessLabel: string | null;
  items: Array<{
    courseSlug: string;
    configured: boolean;
    grossPence: number | null;
  }>;
};

type AccountCourseState = {
  entitlementActive?: boolean;
  accessSource?: string;
  enrolment?: { id: string; status: string; progress_percent: number } | null;
  lessons?: Array<{ lessonId: string; status: string }>;
};

const TRIAL_COURSE_SLUG = 'ai-literacy-for-everyday-work';

function money(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(pence / 100);
}

export default function PublicLibraryCoursePage({ slug }: { slug: string }) {
  const course = findLibraryCourse(slug);
  const { addItem, contains } = useLearningCourseBasket();
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [accountCourse, setAccountCourse] = useState<AccountCourseState | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!course) return;
    fetch(`/api/lms/course-purchase-pricing?slugs=${encodeURIComponent(course.slug)}`, { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<PricingResponse> : null)
      .then((result) => result && setPricing(result))
      .catch(() => undefined);

    fetch(`/api/lms/courses/${encodeURIComponent(course.slug)}`, { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<AccountCourseState> : null)
      .then((result) => setAccountCourse(result))
      .catch(() => setAccountCourse(null));
  }, [course?.slug]);

  const lessons = useMemo(() => course ? flattenCourseLessons(course) : [], [course]);
  if (!course) return <main className="plcp-page"><div className="lp-container plcp-not-found"><h1>Course not found</h1><Link to="/learning-library/courses">Return to the course catalogue</Link></div></main>;

  const price = pricing?.items.find((item) => item.courseSlug === course.slug);
  const inBasket = contains(course.slug) || added;
  const alreadyAccessible = Boolean(accountCourse?.entitlementActive);
  const progress = new Map((accountCourse?.lessons ?? []).map((item) => [item.lessonId, item.status]));
  const nextLesson = lessons.find((lesson) => progress.get(lesson.id) !== 'completed') ?? lessons[0];
  const learningHref = accountCourse?.enrolment && nextLesson
    ? `/lms/course/${course.slug}?lesson=${encodeURIComponent(nextLesson.id)}`
    : `/lms/course/${course.slug}`;

  const add = () => {
    addItem(course.slug);
    setAdded(true);
  };
  const buyNow = () => {
    if (addLearningCourseToStoredBasket(course.slug)) {
      window.location.assign('/learning-library/basket');
    }
  };

  return <main className="plcp-page">
    <section className="plcp-hero"><div className="lp-container">
      <Link className="plcp-back" to="/learning-library/courses"><ArrowLeft /> Sousa Murray course catalogue</Link>
      <span className="plcp-source">Sousa Murray course · Sousa Murray LMS</span>
      <div className="plcp-hero-grid">
        <div><small>{course.code} · Version {course.version}</small><h1>{course.title}</h1><p>{course.overview}</p><div className="plcp-meta"><span><Clock3 /> {courseDuration(course)} minutes</span><span><Library /> {course.modules.length} modules</span><span><GraduationCap /> {course.level}</span></div></div>
        <aside className="plcp-purchase-card">
          {alreadyAccessible ? <>
            <ShieldCheck />
            <span>Available in your learning account</span>
            <h2>No course payment due</h2>
            <p>This course is already available to you through your current Learning Library plan, individual purchase, trial or assigned access.</p>
            <Link className="plcp-primary" to={learningHref}>{accountCourse?.enrolment ? 'Open course' : 'Complete enrolment'} <ArrowRight /></Link>
            <small>Your existing course access is used. The course is not added to the purchase basket again.</small>
          </> : <>
            <ShoppingBasket />
            <span>Individual course purchase</span>
            <h2>{price?.configured && price.grossPence ? money(price.grossPence) : 'Individual purchase'}</h2>
            {price?.configured && price.grossPence && <small>including VAT</small>}
            <p>Purchase this Sousa Murray course for one named learner. After secure Stripe payment, the learner is enrolled into the Sousa Murray LMS using the personal details provided during checkout.</p>
            {pricing?.accessLabel && <strong>{pricing.accessLabel}</strong>}
            <button type="button" className="plcp-primary" onClick={buyNow}>Buy now <ArrowRight /></button>
            <button type="button" className="plcp-secondary" onClick={add} disabled={inBasket}>{inBasket ? 'Added to course basket' : 'Add to course basket'} <ShoppingBasket /></button>
            {course.slug === TRIAL_COURSE_SLUG && <Link className="plcp-trial-link" to={`/lms/course/${course.slug}`}>Free 7-day trial <ArrowRight /></Link>}
            <Link className="plcp-plan-link" to="/plans">Buy a Learning Library plan <ArrowRight /></Link>
            <small>Plans are purchased separately. They are never added to the course basket.</small>
          </>}
        </aside>
      </div>
    </div></section>

    <section className="plcp-content"><div className="lp-container plcp-content-grid">
      <div>
        <section><span className="plcp-kicker">What you will learn</span><h2>Learning outcomes</h2><ul className="plcp-check-list">{course.learningOutcomes.map((outcome) => <li key={outcome}><Check /> <span>{outcome}</span></li>)}</ul></section>
        <section><span className="plcp-kicker">Course syllabus</span><h2>{course.modules.length} structured modules</h2><div className="plcp-module-list">{course.modules.map((module, moduleIndex) => <article key={module.id}><span>Module {moduleIndex + 1}</span><h3>{module.title}</h3><p>{module.description}</p><ol>{module.lessons.map((lesson) => <li key={lesson.id}><span>{lesson.title}</span><small>{lesson.minutes} min</small></li>)}</ol></article>)}</div></section>
      </div>
      <aside className="plcp-facts">
        <section><BookOpen /><h3>Who this course is for</h3><ul>{course.audience.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section><ShieldCheck /><h3>Before you begin</h3><p>{course.prerequisites}</p></section>
        <section><Award /><h3>Assessment and certificate</h3><dl><div><dt>Lessons</dt><dd>{lessons.length}</dd></div><div><dt>Final assessment</dt><dd>{course.finalAssessment.passMark}% pass mark</dd></div><div><dt>Certificate</dt><dd>Issued after successful completion</dd></div></dl></section>
        <section><h3>Also included in Learning Library plans</h3><p>{course.includedPlans.join(', ')}</p><Link to="/plans">Buy a plan</Link></section>
      </aside>
    </div></section>

    <section className="plcp-journey"><div className="lp-container"><span className="plcp-kicker">What happens after purchase</span><h2>From Stripe checkout to your course</h2><div className="plcp-steps"><article><b>1</b><h3>Choose the course</h3><p>Add one or more Sousa Murray courses to the dedicated course basket. Plans remain a separate purchase route.</p></article><article><b>2</b><h3>Provide learner details</h3><p>Enter the learner's legal first name, legal last name and enrolment email so the correct learning record can be created.</p></article><article><b>3</b><h3>Secure payment</h3><p>Complete the order through JA Group Services Central Payments and Stripe Checkout.</p></article><article><b>4</b><h3>Automatic enrolment</h3><p>After Central Payments confirms the payment, Sousa Murray eLearning creates the course entitlement and LMS enrolment.</p></article><article><b>5</b><h3>Start inside the LMS</h3><p>The course appears in My Sousa Murray eLearning. Start Course opens the lesson player directly, not this public information page.</p></article></div></div></section>
  </main>;
}