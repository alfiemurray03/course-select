import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  GraduationCap,
  Headphones,
  Infinity as InfinityIcon,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AccessibilityTools from './AccessibilityTools';
import AgeGate from './AgeGate';
import AppShell from './AppShell';
import BrandedLearnerDashboard from './BrandedLearnerDashboard';
import { catalogue as highfieldCatalogue, formatMoney, singleLicenceTier } from './catalogue';
import { flattenCourseLessons, libraryCategories, libraryCourses } from './libraryCatalogue';
import LearningCourseBasketPage, { LearningCoursePurchaseSuccessPage } from './LearningCourseBasketPage';
import ProductionLearningManagementSystem from './ProductionLearningManagementSystem';
import PublicLibraryCoursePage from './PublicLibraryCoursePage';
import PublicSiteHeader from './PublicSiteHeader';
import './learning-platform.css';
import './theme-compatibility-fix.css';

const plans = [
  { id: 'learner', name: 'Learner', price: '£9.99', audience: '1 named learner', copy: 'Access the selected Core Learning Library, progress tracking, assessments and certificates.', features: ['Core course collection', 'Structured lessons and checks', 'Completion certificates'], featured: false },
  { id: 'learner-plus', name: 'Learner Plus', price: '£16.99', audience: '1 named learner', copy: 'The complete individual Learning Library, including compliance and advanced courses.', features: ['Complete course collection', 'Final assessments', 'Priority support'], featured: true },
  { id: 'team-5', name: 'Team 5', price: '£39.99', audience: 'Up to 5 learners', copy: 'Selected Core Learning Library access for a small team with learner oversight.', features: ['Five named learner seats', 'Assignments and progress', 'Certificate reporting'], featured: false },
  { id: 'team-15', name: 'Team 15', price: '£89.99', audience: 'Up to 15 learners', copy: 'Wider learner capacity, complete course access and organisation reporting.', features: ['Fifteen learner seats', 'Deadlines and reminders', 'Team completion reports'], featured: false },
] as const;

const subjects = libraryCategories;
const moduleCount = libraryCourses.reduce((total, course) => total + course.modules.length, 0);
const lessonCount = libraryCourses.reduce((total, course) => total + flattenCourseLessons(course).length, 0);
const ownFeaturedCourses = (() => {
  const featured = libraryCourses.filter((course) => course.featured);
  return (featured.length >= 3 ? featured : libraryCourses).slice(0, 3);
})();
const highfieldFeaturedCourses = highfieldCatalogue.filter((course) => course.featured).slice(0, 3);

function Footer() {
  return <>
    <footer className="lp-footer">
      <div><strong>Sousa Murray eLearning</strong><p>Individually purchased courses, Learning Library plans and professional training, operated by JA Group Services Ltd.</p></div>
      <div><h3>Learning</h3><Link to="/learning-library">Sousa Murray courses</Link><Link to="/learning-library/courses">Sousa Murray course catalogue</Link><Link to="/learning-library/basket">Course Basket</Link><Link to="/plans">Learning Library plans</Link><Link to="/professional-training">Professional Training</Link><Link to="/courses">Highfield course catalogue</Link></div>
      <div><h3>Support</h3><Link to="/lms/dashboard">My Sousa Murray eLearning</Link><Link to="/organisations">For organisations</Link><Link to="/support">Help Centre</Link><Link to="/contact">Contact</Link></div>
      <div><h3>Legal</h3><Link to="/terms">Terms of Use</Link><Link to="/privacy">Privacy Policy</Link><Link to="/refunds">Refunds Policy</Link><Link to="/complaints">Complaints</Link></div>
    </footer>
    <div className="lp-disclosure"><span><strong>Sousa Murray eLearning is a trading division of JA Group Services Ltd.</strong> Company number 16314179 · ICO registration ZB877370 · Adults aged 18+.</span><span>© {new Date().getFullYear()} JA Group Services Ltd.</span></div>
  </>;
}

function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: 'auto' }), [location.pathname]);
  return <><AgeGate /><AccessibilityTools /><PublicSiteHeader />{children}<Footer /></>;
}

