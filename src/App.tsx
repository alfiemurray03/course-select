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
  Mail,
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
import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import BasketPage from './BasketPage';
import { ONLINE_LICENCE_LIMIT, useBasket } from './basket';
import {
  catalogue,
  categories as catalogueCategories,
  formatMoney,
  singleLicenceTier,
  tierForQuantity,
  type Course,
} from './catalogue';

type ThemeMode = 'light' | 'dark' | 'system';

const CONTACT_EMAIL = 'contact@jagroupservices.co.uk';

const wordmarkStyle = {
  color: '#2563eb',
  fontFamily: '"Plus Jakarta Sans", Inter, sans-serif',
  fontSize: '1.42rem',
  fontWeight: 800,
  letterSpacing: '-0.035em',
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
  const { itemCount, licenceCount } = useBasket();

  useEffect(() => {
    setOpen(false);
    setLearnOpen(false);
  }, [location.pathname]);

  const rotateTheme = () => setMode(mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system');

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand" aria-label="Sousa Murray eLearning home"><span style={wordmarkStyle}>Sousa Murray eLearning</span></Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/courses">Browse courses</NavLink>
          <div className="nav-dropdown">
            <button type="button" onClick={() => setLearnOpen((value) => !value)} aria-expanded={learnOpen}>Learning <ChevronDown size={15} /></button>
            {learnOpen && (
              <div className="dropdown-panel">
                <Link to="/individuals"><strong>For individuals</strong><span>Choose training for yourself</span></Link>
                <Link to="/business"><strong>For organisations</strong><span>Workforce training and larger orders</span></Link>
                <Link to="/providers"><strong>How courses are delivered</strong><span>Sousa Murray eLearning support and Highfield LMS access</span></Link>
              </div>
            )}
          </div>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/support">Support</NavLink>
        </nav>

        <div className="header-actions">
          <Link className="basket-header-button" to="/basket" aria-label={`Basket with ${itemCount} courses and ${licenceCount} licences`}>
            <ShoppingBasket size={19} /><span className="basket-header-label">Basket</span>
            {itemCount > 0 && <span className="basket-count-badge">{itemCount}</span>}
          </Link>
          <Link className="account-button desktop-account" to="/account"><CircleUserRound size={18} /> Sign in</Link>
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
          <Link className="mobile-basket-link" to="/basket"><ShoppingBasket size={19} /> Basket {itemCount > 0 && `(${itemCount})`}</Link>
          <Link to="/">Home</Link><Link to="/courses">Browse courses</Link><Link to="/individuals">For individuals</Link>
          <Link to="/business">For organisations</Link><Link to="/providers">How courses are delivered</Link><Link to="/about">About Sousa Murray eLearning</Link><Link to="/support">Help and support</Link>
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
            <span style={{ ...wordmarkStyle, color: '#4f7cff', fontSize: '1.65rem' }}>Sousa Murray eLearning</span>
            <p>An authorised reseller of Highfield Online Training, operated by JA Group Services Ltd.</p>
          </div>
          <div><h3>Sousa Murray eLearning</h3><Link to="/courses">Browse courses</Link><Link to="/basket">Your basket</Link><Link to="/individuals">For individuals</Link><Link to="/business">For organisations</Link></div>
          <div><h3>Support</h3><Link to="/support">Help centre</Link><Link to="/support?topic=large-order">Large orders</Link><Link to="/accessibility">Accessibility</Link><Link to="/complaints">Complaints</Link></div>
          <div><h3>Legal</h3><Link to="/terms">Terms and conditions</Link><Link to="/privacy">Privacy notice</Link><Link to="/cookies">Cookie notice</Link><Link to="/refunds">Refund policy</Link></div>
        </div>
      </footer>
      <div className="corporate-disclosure">
        <div><strong>Sousa Murray eLearning is a trading division of JA Group Services Ltd.</strong><span>Registered in England and Wales. Company number 16314179. ICO registration ZB877370.</span></div>
        <span>© {new Date().getFullYear()} JA Group Services Ltd.</span>
      </div>
    </>
  );
}

function Layout({ children }: { children: ReactNode }) {
  const { mode, setMode } = useTheme();
  const location = useLocation();
  useEffect(() => window.scrollTo({ top: 0, behavior: 'auto' }), [location.pathname]);
  return <><Header mode={mode} setMode={setMode} />{children}<Footer /></>;
}

