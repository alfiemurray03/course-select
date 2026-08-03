import {
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  CircleUserRound,
  Clock3,
  GraduationCap,
  Headphones,
  HeartHandshake,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';

type ThemeMode = 'light' | 'dark' | 'system';

type Course = {
  slug: string;
  title: string;
  provider: string;
  category: string;
  level: string;
  duration: string;
  price: number;
  description: string;
  featured?: boolean;
};

const courses: Course[] = [
  {
    slug: 'food-safety-level-2',
    title: 'Food Safety Level 2',
    provider: 'Highfield e-learning',
    category: 'Food Safety',
    level: 'Level 2',
    duration: 'Self-paced',
    price: 25,
    description: 'Essential food safety knowledge for people working with or around food.',
    featured: true,
  },
  {
    slug: 'health-and-safety-level-2',
    title: 'Health and Safety Level 2',
    provider: 'Highfield e-learning',
    category: 'Health and Safety',
    level: 'Level 2',
    duration: 'Self-paced',
    price: 25,
    description: 'Practical workplace health and safety training for employees and organisations.',
    featured: true,
  },
  {
    slug: 'manual-handling',
    title: 'Manual Handling',
    provider: 'Highfield e-learning',
    category: 'Health and Safety',
    level: 'Awareness',
    duration: 'Self-paced',
    price: 15,
    description: 'Build awareness of safer lifting, carrying and handling practices.',
  },
  {
    slug: 'gdpr',
    title: 'General Data Protection Regulation (GDPR)',
    provider: 'Highfield e-learning',
    category: 'Compliance',
    level: 'Short course',
    duration: 'Self-paced',
    price: 5,
    description: 'A clear introduction to data protection responsibilities in the workplace.',
    featured: true,
  },
  {
    slug: 'safeguarding-children',
    title: 'Safeguarding Children',
    provider: 'Highfield e-learning',
    category: 'Care and Safeguarding',
    level: 'Short course',
    duration: 'Self-paced',
    price: 5,
    description: 'Recognise safeguarding concerns and understand appropriate reporting routes.',
  },
  {
    slug: 'fire-marshal-level-2',
    title: 'Principles of the Role of a Fire Marshal Level 2',
    provider: 'Highfield e-learning',
    category: 'Fire Safety',
    level: 'Level 2',
    duration: 'Self-paced',
    price: 25,
    description: 'Training for people taking on fire marshal responsibilities at work.',
  },
];

const categories = [
  { name: 'Food Safety', icon: BookOpen, copy: 'Food hygiene, allergens and HACCP training.' },
  { name: 'Health and Safety', icon: ShieldCheck, copy: 'Practical workplace safety and compliance.' },
  { name: 'Care and Safeguarding', icon: HeartHandshake, copy: 'Care standards, welfare and safeguarding.' },
  { name: 'Business Compliance', icon: BriefcaseBusiness, copy: 'Data protection, conduct and workplace skills.' },
];

function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('course-select-theme');
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply();
    media.addEventListener('change', apply);
    localStorage.setItem('course-select-theme', mode);
    return () => media.removeEventListener('change', apply);
  }, [mode]);

  return { mode, setMode };
}

