import {
  Accessibility,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CircleUserRound,
  Clock3,
  FileText,
  Headphones,
  LifeBuoy,
  Mail,
  Map,
  MessageSquareText,
  MonitorSmartphone,
  Scale,
  ShieldCheck,
  ShoppingBasket,
  UserCheck,
  Users,
} from 'lucide-react';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { catalogue, categories } from './catalogue';
import './trust-pages.css';

const EFFECTIVE_DATE = '4 August 2026';
const COMPANY = 'JA Group Services Ltd';
const CONTACT_EMAIL = 'contact@jagroupservices.co.uk';

function TrustHero({ eyebrow, title, copy, icon }: { eyebrow: string; title: string; copy: string; icon: ReactNode }) {
  return <section className="page-hero trust-page-hero"><div className="container trust-hero-grid">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{copy}</p></div>
    <aside>{icon}<span><strong>Effective date</strong><small>{EFFECTIVE_DATE}</small></span></aside>
  </div></section>;
}

function PolicySection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section className="trust-policy-section" id={id}><h2>{title}</h2>{children}</section>;
}

function CheckList({ items }: { items: ReactNode[] }) {
  return <ul className="trust-check-list">{items.map((item, index) => <li key={index}><Check size={17} /><span>{item}</span></li>)}</ul>;
}