function HomePage() {
  const featured = catalogue.filter((course) => course.featured).slice(0, 6);
  return (
    <main>
      <section className="hero">
        <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">Authorised reseller · Sousa Murray eLearning customer support · Highfield course access</div>
            <h1>Choose the right course.<br /><span>Build what comes next.</span></h1>
            <p>Sousa Murray eLearning is operated by JA Group Services Ltd and is an authorised reseller of Highfield Online Training. You purchase from Sousa Murray eLearning and remain an Sousa Murray eLearning customer throughout.</p>
            <div className="button-row"><Link className="button button-light" to="/courses">Browse all {catalogue.length} courses <ArrowRight size={18} /></Link><Link className="button button-ghost" to="/business">Training for organisations</Link></div>
            <div className="trust-list"><span><Check size={16} /> Customer relationship with Sousa Murray eLearning</span><span><Check size={16} /> Clear VAT-inclusive pricing</span><span><Check size={16} /> Up to {ONLINE_LICENCE_LIMIT} licences online</span></div>
          </div>
          <aside className="hero-panel">
            <div className="hero-panel-heading"><span>One clear customer journey</span><h2>Purchase through Sousa Murray eLearning. Learn through Highfield.</h2></div>
            <div className="hero-stats"><div><strong>{catalogue.length}</strong><span>catalogue items</span></div><div><strong>{catalogueCategories.length}</strong><span>subjects</span></div><div><strong>{ONLINE_LICENCE_LIMIT}</strong><span>online limit</span></div></div>
            <div className="hero-provider"><div className="provider-mark">H</div><div><strong>Highfield Online Training</strong><span>Course content and Learning Management System</span></div><Award size={22} /></div>
          </aside>
        </div>
      </section>

      <section className="fact-strip"><div className="container facts">
        <Fact icon={<Building2 />} label="Your supplier" value="JA Group Services Ltd through Sousa Murray eLearning" />
        <Fact icon={<ShoppingBasket />} label="Online orders" value={`Up to ${ONLINE_LICENCE_LIMIT} licences in total`} />
        <Fact icon={<Mail />} label="Course access" value="Highfield emails the enrolled learner" />
        <Fact icon={<Headphones />} label="All support" value="Contact Sousa Murray eLearning first" />
      </div></section>

      <section className="section"><div className="container">
        <SectionHeading eyebrow="Browse by subject" title="Training that fits your next step" description="Search the Highfield Online Training catalogue available to purchase through Sousa Murray eLearning." />
        <div className="category-grid">{featuredCategories.map(({ name, icon: Icon, copy }) => <Link className="category-card" to={`/courses?category=${encodeURIComponent(name)}`} key={name}><div className="icon-tile"><Icon size={24} /></div><h3>{name}</h3><p>{copy}</p><span>Explore courses <ArrowRight size={16} /></span></Link>)}</div>
      </div></section>

      <section className="section section-muted"><div className="container">
        <SectionHeading eyebrow="Featured courses" title="Popular places to start" description="Review the course information, choose the required licences and combine different courses in one Sousa Murray eLearning basket." />
        <div className="course-grid">{featured.map((course) => <CourseCard course={course} key={course.slug} />)}</div>
        <div className="centre-action"><Link className="button button-primary" to="/courses">View the full catalogue <ArrowRight size={18} /></Link></div>
      </div></section>

      <section className="section"><div className="container process-section">
        <SectionHeading eyebrow="What happens after purchase" title="Your Sousa Murray eLearning order and Highfield course access" description="The customer relationship stays with Sousa Murray eLearning. Highfield supplies the course and Learning Management System access needed to fulfil your purchase." />
        <div className="steps-grid">
          <Step number="01" title="Purchase from Sousa Murray eLearning" copy="Choose your courses and complete one secure payment to JA Group Services Ltd through Sousa Murray eLearning." />
          <Step number="02" title="Sousa Murray eLearning processes enrolment" copy="Sousa Murray eLearning records your order and enrols the named learner onto the course purchased." />
          <Step number="03" title="Highfield emails the learner" copy="Highfield sends the enrolled learner instructions for accessing its Learning Management System." />
          <Step number="04" title="Sousa Murray eLearning supports you" copy="For any issue, contact Sousa Murray eLearning first. We investigate and only escalate to Highfield when provider assistance is required." />
        </div>
      </div></section>

      <section className="section section-muted"><div className="container large-order-banner">
        <div><span className="eyebrow blue">Large licence requirements</span><h2>Need more than {ONLINE_LICENCE_LIMIT} licences?</h2><p>Public online checkout is limited to {ONLINE_LICENCE_LIMIT} licences in total. Orders of {ONLINE_LICENCE_LIMIT + 1} licences or more are handled directly by Sousa Murray eLearning for every customer type, including individuals and organisations.</p></div>
        <Link className="button button-primary" to="/support?topic=large-order">Contact Sousa Murray eLearning <ArrowRight size={18} /></Link>
      </div></section>
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
      const haystack = `${course.title} Highfield Online Training ${course.category} ${course.level} ${course.shortDescription}`.toLowerCase();
      return matchesCategory && matchesType && (!normalised || haystack.includes(normalised));
    });
  }, [query, category, type]);

  return <main><PageHero eyebrow="Course catalogue" title="Find your next online course" copy={`Search ${catalogue.length} Highfield Online Training courses and focused modules available to purchase through Sousa Murray eLearning.`} />
    <section className="section"><div className="container">
      <div className="catalogue-toolbar expanded-toolbar">
        <label className="search-box"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search course title, subject or level" /></label>
        <label className="select-filter"><Filter size={17} /><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by subject"><option>All subjects</option>{catalogueCategories.map((option) => <option key={option}>{option}</option>)}</select></label>
        <select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by course type"><option>All course types</option><option value="full-course">Full courses</option><option value="short-course">Short courses</option><option value="first-aid">First aid</option><option value="specialist">Specialist courses</option><option value="care-standard">Care Certificate standards</option><option value="module">Individual modules</option></select>
      </div>
      <div className="results-heading"><strong>{filtered.length} results</strong><span>Prices include VAT · Maximum {ONLINE_LICENCE_LIMIT} licences online</span></div>
      {filtered.length ? <div className="course-grid">{filtered.map((course) => <CourseCard course={course} key={course.slug} />)}</div> : <div className="empty-results"><Search size={28} /><h2>No matching courses</h2><p>Try a broader search or remove one of the filters.</p></div>}
    </div></section>
  </main>;
}