function Plans({ preview = false }: { preview?: boolean }) {
  return <div className="lp-plan-grid">{plans.map((plan) => <article className={plan.featured ? 'featured' : ''} key={plan.id}>
    {plan.featured && <span className="lp-popular">Complete individual plan</span>}
    <small>{plan.audience}</small><h3>{plan.name}</h3><div className="lp-price">{plan.price}<span>/month<br />VAT included</span></div><p>{plan.copy}</p>
    {!preview && <ul>{plan.features.map((item) => <li key={item}><Check size={16} /> {item}</li>)}</ul>}
    <Link to={preview ? '/plans' : `/lms/subscribe/${plan.id}`}>{preview ? 'View plan' : `Choose ${plan.name}`} <ArrowRight size={16} /></Link>
  </article>)}</div>;
}

function HomePage() {
  return <main>
    <section className="lp-hero"><div className="lp-container lp-hero-grid">
      <div><div className="lp-eyebrow"><Sparkles size={16} /> Sousa Murray courses, plans and Highfield Professional Training</div><h1>Buy the course you need, or choose a plan for wider learning access.</h1><p>Purchase individual Sousa Murray eLearning courses, choose a Learning Library plan for included course access, or buy specialist Highfield Online Training courses separately.</p><div className="lp-actions"><Link className="lp-button light" to="/learning-library/courses">Browse Sousa Murray courses <ArrowRight size={18} /></Link><Link className="lp-button ghost" to="/courses">Browse Highfield courses</Link></div><div className="lp-assurances"><span><Check size={16} /> Adults aged 18+</span><span><Check size={16} /> VAT-inclusive prices</span><span><Check size={16} /> Sousa Murray eLearning support</span></div></div>
      <aside className="lp-route-panel"><span>Choose how you want to learn</span><article><BookOpen /><div><h2>Buy a Sousa Murray course</h2><p>Choose an individual course from our own catalogue and enrol the named learner into the Sousa Murray LMS.</p><Link to="/learning-library/courses">Browse courses <ArrowRight size={15} /></Link></div></article><article><InfinityIcon /><div><h2>Buy a Learning Library plan</h2><p>Choose a Personal or Business plan for access to the courses included in that plan.</p><Link to="/plans">Buy a plan <ArrowRight size={15} /></Link></div></article><article><GraduationCap /><div><h2>Highfield Professional Training</h2><p>Individually purchased Highfield courses delivered through the Highfield LMS.</p><Link to="/courses">Browse Highfield courses <ArrowRight size={15} /></Link></div></article></aside>
    </div></section>
    <section className="lp-strip"><div className="lp-container"><span><ShieldCheck /> Operated by JA Group Services Ltd</span><span><Headphones /> Sousa Murray first-line support</span><span><LayoutDashboard /> Dedicated Sousa Murray LMS</span><span><Award /> Assessed completion certificates</span></div></section>

    <section className="lp-section"><div className="lp-container"><header className="lp-section-head"><span>Featured Sousa Murray courses</span><h2>Start with one of our own courses</h2><p>Our own courses run inside the Sousa Murray LMS. Each course can sit alongside Learning Library plan access in the same learner account.</p></header><div className="lp-featured-course-grid">{ownFeaturedCourses.map((course) => <article key={course.slug}><span>Sousa Murray course · {course.level}</span><BookOpen /><h3>{course.title}</h3><p>{course.shortDescription}</p><small>{course.modules.length} modules · {flattenCourseLessons(course).length} lessons</small><div><Link to={`/learning-library/courses/${course.slug}`}>View &amp; buy course <ArrowRight size={15} /></Link><Link to="/plans">Buy a plan</Link></div></article>)}</div><div className="lp-centre"><Link className="lp-button primary" to="/learning-library/courses">View all Sousa Murray courses <ArrowRight /></Link></div></div></section>

    <section className="lp-section muted"><div className="lp-container"><header className="lp-section-head"><span>Featured Highfield courses</span><h2>Professional training available to buy individually</h2><p>Highfield courses are purchased through Sousa Murray eLearning and delivered through the Highfield LMS after the named learner is enrolled.</p></header><div className="lp-featured-course-grid highfield">{highfieldFeaturedCourses.map((course) => { const tier = singleLicenceTier(course); return <article key={course.slug}><span>Highfield Online Training · {course.level}</span><GraduationCap /><h3>{course.title}</h3><p>{course.shortDescription}</p><small>From {formatMoney(tier.aptenvoGrossPence)} including VAT</small><div><Link to={`/courses/${course.slug}`}>Buy now <ArrowRight size={15} /></Link><Link to="/courses">View catalogue</Link></div></article>; })}</div><div className="lp-centre"><Link className="lp-button primary" to="/courses">View all Highfield courses <ArrowRight /></Link></div></div></section>

    <section className="lp-section"><div className="lp-container"><header className="lp-section-head"><span>Three clear routes</span><h2>Choose the access model that suits the learner</h2><p>Sousa Murray course purchases, Learning Library plans and Highfield Professional Training remain clear about their price, delivery platform and enrolment route.</p></header><div className="lp-service-grid"><article><BookOpen /><small>Individual Sousa Murray course</small><h2>Buy one course</h2><p>Purchase a selected Sousa Murray course for a named learner. Learner details are required before enrolment into the Sousa Murray LMS.</p><ul><li><Check /> Individual course access</li><li><Check /> Sousa Murray LMS</li><li><Check /> Progress, assessment and certificate</li></ul><Link className="lp-button primary" to="/learning-library/courses">Browse Sousa Murray courses <ArrowRight /></Link></article><article><InfinityIcon /><small>Monthly plan</small><h2>Learning Library plans</h2><p>Choose Personal or Business access to the selected Core collection or complete Sousa Murray course catalogue.</p><ul><li><Check /> Named learner access</li><li><Check /> Included course collection</li><li><Check /> Monthly billing</li></ul><Link className="lp-button primary" to="/plans">Buy a plan <ArrowRight /></Link></article><article><GraduationCap /><small>Individual Highfield purchase</small><h2>Professional Training</h2><p>Highfield Online Training courses for professional development, workplace learning and role-specific requirements.</p><ul><li><Check /> Individually priced licences</li><li><Check /> Highfield content and LMS</li><li><Check /> Sousa Murray managed enrolment</li></ul><Link className="lp-button primary" to="/professional-training">Explore professional training <ArrowRight /></Link></article></div></div></section>

    <section className="lp-section muted"><div className="lp-container"><header className="lp-section-head"><span>Learning Library plans</span><h2>Choose broader access for one learner or a team</h2><p>Plan learner-seat limits apply. Highfield Professional Training remains separately purchased.</p></header><Plans preview /><div className="lp-centre"><Link className="lp-button primary" to="/plans">View all plans <ArrowRight /></Link></div></div></section>
  </main>;
}