function Header({ mode, setMode }: { mode: ThemeMode; setMode: (value: ThemeMode) => void }) {
  const [open, setOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    setLearnOpen(false);
  }, [location.pathname]);

  const rotateTheme = () => setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system');

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="CourseSelect home">
          <picture>
            <source media="(prefers-color-scheme: dark)" srcSet="/course-select-logo-dark.svg" />
            <img className="brand-logo light-logo" src="/course-select-logo-light.svg" alt="CourseSelect — Choose. Learn. Succeed." />
          </picture>
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/courses">Browse courses</NavLink>
          <div className="nav-dropdown">
            <button type="button" onClick={() => setLearnOpen((value) => !value)} aria-expanded={learnOpen}>
              Learning <ChevronDown size={15} />
            </button>
            {learnOpen && (
              <div className="dropdown-panel">
                <Link to="/individuals"><strong>For individuals</strong><span>Choose training for yourself</span></Link>
                <Link to="/business"><strong>For organisations</strong><span>Manage workforce training</span></Link>
                <Link to="/providers"><strong>Course providers</strong><span>Trusted training partners</span></Link>
              </div>
            )}
          </div>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/support">Support</NavLink>
        </nav>

        <div className="header-actions">
          <Link className="account-button desktop-account" to="/account">
            <CircleUserRound size={18} /> Sign in
          </Link>
          <button className="icon-button theme-button" type="button" onClick={rotateTheme} aria-label={`Theme: ${mode}`}>
            {mode === 'dark' ? <Moon size={19} /> : mode === 'light' ? <Sun size={19} /> : <Sparkles size={19} />}
          </button>
          <button className="icon-button mobile-menu-button" type="button" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <Link className="mobile-account" to="/account"><CircleUserRound size={19} /> Sign in to JA Group Services ID</Link>
          <Link to="/">Home</Link>
          <Link to="/courses">Browse courses</Link>
          <Link to="/individuals">For individuals</Link>
          <Link to="/business">For organisations</Link>
          <Link to="/providers">Course providers</Link>
          <Link to="/about">About CourseSelect</Link>
          <Link to="/support">Help and support</Link>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <>
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <img src="/course-select-logo-dark.svg" alt="CourseSelect" />
            <p>Online training from selected course providers for individuals and organisations.</p>
          </div>
          <div>
            <h3>CourseSelect</h3>
            <Link to="/courses">Browse courses</Link>
            <Link to="/individuals">For individuals</Link>
            <Link to="/business">For organisations</Link>
            <Link to="/providers">Course providers</Link>
          </div>
          <div>
            <h3>Support</h3>
            <Link to="/support">Help centre</Link>
            <Link to="/support">Contact support</Link>
            <Link to="/accessibility">Accessibility</Link>
            <Link to="/complaints">Complaints</Link>
          </div>
          <div>
            <h3>Legal</h3>
            <Link to="/terms">Terms and conditions</Link>
            <Link to="/privacy">Privacy notice</Link>
            <Link to="/cookies">Cookie notice</Link>
            <Link to="/refunds">Refund policy</Link>
          </div>
        </div>
      </footer>
      <div className="corporate-disclosure">
        <div>
          <strong>CourseSelect is a trading division of JA Group Services Ltd.</strong>
          <span>Registered in England and Wales. Company number 16314179. ICO registration ZB877370.</span>
        </div>
        <span>© {new Date().getFullYear()} JA Group Services Ltd.</span>
      </div>
    </>
  );
}

function Layout({ children }: { children: ReactNode }) {
  const { mode, setMode } = useTheme();
  const location = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: 'instant' }), [location.pathname]);
  return (
    <>
      <Header mode={mode} setMode={setMode} />
      {children}
      <Footer />
    </>
  );
}