function CoursePage() {
  const { slug } = useParams();
  const course = catalogue.find((entry) => entry.slug === slug);
  const [quantity, setQuantity] = useState(1);
  const [basketMessage, setBasketMessage] = useState('');
  const { items, licenceCount, addItem } = useBasket();

  if (!course) return <NotFoundPage />;

  const currentCourseQuantity = items.find((item) => item.courseId === course.id)?.quantity ?? 0;
  const remainingCapacity = Math.max(0, ONLINE_LICENCE_LIMIT - licenceCount);
  const tier = tierForQuantity(course, quantity);
  const lineTotal = tier.aptenvoGrossPence * quantity;

  const addToBasket = () => {
    if (quantity > remainingCapacity) {
      setBasketMessage(remainingCapacity > 0
        ? `Only ${remainingCapacity} more ${remainingCapacity === 1 ? 'licence can' : 'licences can'} be added online. Contact Sousa Murray eLearning for an order above ${ONLINE_LICENCE_LIMIT} licences.`
        : `Your basket has reached the ${ONLINE_LICENCE_LIMIT}-licence online limit. Contact Sousa Murray eLearning for a larger order.`);
      return;
    }
    addItem(course.id, quantity);
    const newCourseQuantity = currentCourseQuantity + quantity;
    setBasketMessage(`${quantity} ${quantity === 1 ? 'licence' : 'licences'} added. You now have ${newCourseQuantity} ${newCourseQuantity === 1 ? 'licence' : 'licences'} for this course in your basket.`);
  };

  const needsLargeOrderContact = quantity > remainingCapacity || remainingCapacity === 0;

  return <main>
    <section className="course-hero"><div className="container course-hero-grid">
      <div><Link className="back-link" to="/courses">← Back to courses</Link><div className="eyebrow">{course.category} · {course.level}</div><h1>{course.title}</h1><p>{course.shortDescription}</p><div className="course-meta"><span><Clock3 size={18} /> Self-paced online learning</span><span><Award size={18} /> Course by Highfield Online Training</span></div></div>
      <aside className="purchase-card complete-purchase-card">
        <span>Price for {quantity} {quantity === 1 ? 'licence' : 'licences'}</span><strong>{formatMoney(lineTotal)}</strong><small>{formatMoney(tier.aptenvoGrossPence)} per learner, including VAT</small>
        <label className="quantity-field">Number of licences<input type="number" min="1" max={ONLINE_LICENCE_LIMIT} value={quantity} onChange={(event) => setQuantity(Math.min(ONLINE_LICENCE_LIMIT, Math.max(1, Number(event.target.value) || 1)))} /></label>
        <button className="button button-primary full-width" type="button" onClick={addToBasket} disabled={remainingCapacity === 0}><ShoppingBasket size={18} /> {remainingCapacity === 0 ? 'Online basket limit reached' : 'Add to basket'}</button>
        {basketMessage && <div className="basket-added-message" role="status"><Info size={17} /><span>{basketMessage}</span><Link to={needsLargeOrderContact ? '/support?topic=large-order' : '/basket'}>{needsLargeOrderContact ? 'Contact us' : 'View basket'}</Link></div>}
        <ul><li><Check size={16} /> Customer relationship stays with Sousa Murray eLearning</li><li><Check size={16} /> Highfield emails LMS access after enrolment</li><li><Check size={16} /> Contact Sousa Murray eLearning for all support</li></ul>
      </aside>
    </div></section>

    <section className="section course-detail-section"><div className="container course-detail-layout">
      <div className="course-main-content">
        <article className="content-card course-copy-card"><h2>Course overview</h2><p>{course.overview}</p><h2>Who this course is for</h2><p>{course.audience}</p><h2>What learners will cover</h2><ul className="outcome-list">{course.learningOutcomes.map((outcome) => <li key={outcome}><Check size={18} /><span>{outcome}</span></li>)}</ul></article>
        <article className="content-card"><h2>Purchase, delivery and certification</h2>
          <dl className="course-definition-list"><div><dt>Your supplier</dt><dd>JA Group Services Ltd, trading as Sousa Murray eLearning</dd></div><div><dt>Customer relationship</dt><dd>Your order, payment, account, customer service and support relationship remain with Sousa Murray eLearning.</dd></div><div><dt>Course provider</dt><dd>Highfield Online Training</dd></div><div><dt>Learning platform</dt><dd>Highfield Learning Management System</dd></div><div><dt>Access arrangements</dt><dd>After Sousa Murray eLearning enrols the named learner, Highfield emails that learner with LMS access instructions.</dd></div><div><dt>Support route</dt><dd>Contact Sousa Murray eLearning first for every issue. If we cannot resolve a provider-side issue, we will escalate it to Highfield on your behalf.</dd></div><div><dt>Certificate</dt><dd>{course.certificate}</dd></div><div><dt>Course type</dt><dd>{course.courseType.replace(/-/g, ' ')}</dd></div></dl>
          <div className="qualification-notice"><Info size={20} /><div><strong>Important qualification information</strong><p>{course.qualificationNotice}</p></div></div>
        </article>
      </div>
      <aside className="course-side-content">
        <div className="info-card pricing-card"><h2>Licence pricing</h2><p>Online checkout supports a maximum of {ONLINE_LICENCE_LIMIT} licences in total. Larger requirements are processed directly by Sousa Murray eLearning.</p><div className="pricing-table-wrap"><table className="pricing-table"><thead><tr><th>Quantity</th><th>Ex VAT</th><th>Inc VAT</th></tr></thead><tbody>{course.pricingTiers.filter((priceTier) => priceTier.minQuantity <= ONLINE_LICENCE_LIMIT).map((priceTier) => <tr key={`${priceTier.minQuantity}-${priceTier.maxQuantity ?? 'plus'}`} className={priceTier === tier ? 'active-tier' : ''}><td>{priceTier.minQuantity}{priceTier.maxQuantity ? `–${Math.min(priceTier.maxQuantity, ONLINE_LICENCE_LIMIT)}` : `–${ONLINE_LICENCE_LIMIT}`}</td><td>{formatMoney(priceTier.aptenvoNetPence)}</td><td><strong>{formatMoney(priceTier.aptenvoGrossPence)}</strong></td></tr>)}</tbody></table></div><small>{course.priceSource}</small><Link className="large-order-inline-link" to="/support?topic=large-order">Need {ONLINE_LICENCE_LIMIT + 1} or more licences? Contact Sousa Murray eLearning →</Link></div>
        <div className="info-card provider-detail-card"><h3>Authorised reseller arrangement</h3><div className="provider-row"><div className="provider-mark">H</div><div><strong>Highfield Online Training</strong><span>Course provider and LMS operator</span></div></div><p>JA Group Services Ltd, trading as Sousa Murray eLearning, is the seller and customer-facing business. Highfield fulfils the course and LMS elements behind the Sousa Murray eLearning service. Customers do not need to contact Highfield directly.</p></div>
      </aside>
    </div></section>
  </main>;
}