function LibraryPage() {
  return <main>
    <section className="lp-page-hero"><div className="lp-container"><div className="lp-eyebrow"><BookOpen size={16} /> Sousa Murray course catalogue</div><h1>Buy a course individually or choose a plan for wider access.</h1><p>Every Sousa Murray course contains structured modules, lesson checks and a final assessment. Individual course access and Learning Library plan access both run through the Sousa Murray LMS.</p><div className="lp-actions"><Link className="lp-button light" to="/learning-library/courses">Browse the course catalogue <ArrowRight /></Link><Link className="lp-button ghost" to="/plans">Buy a plan</Link></div></div></section>
    <section className="lp-unlimited-note"><div className="lp-container"><ShieldCheck /><p><strong>Named learner enrolment is required.</strong> The learner's legal first name, legal last name and enrolment email are collected so the correct LMS learning record can be created.</p></div></section>
    <section className="lp-section"><div className="lp-container"><header className="lp-section-head"><span>Complete learning catalogue</span><h2>Structured Sousa Murray courses with assessed completion</h2><p>The catalogue contains {libraryCourses.length} complete courses, {moduleCount} modules and {lessonCount} structured lessons, with lesson knowledge checks and final assessments.</p></header><div className="lp-subject-grid">{subjects.map((subject) => <article key={subject}><BookOpen /><h3>{subject}</h3><p>Clear outcomes, full syllabus information, practical lesson content and assessed completion.</p></article>)}</div><div className="lp-centre"><Link className="lp-button primary" to="/learning-library/courses">View all {libraryCourses.length} courses <ArrowRight /></Link></div></div></section>
    <section className="lp-section muted"><div className="lp-container"><header className="lp-section-head"><span>Learning Library plans</span><h2>Choose your learner capacity</h2></header><Plans /></div></section>
  </main>;
}

