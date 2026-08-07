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
import { flattenCourseLessons, libraryCategories, libraryCourses } from './libraryCatalogue';
import ProductionLearningManagementSystem from './ProductionLearningManagementSystem';
import PublicSiteHeader from './PublicSiteHeader';
import './learning-platform.css';
import './theme-compatibility-fix.css';

const plans = [
  { id: 'learner', name: 'Learner', price: '£9.99', audience: '1 named learner', copy: 'Unlimited access to the core Learning Library, progress tracking, assessments and certificates.', features: ['Core course collection', 'Structured lessons and checks', 'Completion certificates'], featured: false },
  { id: 'learner-plus', name: 'Learner Plus', price: '£16.99', audience: '1 named learner', copy: 'The complete individual Learning Library, including compliance and advanced courses.', features: ['Complete course collection', 'Final assessments', 'Priority support'], featured: true },
  { id: 'team-5', name: 'Team 5', price: '£39.99', audience: 'Up to 5 learners', copy: 'Complete Learning Library access for a small team with learner oversight.', features: ['Five named learner seats', 'Assignments and progress', 'Certificate reporting'], featured: false },
  { id: 'team-15', name: 'Team 15', price: '£89.99', audience: 'Up to 15 learners', copy: 'Wider learner capacity, complete course access and organisation reporting.', features: ['Fifteen learner seats', 'Deadlines and reminders', 'Team completion reports'], featured: false },
] as const;

const subjects = libraryCategories;
const moduleCount = libraryCourses.reduce((total, course) => total + course.modules.length, 0);
const lessonCount = libraryCourses.reduce((total, course) => total + flattenCourseLessons(course).length, 0);

function Footer() {
  return <>
    <footer className="lp-footer">
      <div><strong>Sousa Murray eLearning</strong><p>Unlimited subscription learning and individually purchased professional training, operated by JA Group Services Ltd.</p></div>
      <div><h3>Learning</h3><Link to="/learning-library">Learning Library</Link><Link to="/learning-library/courses">Library course catalogue</Link><Link to="/plans">Monthly plans</Link><Link to="/professional-training">Professional Training</Link><Link to="/courses">Professional course catalogue</Link></div>
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
      <div><div className="lp-eyebrow"><Sparkles size={16} /> Two ways to learn</div><h1>Unlimited learning and professional training, together in one trusted place.</h1><p>Build practical knowledge through the Sousa Murray Learning Library for one fixed monthly fee, or purchase specialist Highfield Online Training courses individually.</p><div className="lp-actions"><Link className="lp-button light" to="/learning-library/courses">Browse unlimited learning <ArrowRight size={18} /></Link><Link className="lp-button ghost" to="/professional-training">Professional Training</Link></div><div className="lp-assurances"><span><Check size={16} /> Adults aged 18+</span><span><Check size={16} /> VAT-inclusive prices</span><span><Check size={16} /> Sousa Murray eLearning support</span></div></div>
      <aside className="lp-route-panel"><span>Choose your route</span><article><InfinityIcon /><div><h2>Learning Library</h2><p>{libraryCourses.length} complete courses with modules, knowledge checks and final assessments.</p><Link to="/learning-library/courses">Browse the library <ArrowRight size={15} /></Link></div></article><article><GraduationCap /><div><h2>Professional Training</h2><p>Individually purchased Highfield courses delivered through the Highfield LMS.</p><Link to="/courses">Browse professional courses <ArrowRight size={15} /></Link></div></article></aside>
    </div></section>
    <section className="lp-strip"><div className="lp-container"><span><ShieldCheck /> Operated by JA Group Services Ltd</span><span><Headphones /> Sousa Murray first-line support</span><span><LayoutDashboard /> Dedicated Sousa Murray LMS</span><span><Award /> Assessed completion certificates</span></div></section>
    <section className="lp-section"><div className="lp-container"><header className="lp-section-head"><span>One brand, two separate services</span><h2>Choose the right type of learning before you pay</h2><p>The course areas, prices, delivery platforms and certificate arrangements stay clearly separated.</p></header><div className="lp-service-grid"><article><InfinityIcon /><small>Monthly subscription</small><h2>Sousa Murray Learning Library</h2><p>A structured collection of original Sousa Murray courses for business, digital skills, workplace skills, management, communication, compliance awareness and personal development.</p><ul><li><Check /> One fixed monthly fee</li><li><Check /> Plan-based unlimited course access</li><li><Check /> Lessons, assessments and certificates</li></ul><Link className="lp-button primary" to="/learning-library/courses">Browse library courses <ArrowRight /></Link></article><article><GraduationCap /><small>Individual course purchase</small><h2>Professional Training</h2><p>Highfield Online Training courses for professional development, workplace learning and role-specific requirements.</p><ul><li><Check /> Individually priced licences</li><li><Check /> Highfield content and LMS</li><li><Check /> Sousa Murray managed enrolment</li></ul><Link className="lp-button primary" to="/professional-training">Explore professional training <ArrowRight /></Link></article></div></div></section>
    <section className="lp-section muted"><div className="lp-container"><header className="lp-section-head"><span>Monthly plans</span><h2>Unlimited included courses for one set fee</h2><p>Learner-seat limits apply. Highfield professional courses are not included.</p></header><Plans preview /><div className="lp-centre"><Link className="lp-button primary" to="/plans">Compare all plans <ArrowRight /></Link></div></div></section>
  </main>;
}