function BusinessPage() {
  return <main><PageHero eyebrow="Sousa Murray eLearning for organisations" title="Online training for your team" copy={`Purchase up to ${ONLINE_LICENCE_LIMIT} licences online. Larger requirements are handled directly by Sousa Murray eLearning so the courses, learner numbers and fulfilment arrangements can be confirmed with you.`} />
    <section className="section"><div className="container feature-grid"><Feature icon={<ShoppingBasket />} title={`Up to ${ONLINE_LICENCE_LIMIT} licences online`} copy={`Combine different courses in one basket, provided the total number of licences does not exceed ${ONLINE_LICENCE_LIMIT}.`} /><Feature icon={<Users />} title={`${ONLINE_LICENCE_LIMIT + 1}+ licences by enquiry`} copy="Large requirements are not processed through public checkout for individuals, organisations or any other customer type." /><Feature icon={<Mail />} title="Highfield LMS access email" copy="After Sousa Murray eLearning enrols each learner, Highfield sends the LMS access instructions to the learner’s email address." /><Feature icon={<Headphones />} title="Sousa Murray eLearning first-line support" copy="Customers contact Sousa Murray eLearning for every issue. We escalate to Highfield only when provider assistance is required." /></div></section>
    <section className="section section-muted"><div className="container large-order-panel"><div><span className="eyebrow blue">Large orders</span><h2>More than {ONLINE_LICENCE_LIMIT} course licences</h2><p>Do not split a larger requirement across several website orders. Contact Sousa Murray eLearning so the full requirement can be handled as one direct order.</p><ul className="check-list"><li><Check size={18} /> Course and learner quantities confirmed</li><li><Check size={18} /> Direct order arrangements through Sousa Murray eLearning</li><li><Check size={18} /> Learner enrolment coordinated by Sousa Murray eLearning</li><li><Check size={18} /> Sousa Murray eLearning remains your sole support contact</li></ul></div><div className="large-order-contact"><Mail size={30} /><h3>Contact Sousa Murray eLearning</h3><p>Tell us which courses you require and the number of learner licences needed.</p><a className="button button-primary" href={`mailto:${CONTACT_EMAIL}?subject=Sousa Murray eLearning%20large%20licence%20order`}>Email {CONTACT_EMAIL}</a></div></div></section>
  </main>;
}

