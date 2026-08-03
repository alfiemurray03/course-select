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
  Filter,
  GraduationCap,
  Headphones,
  HeartHandshake,
  Info,
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
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  catalogue,
  categories as catalogueCategories,
  formatMoney,
  singleLicenceTier,
  tierForQuantity,
  type Course,
} from './catalogue';

type ThemeMode = 'light' | 'dark' | 'system';

const wordmarkStyle = {
  color: '#2563eb',
  fontFamily: '"Plus Jakarta Sans", Inter, sans-serif',
  fontSize: '2rem',
  fontWeight: 800,
  letterSpacing: '-0.065em',
  lineHeight: 1,
  whiteSpace: 'nowrap' as const,
};

const featuredCategories = [
  { name: 'Food Safety and Hygiene', icon: BookOpen, copy: 'Food hygiene, allergens, HACCP and manufacturing training.' },
  { name: 'Health and Safety', icon: ShieldCheck, copy: 'Workplace safety, fire, manual handling and risk awareness.' },
  { name: 'Health and Social Care', icon: HeartHandshake, copy: 'Care Certificate, safeguarding and infection control learning.' },
  { name: 'Business Compliance', icon: BriefcaseBusiness, copy: 'Data protection, fraud prevention and workplace compliance.' },
];

function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('aptenvo-theme');
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
    localStorage.setItem('aptenvo-theme', mode);
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
        <Link to="/" className="brand" aria-label="Aptenvo home">
          <span style={wordmarkStyle}>Aptenvo</span>
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
          <Link to="/about">About Aptenvo</Link>
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
            <span style={{ ...wordmarkStyle, color: '#4f7cff', fontSize: '2.15rem' }}>Aptenvo</span>
            <p>Online training from selected course providers for individuals and organisations.</p>
          </div>
          <div>
            <h3>Aptenvo</h3>
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
          <strong>Aptenvo is a trading division of JA Group Services Ltd.</strong>
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
  useEffect(() => window.scrollTo({ top: 0, behavior: 'auto' }), [location.pathname]);
  return (
    <>
      <Header mode={mode} setMode={setMode} />
      {children}
      <Footer />
    </>
  );
}

