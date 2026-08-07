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
import {
  flattenCourseLessons,
  libraryCatalogueStats,
  libraryCategories,
  libraryCourses,
} from './libraryCatalogue';
import ProductionLearningManagementSystem from './ProductionLearningManagementSystem';
import PublicSiteHeader from './PublicSiteHeader';
import './learning-platform.css';
import './theme-compatibility-fix.css';

type PlanCustomerType = 'Personal' | 'Business';

const plans = [
  {
    id: 'learner',
    name: 'Learner',
    customerType: 'Personal' as PlanCustomerType,
    price: '£9.99',
    audience: '1 named learner',
    copy: `Access the selected Core collection of ${libraryCatalogueStats.coreCourses} Sousa Murray courses. Courses outside Core can be purchased separately or unlocked with Learner Plus.`,
    features: ['Selected Core course collection', 'Sousa Murray LMS access', 'Assessments and completion certificates'],
    featured: false,
  },
  {
    id: 'learner-plus',
    name: 'Learner Plus',
    customerType: 'Personal' as PlanCustomerType,
    price: '£16.99',
    audience: '1 named learner',
    copy: `Unlimited access to the complete Sousa Murray catalogue of ${libraryCatalogueStats.completeCourses} courses.`,
    features: ['Complete Sousa Murray course collection', 'Sousa Murray LMS access', 'Assessments and completion certificates'],
    featured: true,
  },
  {
    id: 'team-5',
    name: 'Team 5',
    customerType: 'Business' as PlanCustomerType,
    price: '£39.99',
    audience: 'Up to 5 named learners',
    copy: `Business access to the selected Core collection of ${libraryCatalogueStats.coreCourses} Sousa Murray courses for up to five learners.`,
    features: ['Five named learner seats', 'Selected Core course collection', 'Team progress and certificate reporting'],
    featured: false,
  },
  {
    id: 'team-15',
    name: 'Team 15',
    customerType: 'Business' as PlanCustomerType,
    price: '£89.99',
    audience: 'Up to 15 named learners',
    copy: `Business access to the complete Sousa Murray catalogue of ${libraryCatalogueStats.completeCourses} courses for up to fifteen learners.`,
    features: ['Fifteen named learner seats', 'Complete Sousa Murray course collection', 'Team progress and certificate reporting'],
    featured: false,
  },
] as const;

const subjects = libraryCategories;
const moduleCount = libraryCourses.reduce((total, course) => total + course.modules.length, 0);
const lessonCount = libraryCourses.reduce((total, course) => total + flattenCourseLessons(course).length, 0);