function ProvidersPage() {
  return <main><PageHero eyebrow="Course delivery" title="Sousa Murray eLearning customers, Highfield course access" copy="Your purchase, account and support relationship are with JA Group Services Ltd through Sousa Murray eLearning. Highfield supplies the training content and Learning Management System used to complete the course." />
    <section className="section"><div className="container relationship-grid">
      <article className="relationship-card primary-relationship-card"><div className="icon-tile"><Building2 size={25} /></div><span className="status-pill">Your supplier and sole support contact</span><h2>JA Group Services Ltd — Sousa Murray eLearning</h2><p>Sousa Murray eLearning markets and sells the courses, takes payment, records the order, arranges learner enrolment and provides first-line support. Customers remain customers of JA Group Services Ltd through Sousa Murray eLearning.</p><ul className="check-list"><li><Check size={18} /> Sousa Murray eLearning order and payment</li><li><Check size={18} /> Sousa Murray eLearning customer account</li><li><Check size={18} /> Sousa Murray eLearning support and complaints</li><li><Check size={18} /> Sousa Murray eLearning manages any provider escalation</li></ul></article>
      <article className="relationship-card"><div className="provider-mark large">H</div><span className="status-pill">Course provider and LMS operator</span><h2>Highfield Online Training</h2><p>Highfield supplies the course content and hosts the learner’s course within its Learning Management System. Once Sousa Murray eLearning has enrolled the learner, Highfield sends the learner an access email.</p><ul className="check-list"><li><Check size={18} /> Course content and delivery</li><li><Check size={18} /> Learning Management System</li><li><Check size={18} /> Learner access instructions</li><li><Check size={18} /> Assistance to Sousa Murray eLearning when escalated</li></ul></article>
    </div></section>
    <section className="section section-muted"><div className="container process-section"><SectionHeading eyebrow="Support and learner access" title="One point of contact: Sousa Murray eLearning" description="Highfield’s email gives the learner access to the course. It does not make Highfield the customer’s support contact." /><div className="steps-grid"><Step number="01" title="Sousa Murray eLearning records the order" copy="The payment, customer record and order remain within Sousa Murray eLearning." /><Step number="02" title="Sousa Murray eLearning enrols the learner" copy="The necessary learner details are submitted to Highfield for course fulfilment." /><Step number="03" title="Highfield emails access" copy="The learner receives instructions for accessing the Highfield Learning Management System." /><Step number="04" title="Contact Sousa Murray eLearning for help" copy="Sousa Murray eLearning investigates first. If specialist provider help is needed, Sousa Murray eLearning escalates the issue to Highfield and manages the response." /></div><div className="provider-access-note"><Info size={22} /><div><strong>Waiting for an access email or unable to use the course?</strong><p>Contact Sousa Murray eLearning. We will check the order and enrolment first, then raise the matter with Highfield ourselves if their assistance is required.</p></div></div></div></section>
  </main>;
}