function HomePage() {
  const featured = catalogue.filter((course) => course.featured).slice(0, 6);
  return (
    <main>
      <section className="hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">Online learning · Trusted providers · Flexible access</div>
            <h1>Choose the right course.<br /><span>Build what comes next.</span></h1>
            <p>Aptenvo brings online training from selected providers into one clear platform for individuals, teams and organisations.</p>
            <div className="button-row">
              <Link className="button button-light" to="/courses">Browse all {catalogue.length} courses <ArrowRight size={18} /></Link>
              <Link className="button button-ghost" to="/business">Training for organisations</Link>
            </div>
            <div className="trust-list">
              <span><Check size={16} /> Self-paced online learning</span>
              <span><Check size={16} /> Clear VAT-inclusive pricing</span>
              <span><Check size={16} /> Individual and bulk licence options</span>
            </div>
          </div>
          <aside className="hero-panel">
            <div className="hero-panel-heading">
              <span>Aptenvo</span>
              <h2>A complete online training catalogue.</h2>
            </div>
            <div className="hero-stats">
              <div><strong>{catalogue.length}</strong><span>catalogue items</span></div>
              <div><strong>{catalogueCategories.length}</strong><span>subjects</span></div>
              <div><strong>1</strong><span>launch provider</span></div>
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
          <Fact icon={<Building2 />} label="For organisations" value="Quantity-based licence pricing" />
          <Fact icon={<Award />} label="Clear provider details" value="Know who supplies each course" />
          <Fact icon={<Headphones />} label="Customer support" value="Supported by JA Group Services" />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading eyebrow="Browse by subject" title="Training that fits your next step" description="Search the complete catalogue by subject, level, course type and provider." />
          <div className="category-grid">
            {featuredCategories.map(({ name, icon: Icon, copy }) => (
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
          <SectionHeading eyebrow="Featured courses" title="Popular places to start" description="Every course has a full information page, VAT-inclusive pricing and quantity tiers ready for future Stripe products." />
          <div className="course-grid">
            {featured.map((course) => <CourseCard course={course} key={course.slug} />)}
          </div>
          <div className="centre-action"><Link className="button button-primary" to="/courses">View the full catalogue <ArrowRight size={18} /></Link></div>
        </div>
      </section>

      <section className="section">
        <div className="container split-panel">
          <div>
            <div className="eyebrow blue">For organisations</div>
            <h2>Buy the right training for your whole team</h2>
            <p>Course pricing automatically follows the relevant licence band, with Aptenvo’s 30% markup calculated from the provider’s original retail price and VAT shown clearly.</p>
            <ul className="check-list">
              <li><Check size={18} /> Individual and bulk price tiers</li>
              <li><Check size={18} /> Learner assignment structure</li>
              <li><Check size={18} /> Stripe product fields prepared</li>
              <li><Check size={18} /> Highfield enrolment fields prepared</li>
            </ul>
            <Link className="button button-primary" to="/business">Explore Aptenvo Business <ArrowRight size={18} /></Link>
          </div>
          <div className="dashboard-preview catalogue-summary">
            <div className="preview-top"><span>Catalogue overview</span><span className="status-pill">Database ready</span></div>
            <div className="metric-grid">
              <div><span>Published items</span><strong>{catalogue.length}</strong></div>
              <div><span>Course subjects</span><strong>{catalogueCategories.length}</strong></div>
              <div><span>Pricing model</span><strong>30%</strong></div>
            </div>
            <div className="catalogue-ready-list">
              <span><Check size={18} /> Course descriptions and audiences</span>
              <span><Check size={18} /> Learning outcomes and qualification notices</span>
              <span><Check size={18} /> Net, VAT and gross prices</span>
              <span><Check size={18} /> Provider and Stripe mapping fields</span>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container cta-inner">
          <div><span>Explore the catalogue</span><h2>Find training for yourself or your organisation.</h2></div>
          <Link className="button button-light" to="/courses">Browse Aptenvo <ArrowRight size={18} /></Link>
        </div>
      </section>
    </main>
  );
}

function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? 'All subjects');
  const [type, setType] = useState(searchParams.get('type') ?? 'All course types');

  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (category !== 'All subjects') next.set('category', category);
    if (type !== 'All course types') next.set('type', type);
    setSearchParams(next, { replace: true });
  }, [query, category, type, setSearchParams]);

  const filtered = useMemo(() => {
    const normalised = query.trim().toLowerCase();
    return catalogue.filter((course) => {
      const matchesCategory = category === 'All subjects' || course.category === category;
      const matchesType = type === 'All course types' || course.courseType === type;
      const haystack = `${course.title} ${course.provider} ${course.category} ${course.level} ${course.shortDescription}`.toLowerCase();
      return matchesCategory && matchesType && (!normalised || haystack.includes(normalised));
    });
  }, [query, category, type]);

  return (
    <main>
      <PageHero eyebrow="Course catalogue" title="Find your next online course" copy={`Search ${catalogue.length} courses and focused modules from the Aptenvo launch catalogue.`} />
      <section className="section">
        <div className="container">
          <div className="catalogue-toolbar expanded-toolbar">
            <label className="search-box"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search course title, subject or level" /></label>
            <label className="select-filter"><Filter size={17} /><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by subject">
              <option>All subjects</option>
              {catalogueCategories.map((option) => <option key={option}>{option}</option>)}
            </select></label>
            <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by course type">
              <option>All course types</option>
              <option value="full-course">Full courses</option>
              <option value="short-course">Short courses</option>
              <option value="first-aid">First aid</option>
              <option value="specialist">Specialist courses</option>
              <option value="care-standard">Care Certificate standards</option>
              <option value="module">Individual modules</option>
            </select>
          </div>
          <div className="results-heading"><strong>{filtered.length} results</strong><span>Prices shown include VAT</span></div>
          {filtered.length ? (
            <div className="course-grid">{filtered.map((course) => <CourseCard course={course} key={course.slug} />)}</div>
          ) : (
            <div className="empty-results"><Search size={28} /><h2>No matching courses</h2><p>Try a broader search or remove one of the filters.</p></div>
          )}
        </div>
      </section>
    </main>
  );
}