function PolicyLayout({ contents, children }: { contents: Array<[string, string]>; children: ReactNode }) {
  return <section className="section"><div className="container trust-policy-layout">
    <aside className="trust-policy-toc"><strong>On this page</strong><nav>{contents.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav><div><Building2 size={20} /><span><strong>{COMPANY}</strong><small>Company number 16314179<br />ICO registration ZB877370</small></span></div></aside>
    <article className="trust-policy-document">{children}</article>
  </div></section>;
}

export function AccessibilityPolicyPage() {
  const contents: Array<[string, string]> = [
    ['commitment', 'Our commitment'], ['standard', 'Accessibility standard'], ['tools', 'Accessibility tools'],
    ['website', 'Using the website'], ['third-party', 'Third-party services'], ['limitations', 'Known limitations'],
    ['adjustments', 'Reasonable adjustments'], ['feedback', 'Report a problem'], ['complaints', 'Accessibility complaints'],
    ['review', 'Testing and review'],
  ];

  return <main>
    <TrustHero eyebrow="Accessibility and inclusion" title="Aptenvo Accessibility Policy" copy="How JA Group Services Ltd aims to make Aptenvo usable by disabled people, people with access needs and customers using assistive technology." icon={<Accessibility size={30} />} />
    <PolicyLayout contents={contents}>
      <div className="trust-intro-note"><ShieldCheck size={22} /><p>Aptenvo is a trading division of {COMPANY}. We want adults to be able to research, purchase and receive support for online training without avoidable digital barriers.</p></div>

      <PolicySection id="commitment" title="1. Our commitment">
        <p>We design Aptenvo with accessibility, readability, keyboard use and responsive layouts in mind. We aim to anticipate reasonable access needs rather than waiting for a customer to experience a barrier.</p>
        <p>Accessibility is an ongoing process covering the public website, forms, My Aptenvo, support, uploaded learner information and the way our team communicates with customers.</p>
      </PolicySection>

      <PolicySection id="standard" title="2. Accessibility standard">
        <p>Our design and development target is the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA. We use that standard as a practical benchmark for making content perceivable, operable, understandable and robust.</p>
        <p>We do not currently claim that every Aptenvo page and every connected third-party journey has passed a complete independent WCAG 2.2 AA audit. Our current position is an ongoing improvement commitment rather than a claim of full conformance.</p>
      </PolicySection>

      <PolicySection id="tools" title="3. Aptenvo accessibility tools">
        <p>The floating accessibility button is adapted from the accessibility controls used on Planyx, another JA Group Services Ltd platform. Preferences are saved in the current browser and can be reset at any time.</p>
        <div className="trust-feature-grid">
          <article><strong>A− / A+</strong><h3>Text size</h3><p>Reduce or increase Aptenvo text in controlled steps.</p></article>
          <article><strong>Contrast</strong><h3>High contrast</h3><p>Apply a black, white and yellow high-contrast presentation.</p></article>
          <article><strong>Motion</strong><h3>Reduce motion</h3><p>Minimise animation, transitions and smooth scrolling.</p></article>
          <article><strong>Reading</strong><h3>Easy-read font</h3><p>Use a clearer system font with additional letter and word spacing.</p></article>
          <article><strong>Links</strong><h3>Underline links</h3><p>Make links more visually distinct throughout the website.</p></article>
          <article><strong>Colour</strong><h3>Grayscale</h3><p>Remove colour from the Aptenvo presentation where preferred.</p></article>
        </div>
        <p>These controls alter Aptenvo only. They do not change the separate Highfield Learning Management System used after enrolment.</p>
      </PolicySection>

      <PolicySection id="website" title="4. How the Aptenvo website should work">
        <CheckList items={[
          <>Pages should be usable with a keyboard without requiring a mouse.</>,
          <>A “Skip to main content” link should be available when keyboard focus enters the page.</>,
          <>Interactive controls should have visible focus indicators and meaningful accessible names.</>,
          <>Forms should use labels, understandable instructions and clear validation messages.</>,
          <>Text should resize without forcing essential content off-screen.</>,
          <>Layouts should work across common mobile, tablet and desktop widths.</>,
          <>Information should not depend on colour alone.</>,
          <>Customers should be warned before being asked for personal or learner information.</>,
        ]} />
      </PolicySection>

      <PolicySection id="third-party" title="5. Third-party services and course delivery">
        <p>Aptenvo uses connected services including Microsoft Entra External ID for JA Group Services ID, Stripe for payments, Cloudflare for hosting and security, and Highfield for course content and LMS access.</p>
        <p>We do not control every accessibility feature in those third-party environments. Where a customer reports a barrier in a connected service, Aptenvo will investigate first and, where necessary, raise the matter with the relevant provider while remaining the customer’s point of contact.</p>
      </PolicySection>

      <PolicySection id="limitations" title="6. Known limitations and areas under review">
        <p>Some older or provider-supplied PDF documents may not have a fully tagged reading order. A learner-list PDF uploaded by a customer may also be inaccessible depending on how that customer created it.</p>
        <p>Some course content, assessments or controls inside the Highfield LMS may behave differently from Aptenvo’s own website. The Aptenvo accessibility tools do not carry over into that LMS.</p>
        <p>We are continuing to review keyboard order, screen-reader labelling, colour contrast, zoom behaviour, error messages, document accessibility and compatibility with common assistive technologies.</p>
      </PolicySection>

      <PolicySection id="adjustments" title="7. Reasonable adjustments and alternative formats">
        <p>Customers may ask Aptenvo for a reasonable adjustment where a disability or access need creates a barrier. The appropriate adjustment depends on the request, the course, the technology involved and what is reasonably practicable.</p>
        <CheckList items={[
          <>providing Aptenvo information in a clearer written format;</>,
          <>allowing additional time for customer-service interactions;</>,
          <>using email instead of another available communication method;</>,
          <>helping an authorised customer provide learner information in a workable format;</>,
          <>raising a provider-side accessibility issue with Highfield;</>,
          <>considering another reasonable way to complete an Aptenvo process.</>,
        ]} />
        <p>We cannot alter the academic or completion requirements of a Highfield course unless Highfield approves the relevant adjustment.</p>
      </PolicySection>

      <PolicySection id="feedback" title="8. Report an accessibility problem">
        <p>Use the Aptenvo contact form and choose <strong>Accessibility support</strong>. Explain the page or feature affected, what you were trying to do, the device or assistive technology used and the adjustment or outcome that would help.</p>
        <p>Do not send passwords, full payment-card details or unnecessary medical information.</p>
        <Link className="button button-primary" to="/contact?topic=accessibility">Request accessibility support <ArrowRight size={17} /></Link>
      </PolicySection>

      <PolicySection id="complaints" title="9. Accessibility complaints">
        <p>An unresolved accessibility concern may be submitted as a formal complaint under the Aptenvo Complaints Policy. Making a complaint will not affect a customer’s right to receive ordinary support or make a lawful rights request.</p>
        <Link to="/complaints">Read the Complaints Policy</Link>
      </PolicySection>

      <PolicySection id="review" title="10. Testing and review">
        <p>We review accessibility when introducing significant pages, forms or account functions and when a customer reports a barrier. This policy will be reviewed after a material accessibility change, a significant complaint or an independent audit.</p>
        <p>Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </PolicySection>
    </PolicyLayout>
  </main>;
}

export function ComplaintsPolicyPage() {
  const contents: Array<[string, string]> = [
    ['purpose', 'Purpose'], ['scope', 'What can be complained about'], ['before', 'Support before a complaint'],
    ['submit', 'How to complain'], ['information', 'Information to provide'], ['process', 'How we handle complaints'],
    ['times', 'Target times'], ['outcomes', 'Possible outcomes'], ['review', 'Requesting a review'],
    ['highfield', 'Highfield-related complaints'], ['conduct', 'Fair treatment and conduct'], ['records', 'Records and privacy'],
  ];

  return <main>
    <TrustHero eyebrow="Customer standards" title="Aptenvo Complaints Policy" copy="How Aptenvo receives, investigates, responds to and reviews complaints about its website, orders, enrolment, accounts, support and customer service." icon={<MessageSquareText size={30} />} />
    <PolicyLayout contents={contents}>
      <div className="trust-intro-note"><Scale size={22} /><p>{COMPANY}, trading as Aptenvo, remains the customer-facing business even where a complaint concerns Highfield course delivery or LMS access.</p></div>

      <PolicySection id="purpose" title="1. Purpose">
        <p>We want complaints to be easy to raise, considered fairly and used to improve Aptenvo. A complaint is an expression of dissatisfaction that requires a response, whether or not the word “complaint” is used.</p>
      </PolicySection>

      <PolicySection id="scope" title="2. What this policy covers">
        <CheckList items={[
          <>course information or the Aptenvo purchasing journey;</>,
          <>payments, billing, cancellation or refund handling;</>,
          <>learner information, enrolment or delays;</>,
          <>My Aptenvo or JA Group Services ID customer-account handling;</>,
          <>first-line support or escalation management;</>,
          <>accessibility, privacy or customer-service conduct;</>,
          <>the way Aptenvo handled an issue involving Highfield.</>,
        ]} />
        <p>Security reports, data-protection rights requests, chargeback disputes and employment matters may follow separate specialist procedures while still being recorded where appropriate.</p>
      </PolicySection>

      <PolicySection id="before" title="3. Support before a formal complaint">
        <p>Many access, enrolment and technical issues can be resolved more quickly through ordinary Aptenvo support. Customers may use the Help Centre or contact form first. However, customers do not have to complete informal support steps before making a formal complaint.</p>
      </PolicySection>

      <PolicySection id="submit" title="4. How to make a complaint">
        <p>Use the Aptenvo contact form and choose <strong>Complaint</strong>, or email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with “Formal complaint” in the subject line.</p>
        <p>Complaints may be made by the customer, an affected learner or an authorised representative. We may ask for evidence of authority before discussing another person’s account or learner information.</p>
        <Link className="button button-primary" to="/contact?topic=complaint">Submit a complaint <ArrowRight size={17} /></Link>
      </PolicySection>

      <PolicySection id="information" title="5. Information that helps us investigate">
        <CheckList items={[
          <>the customer’s legal name and contact email;</>,
          <>the Aptenvo order or contact reference, where available;</>,
          <>the affected learner email and course title;</>,
          <>a clear account of what happened and when;</>,
          <>steps already taken and any relevant messages;</>,
          <>the outcome or remedy being requested.</>,
        ]} />
        <p>Do not include passwords, full card numbers or unrelated sensitive information.</p>
      </PolicySection>

      <PolicySection id="process" title="6. How Aptenvo handles a complaint">
        <div className="trust-process-list">
          <article><span>01</span><div><h3>Record and acknowledge</h3><p>We create or retain an Aptenvo reference and confirm that the complaint has been received.</p></div></article>
          <article><span>02</span><div><h3>Check scope and urgency</h3><p>We identify any immediate safety, access, financial, privacy or service-restoration issue requiring urgent action.</p></div></article>
          <article><span>03</span><div><h3>Investigate</h3><p>We review the order, account, learner information, support history, technical evidence and relevant staff or provider records.</p></div></article>
          <article><span>04</span><div><h3>Seek more information</h3><p>Where necessary, we ask the complainant, internal teams or Highfield for evidence or clarification.</p></div></article>
          <article><span>05</span><div><h3>Issue a response</h3><p>We explain our findings, decision, proposed action and available review route.</p></div></article>
        </div>
      </PolicySection>

      <PolicySection id="times" title="7. Target complaint times">
        <p>We aim to acknowledge a formal complaint within <strong>2 working days</strong> and provide a substantive response within <strong>20 working days</strong>.</p>
        <p>Where a complaint is complex, depends on a provider investigation or cannot reasonably be concluded within 20 working days, we will aim to explain the delay, the work outstanding and the next update date.</p>
        <p>Working-day calculations exclude Sundays and UK public bank holidays observed by Aptenvo, including Christmas and New Year public bank holidays and substitute days. Saturdays count unless Aptenvo has announced a closure affecting the relevant service.</p>
        <p>Urgent service incidents continue to be prioritised under the P1–P4 support framework. That incident priority does not automatically determine the outcome of a complaint.</p>
      </PolicySection>

      <PolicySection id="outcomes" title="8. Possible outcomes">
        <CheckList items={[
          <>an explanation or clarification;</>,
          <>an apology where service fell below the expected standard;</>,
          <>correction of customer or learner information;</>,
          <>completion or reprocessing of an enrolment;</>,
          <>additional support or a reasonable adjustment;</>,
          <>a refund or financial remedy where the Refunds Policy or law supports it;</>,
          <>a process, content, training or technical improvement;</>,
          <>no further action where the complaint is not upheld, with reasons.</>,
        ]} />
      </PolicySection>

      <PolicySection id="review" title="9. Requesting a review">
        <p>A complainant who remains dissatisfied may request an internal review within 20 working days of the complaint response. The request should identify the factual error, missing evidence, procedural concern or unreasonable conclusion being challenged.</p>
        <p>Where reasonably practicable, the review will be considered by somebody who was not the original decision-maker. The review outcome will normally be final within Aptenvo’s internal procedure.</p>
        <p>This policy does not remove statutory rights, the right to contact the Information Commissioner’s Office about data protection, or any right to seek independent legal advice.</p>
      </PolicySection>

      <PolicySection id="highfield" title="10. Complaints involving Highfield">
        <p>Customers do not need to complain to Highfield directly. Aptenvo investigates first and decides whether provider evidence or action is required. We may share the minimum relevant order, learner and technical information with Highfield to investigate the complaint.</p>
        <p>Aptenvo remains responsible for communicating with the customer and explaining the Aptenvo decision, even where provider information informed that decision.</p>
      </PolicySection>

      <PolicySection id="conduct" title="11. Fair treatment and conduct">
        <p>Customers will not be treated adversely merely for making a complaint in good faith. We will consider accessibility or communication adjustments requested for the complaint process.</p>
        <p>We may restrict a communication channel or set reasonable boundaries where behaviour is abusive, threatening, discriminatory, repetitive without new evidence or intended to obstruct the service. Any restriction should be proportionate and should preserve a reasonable route for genuine matters.</p>
      </PolicySection>

      <PolicySection id="records" title="12. Records and privacy">
        <p>Complaint records may include contact details, order and learner information, correspondence, investigation notes, provider responses, decisions and improvement actions. They are handled under the Aptenvo Privacy Policy and retained for an appropriate period based on legal, financial, safeguarding, security and dispute needs.</p>
        <p>Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </PolicySection>
    </PolicyLayout>
  </main>;
}

const siteGroups = [
  {
    title: 'Start here', icon: Map, links: [
      ['Home', '/'], ['Course catalogue', '/courses'], ['For individuals', '/individuals'], ['For organisations', '/organisations'], ['How courses are delivered', '/how-courses-are-delivered'],
    ],
  },
  {
    title: 'Customer account and ordering', icon: CircleUserRound, links: [
      ['My Aptenvo', '/account'], ['Basket', '/basket'], ['Orders of 26+ licences', '/contact?topic=large-order'], ['Contact Aptenvo', '/contact'],
    ],
  },
  {
    title: 'Company and support', icon: LifeBuoy, links: [
      ['About Aptenvo', '/about'], ['Help Centre', '/support'], ['Accessibility Policy', '/accessibility'], ['Complaints Policy', '/complaints'],
    ],
  },
  {
    title: 'Legal and privacy', icon: FileText, links: [
      ['Terms of Use', '/terms'], ['Privacy Policy', '/privacy'], ['Refunds Policy', '/refunds'], ['Acceptable Use Policy', '/acceptable-use'], ['Cookie notice', '/cookies'],
    ],
  },
] as const;

export function SiteMapPage() {
  return <main>
    <section className="page-hero sitemap-hero"><div className="container sitemap-hero-grid"><div><div className="eyebrow">Website navigation</div><h1>Aptenvo site map</h1><p>Find the main Aptenvo service, account, support, policy, category and course pages from one place.</p></div><Map size={76} /></div></section>

    <section className="section"><div className="container">
      <div className="sitemap-group-grid">{siteGroups.map(({ title, icon: Icon, links }) => <section className="sitemap-group" key={title}><Icon size={25} /><h2>{title}</h2><nav>{links.map(([label, href]) => <Link to={href} key={label}>{label}<ArrowRight size={15} /></Link>)}</nav></section>)}</div>
    </div></section>

    <section className="section section-muted"><div className="container">
      <div className="section-heading"><span>Course subjects</span><h2>Browse by training subject</h2><p>Each subject link opens the Aptenvo catalogue with that category selected.</p></div>
      <div className="sitemap-category-grid">{categories.map((category) => <Link key={category} to={`/courses?category=${encodeURIComponent(category)}`}><BookOpen size={18} />{category}<ArrowRight size={15} /></Link>)}</div>
    </div></section>

    <section className="section"><div className="container">
      <div className="section-heading"><span>All available courses</span><h2>{catalogue.length} course pages</h2><p>Course availability and prices are confirmed during the Aptenvo ordering process.</p></div>
      <div className="sitemap-course-list">{catalogue.map((course) => <Link key={course.id} to={`/courses/${course.slug}`}><span><strong>{course.title}</strong><small>{course.category} · {course.level}</small></span><ArrowRight size={15} /></Link>)}</div>
    </div></section>
  </main>;
}