function IndividualsPage() {
  return <main><PageHero eyebrow="For individuals" title="Purchase through Sousa Murray eLearning and learn through Highfield" copy={`Choose one or several courses, review what each course covers and complete one Sousa Murray eLearning checkout for up to ${ONLINE_LICENCE_LIMIT} licences.`} />
    <section className="section"><div className="container steps-grid"><Step number="01" title="Choose" copy="Search the catalogue and read the full information for each course." /><Step number="02" title="Purchase from Sousa Murray eLearning" copy="Add courses to the basket and complete your payment to JA Group Services Ltd through Sousa Murray eLearning." /><Step number="03" title="Receive Highfield access" copy="After Sousa Murray eLearning enrols the learner, Highfield emails the LMS sign-in instructions." /><Step number="04" title="Contact Sousa Murray eLearning for support" copy="For order, enrolment, access or course issues, contact Sousa Murray eLearning first. We manage any necessary escalation." /></div></section>
  </main>;
}

function AboutPage() {
  return <main><PageHero eyebrow="About Sousa Murray eLearning" title="Online training sold and supported by JA Group Services" copy="Sousa Murray eLearning is a trading division of JA Group Services Ltd and an authorised reseller of Highfield Online Training." />
    <section className="section"><div className="container content-grid"><article className="content-card company-copy-card"><h2>What Sousa Murray eLearning does</h2><p>Sousa Murray eLearning provides a customer-focused catalogue of online training for individuals and organisations. We present the available courses, process purchases, manage Sousa Murray eLearning customer orders, arrange learner enrolment and provide first-line customer support.</p><h2>Our relationship with customers</h2><p>Customers purchase from JA Group Services Ltd through Sousa Murray eLearning. The customer account, payment, order, support and complaint relationship remain with Sousa Murray eLearning. Accessing a course through Highfield’s Learning Management System does not transfer that customer relationship to Highfield.</p><h2>Our authorised reseller arrangement</h2><p>JA Group Services Ltd, trading as Sousa Murray eLearning, is an authorised reseller of Highfield Online Training. Highfield supplies the course content and learning platform. Sousa Murray eLearning supplies the customer purchasing journey and coordinates enrolment.</p><h2>How learner access works</h2><p>Once Sousa Murray eLearning has enrolled the named learner onto the purchased course, Highfield sends an email to that learner with instructions for accessing the Highfield Learning Management System.</p><h2>How support works</h2><p>Customers contact Sousa Murray eLearning for all support. Sousa Murray eLearning investigates the order, enrolment and access issue first. Where we cannot resolve a provider-side problem ourselves, we escalate the issue to Highfield and continue managing it for the customer.</p><h2>Online and larger orders</h2><p>The public website accepts orders containing up to {ONLINE_LICENCE_LIMIT} licences in total. Requirements of {ONLINE_LICENCE_LIMIT + 1} licences or more must be arranged directly with Sousa Murray eLearning and must not be divided across several online orders.</p></article><aside className="info-card company-details-card"><Building2 size={30} /><h3>Legal operator</h3><strong>JA Group Services Ltd</strong><p>Sousa Murray eLearning is a trading division, not a separate legal entity.</p><dl><div><dt>Company number</dt><dd>16314179</dd></div><div><dt>ICO registration</dt><dd>ZB877370</dd></div><div><dt>Registered in</dt><dd>England and Wales</dd></div><div><dt>Customer contact</dt><dd><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></dd></div></dl><Link className="button button-primary full-width" to="/support">Contact Sousa Murray eLearning</Link></aside></div></section>
  </main>;
}