function CoursePage() {
  const { slug } = useParams();
  const course = catalogue.find((entry) => entry.slug === slug);
  const [quantity, setQuantity] = useState(1);
  const [checkoutMessage, setCheckoutMessage] = useState('');

  if (!course) return <NotFoundPage />;

  const tier = tierForQuantity(course, quantity);
  const lineTotal = tier.aptenvoGrossPence * quantity;

  const startCheckout = async () => {
    setCheckoutMessage('Preparing checkout…');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id, quantity }),
      });
      const data = await response.json() as { url?: string; message?: string };
      if (response.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setCheckoutMessage(data.message ?? 'Stripe checkout is not connected yet.');
    } catch {
      setCheckoutMessage('Checkout is not available yet. The course and pricing data are ready for Stripe connection.');
    }
  };

  return (
    <main>
      <section className="course-hero">
        <div className="container course-hero-grid">
          <div>
            <Link className="back-link" to="/courses">← Back to courses</Link>
            <div className="eyebrow">{course.category} · {course.level}</div>
            <h1>{course.title}</h1>
            <p>{course.shortDescription}</p>
            <div className="course-meta">
              <span><Clock3 size={18} /> Self-paced online learning</span>
              <span><Award size={18} /> Provider: {course.provider}</span>
            </div>
          </div>
          <aside className="purchase-card complete-purchase-card">
            <span>Price for {quantity} {quantity === 1 ? 'licence' : 'licences'}</span>
            <strong>{formatMoney(lineTotal)}</strong>
            <small>{formatMoney(tier.aptenvoGrossPence)} per learner, including VAT</small>
            <label className="quantity-field">Number of licences<input type="number" min="1" max="9999" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} /></label>
            <button className="button button-primary full-width" type="button" onClick={startCheckout}><ShoppingBasket size={18} /> Continue to checkout</button>
            {checkoutMessage && <p className="checkout-message" role="status">{checkoutMessage}</p>}
            <ul>
              <li><Check size={16} /> Online, self-paced learning</li>
              <li><Check size={16} /> Quantity price selected automatically</li>
              <li><Check size={16} /> Aptenvo customer support</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="section course-detail-section">
        <div className="container course-detail-layout">
          <div className="course-main-content">
            <article className="content-card course-copy-card">
              <h2>Course overview</h2>
              <p>{course.overview}</p>
              <h2>Who this course is for</h2>
              <p>{course.audience}</p>
              <h2>What learners will cover</h2>
              <ul className="outcome-list">
                {course.learningOutcomes.map((outcome) => <li key={outcome}><Check size={18} /> <span>{outcome}</span></li>)}
              </ul>
            </article>

            <article className="content-card">
              <h2>Delivery and certification</h2>
              <dl className="course-definition-list">
                <div><dt>Delivery</dt><dd>{course.delivery}</dd></div>
                <div><dt>Provider</dt><dd>{course.provider}</dd></div>
                <div><dt>Certificate</dt><dd>{course.certificate}</dd></div>
                <div><dt>Course type</dt><dd>{course.courseType.replace(/-/g, ' ')}</dd></div>
              </dl>
              <div className="qualification-notice"><Info size={20} /><div><strong>Important qualification information</strong><p>{course.qualificationNotice}</p></div></div>
            </article>
          </div>

          <aside className="course-side-content">
            <div className="info-card pricing-card">
              <h2>Licence pricing</h2>
              <p>Aptenvo prices are calculated at 30% above the provider’s original retail price. VAT is then added at 20%.</p>
              <div className="pricing-table-wrap">
                <table className="pricing-table">
                  <thead><tr><th>Quantity</th><th>Ex VAT</th><th>Inc VAT</th></tr></thead>
                  <tbody>{course.pricingTiers.map((priceTier) => (
                    <tr key={`${priceTier.minQuantity}-${priceTier.maxQuantity ?? 'plus'}`} className={priceTier === tier ? 'active-tier' : ''}>
                      <td>{priceTier.minQuantity}{priceTier.maxQuantity ? `–${priceTier.maxQuantity}` : '+'}</td>
                      <td>{formatMoney(priceTier.aptenvoNetPence)}</td>
                      <td><strong>{formatMoney(priceTier.aptenvoGrossPence)}</strong></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <small>{course.priceSource}</small>
            </div>
            <div className="info-card provider-detail-card">
              <h3>Course provider</h3>
              <div className="provider-row"><div className="provider-mark">H</div><div><strong>{course.provider}</strong><span>Third-party course provider</span></div></div>
              <p>Sold and supported through Aptenvo, a trading division of JA Group Services Ltd.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function BusinessPage() {
  return (
    <main>
      <PageHero eyebrow="Aptenvo Business" title="Training for teams, without the faff" copy="Choose from the full catalogue, buy the required number of licences and prepare assignments for your workforce." />
      <section className="section">
        <div className="container feature-grid">
          <Feature icon={<Users />} title="Manage learners" copy="The database includes learners, organisations, assignments and enrolment records." />
          <Feature icon={<ShoppingBasket />} title="Buy licences" copy="Every course includes complete quantity tiers, net prices, VAT and gross prices." />
          <Feature icon={<Award />} title="Track completion" copy="Completion, certificate and provider-enrolment fields are prepared for later integration." />
          <Feature icon={<Headphones />} title="Get support" copy="First-line customer support and provider escalation can be managed by JA Group Services." />
        </div>
      </section>
      <section className="section section-muted"><div className="container prose-card"><h2>Built for multiple course providers</h2><p>Highfield e-learning is the launch provider, but the Aptenvo database and catalogue model support additional providers, fulfilment methods and Stripe products without rebuilding the storefront.</p><Link className="button button-primary" to="/courses">Browse organisation training <ArrowRight size={18} /></Link></div></section>
    </main>
  );
}

function ProvidersPage() {
  return (
    <main>
      <PageHero eyebrow="Course providers" title="Clear about who provides your training" copy="Every Aptenvo listing identifies the organisation responsible for the course content, delivery and certificate arrangements." />
      <section className="section"><div className="container provider-card"><div className="provider-mark large">H</div><div><span className="status-pill">Launch provider</span><h2>Highfield e-learning</h2><p>The full reseller-scheme catalogue is now represented on Aptenvo, including complete courses, short courses, specialist programmes, Care Certificate standards and individual modules.</p><Link className="button button-primary" to="/courses">View Highfield courses <ArrowRight size={18} /></Link></div></div></section>
    </main>
  );
}

function IndividualsPage() {
  return (
    <main>
      <PageHero eyebrow="For individuals" title="Learn at your own pace" copy="Choose a course, review exactly what it covers and select the number of licences required." />
      <section className="section"><div className="container steps-grid"><Step number="01" title="Choose" copy="Search the complete catalogue by subject, level and course type." /><Step number="02" title="Review" copy="Read the overview, audience, outcomes, pricing and qualification notice." /><Step number="03" title="Purchase" copy="Stripe checkout will use the course and quantity selected on the page." /><Step number="04" title="Learn" copy="Aptenvo will pass the enrolment to the relevant provider." /></div></section>
    </main>
  );
}

function AboutPage() {
  return (
    <main>
      <PageHero eyebrow="About Aptenvo" title="A clearer way to choose online training" copy="Aptenvo is a trading division of JA Group Services Ltd, created to bring courses from selected providers into one customer-focused platform." />
      <section className="section"><div className="container content-grid"><article className="content-card"><h2>What Aptenvo does</h2><p>Aptenvo provides the catalogue, pricing journey, customer account structure, organisation tools and first-line support. The relevant training provider remains responsible for the underlying course content and delivery.</p><h2>Our launch catalogue</h2><p>The initial catalogue contains {catalogue.length} products drawn from the Highfield reseller scheme, including individual modules and quantity-based licence pricing.</p></article><aside className="info-card"><Building2 size={28} /><h3>Legal operator</h3><strong>JA Group Services Ltd</strong><p>Company number 16314179<br />Registered in England and Wales</p></aside></div></section>
    </main>
  );
}

function SupportPage() {
  const [sent, setSent] = useState(false);
  const submit = (event: FormEvent) => { event.preventDefault(); setSent(true); };
  return (
    <main>
      <PageHero eyebrow="Help and support" title="We are here when you need us" copy="Get help with course selection, purchases, learner access, organisation licences and provider escalations." />
      <section className="section"><div className="container support-grid"><div className="support-options"><Feature icon={<Headphones />} title="Customer support" copy="Aptenvo provides first-line support for orders, accounts and access queries." /><Feature icon={<ShieldCheck />} title="Privacy and security" copy="Contact JA Group Services about personal data, security or account concerns." /></div><form className="contact-card" onSubmit={submit}><h2>Contact Aptenvo</h2>{sent ? <div className="success-message"><Check size={22} /> Your enquiry has been recorded in this website preview.</div> : <><label>Name<input required name="name" /></label><label>Email<input required type="email" name="email" /></label><label>How can we help?<textarea required name="message" rows={5} /></label><button className="button button-primary" type="submit">Send enquiry <ArrowRight size={18} /></button></>}</form></div></section>
    </main>
  );
}

function AccountPage() {
  return <main><PageHero eyebrow="My Aptenvo" title="Your learning account is coming next" copy="The database is prepared for individual learners, organisation administrators, enrolments, completion records and certificates." /><section className="section"><div className="container prose-card centre"><CircleUserRound size={48} /><h2>JA Group Services ID connection point</h2><p>The next identity phase will connect Aptenvo to Microsoft Entra External ID.</p><Link className="button button-primary" to="/courses">Browse courses</Link></div></section></main>;
}

function LegalPage({ title }: { title: string }) {
  return <main><PageHero eyebrow="Legal and trust" title={title} copy="This page is part of the Aptenvo website foundation and is ready for approved JA Group Services wording." /><section className="section"><div className="container prose-card"><h2>Draft placeholder</h2><p>The final document must be reviewed and approved before live customer sales begin.</p></div></section></main>;
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
  const price = singleLicenceTier(course);
  return (
    <article className="course-card complete-course-card">
      <div className="course-card-top"><span>{course.category}</span><span>{course.level}</span></div>
      <div className="course-card-icon"><BookOpen size={26} /></div>
      <h3>{course.title}</h3>
      <p>{course.shortDescription}</p>
      <div className="provider-line"><Award size={16} /> {course.provider}</div>
      <div className="course-card-bottom"><div><strong>{formatMoney(price.aptenvoGrossPence)}</strong><small>inc VAT · 1 licence</small></div><Link to={`/courses/${course.slug}`}>View course <ArrowRight size={16} /></Link></div>
    </article>
  );
}

function Feature({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <article className="feature-card"><div className="icon-tile">{icon}</div><h3>{title}</h3><p>{copy}</p></article>;
}

function Step({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <article className="step-card"><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>;
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