function ProfessionalPage() {
  return <main>
    <section className="lp-page-hero professional"><div className="lp-container"><div className="lp-eyebrow"><GraduationCap size={16} /> Professional Training</div><h1>Purchase specialist Highfield courses individually.</h1><p>These courses are separate from the Sousa Murray course catalogue and Learning Library plans. JA Group Services Ltd handles the order, payment, learner information, enrolment and first-line support; Highfield supplies the course and LMS.</p><div className="lp-actions"><Link className="lp-button light" to="/courses">Browse courses <ArrowRight /></Link><Link className="lp-button ghost" to="/how-courses-are-delivered">How delivery works</Link></div></div></section>
    <section className="lp-section"><div className="lp-container lp-service-grid"><article><ShieldCheck /><small>Your seller and support contact</small><h2>Sousa Murray eLearning</h2><ul><li><Check /> Catalogue and purchase</li><li><Check /> Customer order and payment</li><li><Check /> Learner information and enrolment</li><li><Check /> First-line support</li></ul></article><article><Award /><small>Course and LMS provider</small><h2>Highfield Online Training</h2><ul><li><Check /> Professional course content</li><li><Check /> Highfield LMS access</li><li><Check /> Access email after enrolment</li><li><Check /> Provider certification where applicable</li></ul></article></div></section>
    <section className="lp-section muted"><div className="lp-container lp-callout"><div><h2>Highfield courses are not included in Learning Library plans.</h2><p>Highfield courses, regulated learning and separately priced professional training remain individual purchases.</p></div><Link className="lp-button primary" to="/courses">Highfield course catalogue <ArrowRight /></Link></div></section>
  </main>;
}

function PlansPage() {
  return <main>
    <section className="lp-page-hero"><div className="lp-container"><div className="lp-eyebrow"><Sparkles size={16} /> Learning Library plans</div><h1>Choose wider Sousa Murray course access for a monthly fee.</h1><p>Prices include VAT and renew monthly until cancelled. Each plan has a clear named-learner limit and course entitlement.</p></div></section>
    <section className="lp-section"><div className="lp-container"><Plans /><div className="lp-notice"><ShieldCheck /><p><strong>Plan scope:</strong> plans cover the Sousa Murray Learning Library only. Individual Sousa Murray course purchases sit alongside plan access. Highfield courses, regulated qualifications and practical assessments are purchased separately.</p></div></div></section>
    <section className="lp-section muted"><div className="lp-container lp-callout"><Users /><div><h2>Need more than fifteen learner seats?</h2><p>We will create a tailored monthly organisation plan with confirmed capacity and reporting requirements.</p></div><Link className="lp-button primary" to="/contact?topic=learning-library-plan">Discuss a plan <ArrowRight /></Link></div></section>
  </main>;
}

export default function LearningPlatformRouter() {
  const path = useLocation().pathname;

  if (path === '/learning-library/basket') return <Layout><LearningCourseBasketPage /></Layout>;
  if (path === '/learning-library/purchase/success') return <Layout><LearningCoursePurchaseSuccessPage /></Layout>;
  const publicCourse = path.match(/^\/learning-library\/courses\/([^/]+)$/);
  if (publicCourse) return <Layout><PublicLibraryCoursePage slug={decodeURIComponent(publicCourse[1])} /></Layout>;
  if (path === '/learning-library/courses') return <Layout><ProductionLearningManagementSystem /></Layout>;

  if (path === '/lms' || path === '/lms/dashboard') return <><AgeGate /><AccessibilityTools /><BrandedLearnerDashboard /></>;
  if (path.startsWith('/lms')) return <><AgeGate /><AccessibilityTools /><ProductionLearningManagementSystem /></>;

  const platformPages = ['/', '/learning-library', '/subscription-learning', '/professional-training', '/plans', '/pricing'];
  if (!platformPages.includes(path)) return <AppShell />;

  const page = path === '/'
    ? <HomePage />
    : path === '/professional-training'
      ? <ProfessionalPage />
      : path === '/plans' || path === '/pricing'
        ? <PlansPage />
        : <LibraryPage />;

  return <Layout>{page}</Layout>;
}