function Footer() {
  return <>
    <footer className="lp-footer">
      <div><strong>Sousa Murray eLearning</strong><p>Original Sousa Murray courses and separately purchased Highfield Online Training, operated by JA Group Services Ltd.</p></div>
      <div><h3>Courses</h3><Link to="/learning-library/courses">Sousa Murray eLearning courses</Link><Link to="/professional-training">Highfield Online Training</Link><Link to="/courses">Highfield course catalogue</Link><Link to="/plans">Plans</Link></div>
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

function PlanCard({ plan, preview }: { plan: (typeof plans)[number]; preview: boolean }) {
  return <article className={plan.featured ? 'featured' : ''}>
    {plan.featured && <span className="lp-popular">Best value for individuals</span>}
    <span className={`lp-plan-type ${plan.customerType.toLowerCase()}`}>{plan.customerType}</span>
    <small>{plan.audience}</small>
    <h3>{plan.name}</h3>
    <div className="lp-price">{plan.price}<span>/month<br />VAT included</span></div>
    <p>{plan.copy}</p>
    {!preview && <ul>{plan.features.map((item) => <li key={item}><Check size={16} /> {item}</li>)}</ul>}
    <Link to={preview ? '/plans' : `/lms/subscribe/${plan.id}`}>{preview ? 'View plan' : `Choose ${plan.name}`} <ArrowRight size={16} /></Link>
  </article>;
}

function Plans({ preview = false }: { preview?: boolean }) {
  const groups: Array<{ customerType: PlanCustomerType; title: string; copy: string }> = [
    { customerType: 'Personal', title: 'Personal plans', copy: 'For an individual learner using their own Sousa Murray learning account.' },
    { customerType: 'Business', title: 'Business plans', copy: 'For organisations assigning named learner seats to their team.' },
  ];

  return <div className="lp-plan-groups">{groups.map((group) => {
    const groupPlans = plans.filter((plan) => plan.customerType === group.customerType);
    return <section className="lp-plan-group" key={group.customerType}>
      <header className="lp-plan-group-head">
        <span>{group.customerType}</span>
        <h2>{group.title}</h2>
        <p>{group.copy}</p>
      </header>
      <div className="lp-plan-grid two-column">{groupPlans.map((plan) => <PlanCard plan={plan} preview={preview} key={plan.id} />)}</div>
    </section>;
  })}</div>;
}

function HomePage() {
  return <main>
    <section className="lp-hero"><div className="lp-container lp-hero-grid">
      <div><div className="lp-eyebrow"><Sparkles size={16} /> Two clearly separate ways to learn</div><h1>Sousa Murray courses or Highfield Online Training.</h1><p>Choose original Sousa Murray courses delivered through our own LMS, or purchase specialist Highfield Online Training courses delivered through the Highfield LMS.</p><div className="lp-actions"><Link className="lp-button light" to="/learning-library/courses">Sousa Murray eLearning courses <ArrowRight size={18} /></Link><Link className="lp-button ghost" to="/professional-training">Highfield Online Training</Link></div><div className="lp-assurances"><span><Check size={16} /> Adults aged 18+</span><span><Check size={16} /> VAT-inclusive prices</span><span><Check size={16} /> Sousa Murray eLearning support</span></div></div>
      <aside className="lp-route-panel"><span>Choose your course type</span><article><InfinityIcon /><div><h2>Sousa Murray eLearning courses</h2><p>{libraryCourses.length} original Sousa Murray courses delivered through the Sousa Murray LMS.</p><Link to="/learning-library/courses">View Sousa Murray courses <ArrowRight size={15} /></Link></div></article><article><GraduationCap /><div><h2>Highfield Online Training</h2><p>Separately purchased Highfield courses delivered through the Highfield LMS.</p><Link to="/professional-training">View Highfield training <ArrowRight size={15} /></Link></div></article></aside>
    </div></section>
    <section className="lp-strip"><div className="lp-container"><span><ShieldCheck /> Operated by JA Group Services Ltd</span><span><Headphones /> Sousa Murray first-line support</span><span><LayoutDashboard /> Dedicated Sousa Murray LMS</span><span><Award /> Assessed completion certificates</span></div></section>
    <section className="lp-section"><div className="lp-container"><header className="lp-section-head"><span>Two separate course services</span><h2>Know exactly what you are buying.</h2><p>Sousa Murray courses and Highfield courses have separate catalogues, delivery platforms and access arrangements.</p></header><div className="lp-service-grid"><article><InfinityIcon /><small>Sousa Murray course service</small><h2>Sousa Murray eLearning courses</h2><p>Original Sousa Murray courses for business, digital skills, workplace skills, management, communication, compliance awareness and personal development.</p><ul><li><Check /> Sousa Murray course content</li><li><Check /> Sousa Murray LMS</li><li><Check /> Subscription access, with individual purchase option being added</li></ul><Link className="lp-button primary" to="/learning-library/courses">View Sousa Murray courses <ArrowRight /></Link></article><article><GraduationCap /><small>Highfield course service</small><h2>Highfield Online Training</h2><p>Highfield courses for professional development, workplace learning and role-specific requirements.</p><ul><li><Check /> Highfield course content</li><li><Check /> Highfield LMS</li><li><Check /> Purchased separately by course/licence</li></ul><Link className="lp-button primary" to="/professional-training">View Highfield Online Training <ArrowRight /></Link></article></div></div></section>
    <section className="lp-section muted"><div className="lp-container"><header className="lp-section-head"><span>Plans</span><h2>Personal and business Learning Library plans</h2><p>Plans cover Sousa Murray eLearning courses only. Highfield Online Training is always purchased separately.</p></header><Plans preview /><div className="lp-centre"><Link className="lp-button primary" to="/plans">View plans <ArrowRight /></Link></div></div></section>
  </main>;
}

function LibraryPage() {
  return <main>
    <section className="lp-page-hero"><div className="lp-container"><div className="lp-eyebrow"><InfinityIcon size={16} /> Sousa Murray eLearning courses</div><h1>Original Sousa Murray courses in the Sousa Murray LMS.</h1><p>Use a Personal or Business plan for included courses. Learner and Team 5 receive the selected Core collection; Learner Plus and Team 15 receive the complete catalogue.</p><div className="lp-actions"><Link className="lp-button light" to="/learning-library/courses">View Sousa Murray courses <ArrowRight /></Link><Link className="lp-button ghost" to="/lms/dashboard">My Sousa Murray eLearning</Link></div></div></section>
    <section className="lp-unlimited-note"><div className="lp-container"><InfinityIcon /><p><strong>These are Sousa Murray courses delivered through the Sousa Murray LMS.</strong> Highfield Online Training is separate and never mixed into this catalogue.</p></div></section>
    <section className="lp-section"><div className="lp-container"><header className="lp-section-head"><span>Sousa Murray course catalogue</span><h2>{libraryCourses.length} structured courses</h2><p>The catalogue contains {moduleCount} modules and {lessonCount} structured lessons, with knowledge checks and final assessments.</p></header><div className="lp-subject-grid">{subjects.map((subject) => <article key={subject}><BookOpen /><h3>{subject}</h3><p>Clear outcomes, full syllabus information, practical lesson content and assessed completion.</p></article>)}</div><div className="lp-centre"><Link className="lp-button primary" to="/learning-library/courses">View all {libraryCourses.length} Sousa Murray courses <ArrowRight /></Link></div></div></section>
    <section className="lp-section muted"><div className="lp-container"><header className="lp-section-head"><span>Plans</span><h2>Choose Personal or Business access</h2></header><Plans /></div></section>
  </main>;
}

function ProfessionalPage() {
  return <main>
    <section className="lp-page-hero professional"><div className="lp-container"><div className="lp-eyebrow"><GraduationCap size={16} /> Highfield Online Training</div><h1>Highfield courses, purchased individually.</h1><p>This is separate from Sousa Murray eLearning courses and subscriptions. JA Group Services Ltd handles the order, payment, enrolment and first-line support; Highfield supplies the course content and Highfield LMS.</p><div className="lp-actions"><Link className="lp-button light" to="/courses">View Highfield courses <ArrowRight /></Link><Link className="lp-button ghost" to="/how-courses-are-delivered">How Highfield delivery works</Link></div></div></section>
    <section className="lp-section"><div className="lp-container lp-service-grid"><article><ShieldCheck /><small>Your seller and support contact</small><h2>Sousa Murray eLearning</h2><ul><li><Check /> Catalogue and purchase</li><li><Check /> Customer order and payment</li><li><Check /> Learner enrolment</li><li><Check /> First-line support</li></ul></article><article><Award /><small>Course and LMS provider</small><h2>Highfield Online Training</h2><ul><li><Check /> Highfield course content</li><li><Check /> Highfield LMS access</li><li><Check /> Access email after enrolment</li><li><Check /> Provider certification where applicable</li></ul></article></div></section>
    <section className="lp-section muted"><div className="lp-container lp-callout"><div><h2>Highfield courses are not included in Sousa Murray plans.</h2><p>They remain separately priced individual course/licence purchases.</p></div><Link className="lp-button primary" to="/courses">View Highfield course catalogue <ArrowRight /></Link></div></section>
  </main>;
}

function PlansPage() {
  return <main>
    <section className="lp-page-hero"><div className="lp-container"><div className="lp-eyebrow"><Sparkles size={16} /> Sousa Murray eLearning plans</div><h1>Personal plans and Business plans.</h1><p>Choose the plan for who is learning and how much of the Sousa Murray course catalogue you need. Prices include VAT and renew monthly until cancelled.</p></div></section>
    <section className="lp-section"><div className="lp-container"><Plans /><div className="lp-notice"><ShieldCheck /><p><strong>Plan scope:</strong> Learner and Team 5 include the selected Core Sousa Murray course collection. Learner Plus and Team 15 include the complete Sousa Murray catalogue. Highfield Online Training is always separate.</p></div></div></section>
    <section className="lp-section muted"><div className="lp-container lp-callout"><Users /><div><h2>Need more than fifteen learner seats?</h2><p>We can arrange a tailored organisation plan with confirmed capacity and reporting requirements.</p></div><Link className="lp-button primary" to="/contact?topic=learning-library-plan">Contact us about a larger plan <ArrowRight /></Link></div></section>
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
