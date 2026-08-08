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
import { findLibraryCourse, flattenCourseLessons } from './libraryCatalogue';
import { addLearningCourseToStoredBasket, useLearningCourseBasket } from './learning-course-basket';
import './public-library-course-page.css';

type PricingResponse = {
  configured: boolean;
  accessDays: number | null;
  accessLabel: string | null;
  items: Array<{ courseSlug: string; configured: boolean; grossPence: number | null }>;
};

type AccountCourseState = {
  entitlementActive?: boolean;
  accessSource?: string;
  enrolment?: { id: string; status: string; progress_percent: number } | null;
  lessons?: Array<{ lessonId: string; status: string }>;
};

const TRIAL_COURSE_SLUG = 'digital-skills-and-ai-at-work';

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
      .then((result) => result && setPricing(result)).catch(() => undefined);
    fetch(`/api/lms/courses/${encodeURIComponent(course.slug)}`, { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<AccountCourseState> : null)
      .then((result) => setAccountCourse(result)).catch(() => setAccountCourse(null));
  }, [course?.slug]);

  const lessons = useMemo(() => course ? flattenCourseLessons(course) : [], [course]);
  if (!course) return <main className="plcp-page"><div className="lp-container plcp-not-found"><h1>Programme not found</h1><Link to="/learning-library/courses">Return to the programme catalogue</Link></div></main>;

  const price = pricing?.items.find((item) => item.courseSlug === course.slug);
  const inBasket = contains(course.slug) || added;
  const alreadyAccessible = Boolean(accountCourse?.entitlementActive);
  const progress = new Map((accountCourse?.lessons ?? []).map((item) => [item.lessonId, item.status]));
  const nextLesson = lessons.find((lesson) => progress.get(lesson.id) !== 'completed') ?? lessons[0];
  const learningHref = accountCourse?.enrolment && nextLesson ? `/lms/course/${course.slug}?lesson=${encodeURIComponent(nextLesson.id)}` : `/lms/course/${course.slug}`;
  const add = () => { addItem(course.slug); setAdded(true); };
  const buyNow = () => { if (addLearningCourseToStoredBasket(course.slug)) window.location.assign('/basket'); };

  return <main className="plcp-page">
    <section className="plcp-hero"><div className="lp-container">
      <Link className="plcp-back" to="/learning-library/courses"><ArrowLeft /> Sousa Murray programme catalogue</Link>
      <span className="plcp-source">Sousa Murray 12-week programme · Sousa Murray LMS</span>
      <div className="plcp-hero-grid">
        <div><small>{course.code} · Version {course.version}</small><h1>{course.title}</h1><p>{course.overview}</p><div className="plcp-meta"><span><Clock3 /> {course.studyPlan?.durationWeeks} weeks · {course.studyPlan?.totalQualificationTimeHours} study hours</span><span><Library /> {course.modules.length} weekly modules · {lessons.length} lessons</span><span><GraduationCap /> {course.level}</span></div></div>
        <aside className="plcp-purchase-card">
          {alreadyAccessible ? <><ShieldCheck /><span>Available in your learning account</span><h2>No programme payment due</h2><p>This programme is already available through your current Learning Library plan, individual purchase, trial or assigned access.</p><Link className="plcp-primary" to={learningHref}>{accountCourse?.enrolment ? 'Open programme' : 'Complete enrolment'} <ArrowRight /></Link><small>Your existing access is used. The programme is not added to the basket again.</small></> : <><ShoppingBasket /><span>Individual programme purchase</span><h2>{price?.grossPence ? money(price.grossPence) : 'Individual purchase'}</h2>{price?.grossPence && <small>including VAT · 12 months access</small>}<p>Purchase this full 12-week Sousa Murray programme for one named learner. The learner receives 12 months of access, giving time to complete the weekly study, applied assignments, capstone project and final assessment.</p>{pricing?.accessLabel && <strong>{pricing.accessLabel}</strong>}<button type="button" className="plcp-primary" onClick={buyNow}>Buy now <ArrowRight /></button><button type="button" className="plcp-secondary" onClick={add} disabled={inBasket}>{inBasket ? 'Added to basket' : 'Add to basket'} <ShoppingBasket /></button>{course.slug === TRIAL_COURSE_SLUG && <Link className="plcp-trial-link" to={`/lms/course/${course.slug}`}>Free 7-day trial <ArrowRight /></Link>}<Link className="plcp-plan-link" to="/plans">Buy a Learning Library plan <ArrowRight /></Link><small>Plans are purchased separately and are never basket items.</small></>}
        </aside>
      </div>
    </div></section>

    <section className="plcp-content"><div className="lp-container plcp-content-grid">
      <div>
        <section><span className="plcp-kicker">Programme structure</span><h2>Designed for around three months of study</h2><p>{course.studyPlan?.deliveryPattern}</p><ul className="plcp-check-list"><li><Check /><span><strong>{course.studyPlan?.guidedLearningHours} hours</strong> guided lesson study</span></li><li><Check /><span><strong>{course.studyPlan?.independentStudyHours} hours</strong> applied and independent work</span></li><li><Check /><span><strong>{course.studyPlan?.expectedHoursPerWeek}</strong> expected study each week</span></li><li><Check /><span><strong>{course.capstoneProject?.estimatedHours} hour capstone project</strong> before the final assessment</span></li><li><Check /><span><strong>{course.finalAssessment.questions.length}-question final assessment</strong> with an {course.finalAssessment.passMark}% pass mark</span></li></ul></section>
        <section><span className="plcp-kicker">What you will learn</span><h2>Programme learning outcomes</h2><ul className="plcp-check-list">{course.learningOutcomes.map((outcome) => <li key={outcome}><Check /> <span>{outcome}</span></li>)}</ul></section>
        <section><span className="plcp-kicker">12-week syllabus</span><h2>{course.modules.length} weekly modules</h2><div className="plcp-module-list">{course.modules.map((module) => <article key={module.id}><span>Week {module.week}</span><h3>{module.title.replace(/^Week \d+: /, '')}</h3><p>{module.description}</p><ol>{module.lessons.map((lesson) => <li key={lesson.id}><span>{lesson.title}</span><small>{lesson.minutes} min teaching{lesson.assignment ? ` + ${lesson.assignment.estimatedMinutes} min applied work` : ''}</small></li>)}</ol></article>)}</div></section>
        {course.capstoneProject && <section><span className="plcp-kicker">Capstone project</span><h2>{course.capstoneProject.title}</h2><p>{course.capstoneProject.brief}</p><ul className="plcp-check-list">{course.capstoneProject.deliverables.map((item) => <li key={item}><Check /><span>{item}</span></li>)}</ul></section>}
      </div>
      <aside className="plcp-facts">
        <section><BookOpen /><h3>Who this programme is for</h3><ul>{course.audience.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section><ShieldCheck /><h3>Before you begin</h3><p>{course.prerequisites}</p></section>
        <section><Award /><h3>Assessment and certificate</h3><dl><div><dt>Weekly lessons</dt><dd>{lessons.length}</dd></div><div><dt>Formative checks</dt><dd>5 questions per lesson · 80% required</dd></div><div><dt>Applied work</dt><dd>Weekly learning-journal assignments</dd></div><div><dt>Capstone</dt><dd>Required before final assessment</dd></div><div><dt>Final assessment</dt><dd>{course.finalAssessment.questions.length} questions · {course.finalAssessment.passMark}% pass mark</dd></div><div><dt>Certificate</dt><dd>Issued after successful completion</dd></div></dl></section>
        <section><h3>Included Learning Library plans</h3><p>{course.includedPlans.join(', ')}</p><Link to="/plans">Buy a plan</Link></section>
      </aside>
    </div></section>

    <section className="plcp-journey"><div className="lp-container"><span className="plcp-kicker">Learning journey</span><h2>From purchase to programme completion</h2><div className="plcp-steps"><article><b>1</b><h3>Purchase or plan access</h3><p>Buy the programme individually or receive it through an eligible Learning Library plan.</p></article><article><b>2</b><h3>Named learner enrolment</h3><p>Your legal name and enrolment email create the learning record and future certificate identity.</p></article><article><b>3</b><h3>12 weeks of structured learning</h3><p>Work through two substantial lessons each week with teaching, practical activities and five-question formative checks.</p></article><article><b>4</b><h3>Applied evidence and capstone</h3><p>Complete weekly written learning-journal work and a final integrated capstone project.</p></article><article><b>5</b><h3>Final assessment and certificate</h3><p>Complete the full final assessment at the required pass mark to earn a verifiable Sousa Murray completion certificate.</p></article></div></div></section>
  </main>;
}