function LibraryPage() {
  return <main>
    <section className="lp-page-hero"><div className="lp-container"><div className="lp-eyebrow"><InfinityIcon size={16} /> Sousa Murray Learning Library</div><h1>Unlimited learning for one clear monthly price.</h1><p>Access every Sousa Murray course included in your plan while it remains active. Complete structured modules, lesson checks and a final assessment before receiving a completion certificate.</p><div className="lp-actions"><Link className="lp-button light" to="/learning-library/courses">Browse the course catalogue <ArrowRight /></Link><Link className="lp-button ghost" to="/lms/dashboard">My Sousa Murray eLearning</Link></div></div></section>
    <section className="lp-unlimited-note"><div className="lp-container"><InfinityIcon /><p><strong>“Unlimited” means unlimited access to included library courses for each named learner.</strong> It does not mean unlimited learner accounts, regulated qualifications or included Highfield courses.</p></div></section>
    <section className="lp-section"><div className="lp-container"><header className="lp-section-head"><span>Complete learning catalogue</span><h2>Proper courses, not a collection of three-page placeholders</h2><p>The Learning Library contains {libraryCourses.length} complete courses, {moduleCount} modules and {lessonCount} structured lessons, with lesson knowledge checks and final assessments.</p></header><div className="lp-subject-grid">{subjects.map((subject) => <article key={subject}><BookOpen /><h3>{subject}</h3><p>Clear outcomes, full syllabus information, practical lesson content and assessed completion.</p></article>)}</div><div className="lp-centre"><Link className="lp-button primary" to="/learning-library/courses">View all {libraryCourses.length} courses <ArrowRight /></Link></div></div></section>
    <section className="lp-section muted"><div className="lp-container"><header className="lp-section-head"><span>Membership</span><h2>Choose your learner capacity</h2></header><Plans /></div></section>
  </main>;
}

function ProfessionalPage() {
  return <main>
    <section className="lp-page-hero professional"><div className="lp-container"><div className="lp-eyebrow"><GraduationCap size={16} /> Professional Training</div><h1>Purchase specialist Highfield courses individually.</h1><p>These courses are separate from the monthly Learning Library. JA Group Services Ltd handles the order, payment, enrolment and first-line support; Highfield supplies the course and LMS.</p><div className="lp-actions"><Link className="lp-button light" to="/courses">Browse courses <ArrowRight /></Link><Link className="lp-button ghost" to="/how-courses-are-delivered">How delivery works</Link></div></div></section>
    <section className="lp-section"><div className="lp-container lp-service-grid"><article><ShieldCheck /><small>Your seller and support contact</small><h2>Sousa Murray eLearning</h2><ul><li><Check /> Catalogue and purchase</li><li><Check /> Customer order and payment</li><li><Check /> Learner enrolment</li><li><Check /> First-line support</li></ul></article><article><Award /><small>Course and LMS provider</small><h2>Highfield Online Training</h2><ul><li><Check /> Professional course content</li><li><Check /> Highfield LMS access</li><li><Check /> Access email after enrolment</li><li><Check /> Provider certification where applicable</li></ul></article></div></section>
    <section className="lp-section muted"><div className="lp-container lp-callout"><div><h2>Professional courses are not included in monthly plans.</h2><p>Highfield courses, regulated learning and separately priced professional training remain individual purchases.</p></div><Link className="lp-button primary" to="/courses">Professional course catalogue <ArrowRight /></Link></div></section>
  </main>;
}

function PlansPage() {
  return <main>
    <section className="lp-page-hero"><div className="lp-container"><div className="lp-eyebrow"><Sparkles size={16} /> Learning Library plans</div><h1>Unlimited included courses. One set monthly fee.</h1><p>Prices include VAT and renew monthly until cancelled. Each plan has a clear named-learner limit and course entitlement.</p></div></section>
    <section className="lp-section"><div className="lp-container"><Plans /><div className="lp-notice"><ShieldCheck /><p><strong>Membership scope:</strong> plans cover the Sousa Murray Learning Library only. Highfield courses, regulated qualifications and practical assessments are purchased separately.</p></div></div></section>
    <section className="lp-section muted"><div className="lp-container lp-callout"><Users /><div><h2>Need more than fifteen learner seats?</h2><p>We will create a tailored monthly organisation plan with confirmed capacity and reporting requirements.</p></div><Link className="lp-button primary" to="/contact?topic=learning-library-plan">Discuss a plan <ArrowRight /></Link></div></section>
  </main>;
}

export default function LearningPlatformRouter() {
  const path = useLocation().pathname;
  if (path.startsWith('/learning-library/courses')) return <Layout><ProductionLearningManagementSystem /></Layout>;
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