function SupportPage() {
  const [searchParams] = useSearchParams();
  const largeOrder = searchParams.get('topic') === 'large-order';
  const subject = largeOrder ? 'Sousa Murray eLearning large licence order' : 'Sousa Murray eLearning customer support';

  return <main><PageHero eyebrow="Sousa Murray eLearning customer support" title={largeOrder ? 'Arrange a larger licence order' : 'Contact Sousa Murray eLearning first for every issue'} copy={largeOrder ? `Orders of ${ONLINE_LICENCE_LIMIT + 1} licences or more are arranged directly with Sousa Murray eLearning and are not accepted through public online checkout.` : 'Sousa Murray eLearning is your first and only customer-facing support contact for orders, enrolment, LMS access and course issues.'} />
    <section className="section"><div className="container support-grid"><div className="support-options"><Feature icon={<Headphones />} title="First-line support by Sousa Murray eLearning" copy="We investigate the customer record, payment, order and enrolment before deciding whether provider assistance is required." /><Feature icon={<Mail />} title="Missing Highfield access email" copy="Contact Sousa Murray eLearning, not Highfield. We will check the learner details and enrolment status for you." /><Feature icon={<Users />} title="Larger licence requirements" copy={`Contact us before purchasing if the total requirement is above ${ONLINE_LICENCE_LIMIT} licences.`} /><Feature icon={<ShieldCheck />} title="Managed provider escalation" copy="If we cannot resolve a Highfield LMS or course-delivery issue, Sousa Murray eLearning raises and manages the escalation on the customer’s behalf." /></div><aside className="contact-card support-contact-card"><Mail size={34} /><h2>Contact Sousa Murray eLearning</h2><p>Include the customer name, order reference, learner email address and a clear description of the issue. Do not send passwords or payment-card details.</p><a className="button button-primary full-width" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`}>Email {CONTACT_EMAIL}</a><div className="support-route-note"><strong>You do not need to contact Highfield.</strong><span>Sousa Murray eLearning will approach Highfield where escalation is necessary and will remain your point of contact.</span></div></aside></div></section>
  </main>;
}

function AccountPage() {
  return <main><PageHero eyebrow="My learning account" title="Your Sousa Murray eLearning customer account is coming next" copy="The customer account will remain with JA Group Services Ltd through Sousa Murray eLearning, while course access is provided through the relevant learning platform." /><section className="section"><div className="container prose-card centre"><CircleUserRound size={48} /><h2>JA Group Services ID connection point</h2><p>The next identity phase will connect Sousa Murray eLearning to Microsoft Entra External ID for Sousa Murray eLearning customer accounts.</p><Link className="button button-primary" to="/courses">Browse courses</Link></div></section></main>;
}

function LegalPage({ title }: { title: string }) {
  return <main><PageHero eyebrow="Legal and trust" title={title} copy="Sousa Murray eLearning is operated by JA Group Services Ltd, which is the customer’s supplier and contractual point of contact." /><section className="section"><div className="container prose-card"><h2>Document preparation in progress</h2><p>The complete approved wording for this document will be published before the relevant customer function is formally launched.</p></div></section></main>;
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
  return <article className="course-card complete-course-card"><div className="course-card-top"><span>{course.category}</span><span>{course.level}</span></div><div className="course-card-icon"><BookOpen size={26} /></div><h3>{course.title}</h3><p>{course.shortDescription}</p><div className="provider-line"><Award size={16} /> Course by Highfield Online Training</div><div className="course-card-bottom"><div><strong>{formatMoney(price.aptenvoGrossPence)}</strong><small>inc VAT · 1 licence</small></div><Link to={`/courses/${course.slug}`}>View course <ArrowRight size={16} /></Link></div></article>;
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
        <Route path="/basket" element={<BasketPage />} />
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