function HomePage() {
  const featured = courses.filter((course) => course.featured);
  return (
    <main>
      <section className="hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">Online learning · Trusted providers · Flexible access</div>
            <h1>Choose the right course.<br /><span>Build what comes next.</span></h1>
            <p>CourseSelect brings online training from selected providers into one clear, easy-to-use platform for individuals and organisations.</p>
            <div className="button-row">
              <Link className="button button-light" to="/courses">Browse courses <ArrowRight size={18} /></Link>
              <Link className="button button-ghost" to="/business">Training for organisations</Link>
            </div>
            <div className="trust-list">
              <span><Check size={16} /> Self-paced learning</span>
              <span><Check size={16} /> Trusted providers</span>
              <span><Check size={16} /> Individual and business options</span>
            </div>
          </div>
          <aside className="hero-panel">
            <div className="hero-panel-heading">
              <span>CourseSelect</span>
              <h2>Choose. Learn. Succeed.</h2>
            </div>
            <div className="hero-stats">
              <div><strong>1</strong><span>launch provider</span></div>
              <div><strong>50+</strong><span>courses planned</span></div>
              <div><strong>2</strong><span>account types</span></div>
            </div>
            <div className="hero-provider">
              <div className="provider-mark">H</div>
              <div><strong>Highfield e-learning</strong><span>Launch course provider</span></div>
              <Award size={22} />
            </div>
          </aside>
        </div>
      </section>

      <section className="fact-strip">
        <div className="container facts">
          <Fact icon={<GraduationCap />} label="Flexible learning" value="Complete courses online" />
          <Fact icon={<Building2 />} label="For organisations" value="Buy and assign licences" />
          <Fact icon={<Award />} label="Clear provider details" value="Know who supplies each course" />
          <Fact icon={<Headphones />} label="Customer support" value="Supported by JA Group Services" />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading eyebrow="Browse by subject" title="Training that fits your next step" description="Start with popular compliance and workplace subjects, then narrow down by provider, level and learning need." />
          <div className="category-grid">
            {categories.map(({ name, icon: Icon, copy }) => (
              <Link className="category-card" to={`/courses?category=${encodeURIComponent(name)}`} key={name}>
                <div className="icon-tile"><Icon size={24} /></div>
                <h3>{name}</h3>
                <p>{copy}</p>
                <span>Explore courses <ArrowRight size={16} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-muted">
        <div className="container">
          <SectionHeading eyebrow="Popular courses" title="A strong place to start" description="Draft launch catalogue entries based on the Highfield reseller scheme. Final pricing and course details remain subject to provider confirmation." />
          <div className="course-grid">
            {featured.map((course) => <CourseCard course={course} key={course.slug} />)}
          </div>
          <div className="centre-action"><Link className="button button-primary" to="/courses">View all courses <ArrowRight size={18} /></Link></div>
        </div>
      </section>

      <section className="section">
        <div className="container split-panel">
          <div>
            <div className="eyebrow blue">For organisations</div>
            <h2>Make workforce training easier to manage</h2>
            <p>Buy multiple licences, assign courses to learners and keep training records together through a future CourseSelect organisation dashboard.</p>
            <ul className="check-list">
              <li><Check size={18} /> Quantity-based course pricing</li>
              <li><Check size={18} /> Learner assignment controls</li>
              <li><Check size={18} /> Progress and completion reporting</li>
              <li><Check size={18} /> Support through JA Group Services</li>
            </ul>
            <Link className="button button-primary" to="/business">Explore CourseSelect Business <ArrowRight size={18} /></Link>
          </div>
          <div className="dashboard-preview">
            <div className="preview-top"><span>Organisation overview</span><span className="status-pill">Foundation preview</span></div>
            <div className="metric-grid">
              <div><span>Available licences</span><strong>24</strong></div>
              <div><span>Active learners</span><strong>16</strong></div>
              <div><span>Completed</span><strong>41</strong></div>
            </div>
            <div className="progress-list">
              <Progress label="Food Safety Level 2" value={78} />
              <Progress label="Health and Safety Level 2" value={62} />
              <Progress label="GDPR" value={91} />
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container cta-inner">
          <div><span>Ready to get started?</span><h2>Choose your next course with confidence.</h2></div>
          <Link className="button button-light" to="/courses">Browse CourseSelect <ArrowRight size={18} /></Link>
        </div>
      </section>
    </main>
  );
}

function CoursesPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All subjects');
  const filtered = useMemo(
    () => courses.filter((course) =>
      (category === 'All subjects' || course.category === category) &&
      `${course.title} ${course.provider} ${course.category}`.toLowerCase().includes(query.toLowerCase()),
    ),
    [query, category],
  );
  const options = ['All subjects', ...Array.from(new Set(courses.map((course) => course.category)))];

  return (
    <main>
      <PageHero eyebrow="Course catalogue" title="Find your next online course" copy="Search a growing catalogue from selected training providers. Provider, certificate and delivery details are shown clearly on every course." />
      <section className="section">
        <div className="container">
          <div className="catalogue-toolbar">
            <label className="search-box"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses" /></label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by subject">
              {options.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div className="results-heading"><strong>{filtered.length} courses</strong><span>Draft CourseSelect launch catalogue</span></div>
          <div className="course-grid">{filtered.map((course) => <CourseCard course={course} key={course.slug} />)}</div>
        </div>
      </section>
    </main>
  );
}

function CoursePage() {
  const { slug } = useParams();
  const course = courses.find((entry) => entry.slug === slug);
  if (!course) return <NotFoundPage />;

  return (
    <main>
      <section className="course-hero">
        <div className="container course-hero-grid">
          <div>
            <Link className="back-link" to="/courses">← Back to courses</Link>
            <div className="eyebrow">{course.category} · {course.level}</div>
            <h1>{course.title}</h1>
            <p>{course.description}</p>
            <div className="course-meta">
              <span><Clock3 size={18} /> {course.duration}</span>
              <span><Award size={18} /> Course provider: {course.provider}</span>
            </div>
          </div>
          <aside className="purchase-card">
            <span>Course price</span>
            <strong>£{course.price.toFixed(2)}</strong>
            <small>VAT treatment and final live price will be confirmed before launch.</small>
            <button className="button button-primary full-width" type="button"><ShoppingBasket size={18} /> Add to basket</button>
            <ul>
              <li><Check size={16} /> Online, self-paced learning</li>
              <li><Check size={16} /> Provider clearly identified</li>
              <li><Check size={16} /> CourseSelect customer support</li>
            </ul>
          </aside>
        </div>
      </section>
      <section className="section">
        <div className="container content-grid">
          <article className="content-card">
            <h2>Course overview</h2>
            <p>This page is ready for the provider-approved course description, learning outcomes, assessment information, certificate details and any licence expiry period.</p>
            <h3>Before this course goes live</h3>
            <p>CourseSelect will verify the provider product ID, reseller price, public price, course duration, certificate wording and fulfilment route.</p>
          </article>
          <aside className="info-card">
            <h3>Provided by</h3>
            <div className="provider-row"><div className="provider-mark">H</div><div><strong>{course.provider}</strong><span>Selected training provider</span></div></div>
            <p>Sold through CourseSelect, a trading division of JA Group Services Ltd.</p>
          </aside>
        </div>
      </section>
    </main>
  );
}

function BusinessPage() {
  return (
    <main>
      <PageHero eyebrow="CourseSelect Business" title="Training for teams, without the faff" copy="Buy course licences for your organisation, assign them to learners and keep progress information in one place." />
      <section className="section">
        <div className="container feature-grid">
          <Feature icon={<Users />} title="Manage learners" copy="Invite staff and assign the right course to each person." />
          <Feature icon={<ShoppingBasket />} title="Buy licences" copy="Purchase individual or quantity-based course licences." />
          <Feature icon={<Award />} title="Track completion" copy="Keep progress, completion and certificate records together." />
          <Feature icon={<Headphones />} title="Get support" copy="Use clear support and escalation routes managed by JA Group Services." />
        </div>
      </section>
      <section className="section section-muted">
        <div className="container prose-card">
          <h2>Built for more than one provider</h2>
          <p>CourseSelect is being designed as a provider-neutral training marketplace. Highfield e-learning will be the first launch provider, with the technical structure ready for additional course providers later.</p>
          <Link className="button button-primary" to="/support">Discuss organisation training <ArrowRight size={18} /></Link>
        </div>
      </section>
    </main>
  );
}

function ProvidersPage() {
  return (
    <main>
      <PageHero eyebrow="Course providers" title="Clear about who provides your training" copy="Every CourseSelect listing identifies the organisation responsible for the course content, delivery and certificate arrangements." />
      <section className="section">
        <div className="container provider-card">
          <div className="provider-mark large">H</div>
          <div>
            <span className="status-pill">Launch provider</span>
            <h2>Highfield e-learning</h2>
            <p>JA Group Services Ltd holds a reseller agreement for Highfield e-learning programmes. Approved course information and final pricing will be verified before public launch.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function IndividualsPage() {
  return (
    <main>
      <PageHero eyebrow="For individuals" title="Learn at your own pace" copy="Choose a course, create your account and complete your training online through the relevant course provider." />
      <section className="section">
        <div className="container steps-grid">
          <Step number="01" title="Choose" copy="Browse courses and compare provider, level and certificate details." />
          <Step number="02" title="Purchase" copy="Pay securely and confirm who will complete the course." />
          <Step number="03" title="Learn" copy="Receive access and complete your training online." />
          <Step number="04" title="Succeed" copy="View your completion information and available certificate." />
        </div>
      </section>
    </main>
  );
}

function AboutPage() {
  return (
    <main>
      <PageHero eyebrow="About CourseSelect" title="A clearer way to choose online training" copy="CourseSelect is a new trading division of JA Group Services Ltd, created to bring courses from selected providers into one customer-focused platform." />
      <section className="section">
        <div className="container content-grid">
          <article className="content-card">
            <h2>What CourseSelect does</h2>
            <p>CourseSelect will provide the catalogue, purchasing journey, customer account, organisation tools and first-line support. The relevant training provider remains responsible for the course content and delivery.</p>
            <h2>Our launch approach</h2>
            <p>The platform will launch with Highfield e-learning courses under JA Group Services Ltd’s existing reseller arrangement, then expand to other suitable providers over time.</p>
          </article>
          <aside className="info-card">
            <Building2 size={28} />
            <h3>Legal operator</h3>
            <strong>JA Group Services Ltd</strong>
            <p>Company number 16314179<br />Registered in England and Wales</p>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SupportPage() {
  const [sent, setSent] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSent(true);
  };
  return (
    <main>
      <PageHero eyebrow="Help and support" title="We are here when you need us" copy="Get help with course selection, purchases, learner access, organisation licences and provider escalations." />
      <section className="section">
        <div className="container support-grid">
          <div className="support-options">
            <Feature icon={<Headphones />} title="Customer support" copy="CourseSelect will provide first-line support for orders, accounts and access queries." />
            <Feature icon={<ShieldCheck />} title="Privacy and security" copy="Contact JA Group Services about personal data, security or account concerns." />
          </div>
          <form className="contact-card" onSubmit={submit}>
            <h2>Contact CourseSelect</h2>
            {sent ? <div className="success-message"><Check size={22} /> Your draft enquiry has been captured locally for this preview.</div> : (
              <>
                <label>Name<input required name="name" /></label>
                <label>Email<input required type="email" name="email" /></label>
                <label>How can we help?<textarea required name="message" rows={5} /></label>
                <button className="button button-primary" type="submit">Send enquiry <ArrowRight size={18} /></button>
              </>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}

function AccountPage() {
  return (
    <main>
      <PageHero eyebrow="My CourseSelect" title="Your learning account is coming next" copy="This foundation is ready to connect to JA Group Services ID through Microsoft Entra External ID." />
      <section className="section">
        <div className="container prose-card centre">
          <CircleUserRound size={48} />
          <h2>Customer account integration placeholder</h2>
          <p>The live build will support individual learners, organisation administrators and organisation learners.</p>
          <Link className="button button-primary" to="/courses">Browse courses</Link>
        </div>
      </section>
    </main>
  );
}

function LegalPage({ title }: { title: string }) {
  return (
    <main>
      <PageHero eyebrow="Legal and trust" title={title} copy="This page has been created as part of the CourseSelect website foundation and is ready for approved JA Group Services wording." />
      <section className="section"><div className="container prose-card"><h2>Draft placeholder</h2><p>The final document must be reviewed and approved before CourseSelect begins public trading or processes customer information.</p></div></section>
    </main>
  );
}

function NotFoundPage() {
  return <main><section className="section"><div className="container prose-card centre"><h1>Page not found</h1><p>The page you were looking for does not exist.</p><Link className="button button-primary" to="/">Return home</Link></div></section></main>;
}

function PageHero({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className="page-hero"><div className="container"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{copy}</p></div></section>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-heading"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="fact">{icon}<div><span>{label}</span><strong>{value}</strong></div></div>;
}

function CourseCard({ course }: { course: Course }) {
  return (
    <article className="course-card">
      <div className="course-card-top"><span>{course.category}</span><span>{course.level}</span></div>
      <div className="course-card-icon"><BookOpen size={26} /></div>
      <h3>{course.title}</h3>
      <p>{course.description}</p>
      <div className="provider-line"><Award size={16} /> {course.provider}</div>
      <div className="course-card-bottom"><strong>£{course.price.toFixed(2)}</strong><Link to={`/courses/${course.slug}`}>View course <ArrowRight size={16} /></Link></div>
    </article>
  );
}

function Feature({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <article className="feature-card"><div className="icon-tile">{icon}</div><h3>{title}</h3><p>{copy}</p></article>;
}

function Step({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <article className="step-card"><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>;
}

function Progress({ label, value }: { label: string; value: number }) {
  return <div className="progress-item"><div><span>{label}</span><strong>{value}%</strong></div><div className="progress-track"><i style={{ width: `${value}%` }} /></div></div>;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:slug" element={<CoursePage />} />
        <Route path="/individuals" element={<IndividualsPage />} />
        <Route path="/business" element={<BusinessPage />} />
        <Route path="/providers" element={<ProvidersPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/terms" element={<LegalPage title="Terms and conditions" />} />
        <Route path="/privacy" element={<LegalPage title="Privacy notice" />} />
        <Route path="/cookies" element={<LegalPage title="Cookie notice" />} />
        <Route path="/refunds" element={<LegalPage title="Refund and cancellation policy" />} />
        <Route path="/accessibility" element={<LegalPage title="Accessibility statement" />} />
        <Route path="/complaints" element={<LegalPage title="Complaints procedure" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
