import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  Clock3,
  FileCheck2,
  GraduationCap,
  Headphones,
  HelpCircle,
  Laptop,
  LockKeyhole,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const CONTACT_EMAIL = 'contact@jagroupservices.co.uk';

function PageHero({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <section className="page-hero enhanced-page-hero"><div className="container"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{copy}</p></div></section>;
}

function InfoTile({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <article className="enhanced-info-tile"><div className="icon-tile">{icon}</div><h3>{title}</h3><p>{copy}</p></article>;
}

export function EnhancedAboutPage() {
  return <main>
    <PageHero
      eyebrow="About Sousa Murray eLearning"
      title="A clear route from choosing training to starting learning"
      copy="Sousa Murray eLearning is the online-training service operated by JA Group Services Ltd. We sell, administer and support Highfield Online Training courses for adult individuals and organisations."
    />

    <section className="section"><div className="container about-introduction-grid">
      <article className="about-story-card">
        <span className="eyebrow blue">Who we are</span>
        <h2>Online training with one accountable customer relationship</h2>
        <p>Sousa Murray eLearning was created to make purchasing workplace and professional online training easier to understand. Customers can compare courses, read who each course is intended for, combine different licences in one basket and provide the learner information needed for enrolment.</p>
        <p>JA Group Services Ltd, trading through Sousa Murray eLearning, is an authorised reseller of Highfield Online Training. Sousa Murray eLearning is the seller, account provider and customer-facing service. Highfield supplies the course content and operates the Learning Management System used by enrolled learners.</p>
        <div className="about-principle"><ShieldCheck size={24} /><div><strong>You remain an Sousa Murray eLearning customer</strong><span>Using the Highfield Learning Management System does not transfer your order, account, support or complaint relationship to Highfield.</span></div></div>
      </article>
      <aside className="about-operator-card">
        <Building2 size={32} />
        <span>Legal operator</span>
        <h2>JA Group Services Ltd</h2>
        <p>Sousa Murray eLearning is a trading division and service of JA Group Services Ltd, not a separate legal entity.</p>
        <dl>
          <div><dt>Company number</dt><dd>16314179</dd></div>
          <div><dt>ICO registration</dt><dd>ZB877370</dd></div>
          <div><dt>Registered in</dt><dd>England and Wales</dd></div>
          <div><dt>Customer support</dt><dd>{CONTACT_EMAIL}</dd></div>
          <div><dt>Minimum customer age</dt><dd>18 years</dd></div>
        </dl>
        <Link className="button button-primary full-width" to="/support">Visit the Help Centre</Link>
      </aside>
    </div></section>

    <section className="section section-muted"><div className="container">
      <div className="section-heading"><span>What Sousa Murray eLearning does</span><h2>More than a link to somebody else’s course</h2><p>Sousa Murray eLearning manages the commercial and customer journey around the training—from course selection to enrolment support.</p></div>
      <div className="enhanced-feature-grid">
        <InfoTile icon={<BookOpen size={24} />} title="Course information" copy="We organise the catalogue into searchable subjects and explain what each course covers, who it is intended for and important qualification limitations." />
        <InfoTile icon={<FileCheck2 size={24} />} title="Ordering and payment" copy="Sousa Murray eLearning provides the basket, confirms licence quantities, records learner details and processes the customer’s payment through Stripe." />
        <InfoTile icon={<GraduationCap size={24} />} title="Learner enrolment" copy="After a successful purchase, Sousa Murray eLearning checks the learner information and enrols each named learner onto the correct course." />
        <InfoTile icon={<Headphones size={24} />} title="First-line support" copy="Customers contact Sousa Murray eLearning first for order, enrolment, access and course issues. We investigate and manage any necessary provider escalation." />
      </div>
    </div></section>

    <section className="section"><div className="container about-journey-section">
      <div className="section-heading"><span>How fulfilment works</span><h2>Purchase through Sousa Murray eLearning. Learn through Highfield.</h2><p>The businesses have distinct roles, but the customer only needs one customer-facing point of contact.</p></div>
      <div className="about-journey-grid">
        <article><span>01</span><h3>Choose and purchase</h3><p>The customer chooses the course and buys from JA Group Services Ltd through Sousa Murray eLearning.</p></article>
        <article><span>02</span><h3>Sousa Murray eLearning validates the order</h3><p>We confirm payment, learner names, enrolment email addresses and the course licences purchased.</p></article>
        <article><span>03</span><h3>Sousa Murray eLearning enrols learners</h3><p>The information required for delivery is provided to Highfield so the correct LMS course access can be created.</p></article>
        <article><span>04</span><h3>Highfield emails access</h3><p>Each enrolled learner receives an email from Highfield with instructions for entering the Learning Management System.</p></article>
        <article><span>05</span><h3>Sousa Murray eLearning remains available</h3><p>The customer contacts Sousa Murray eLearning for help. Provider-side matters are escalated by us rather than passed back to the customer.</p></article>
      </div>
    </div></section>

    <section className="section section-muted"><div className="container about-standards-grid">
      <article className="about-standard-card"><UserCheck size={27} /><h2>Adults only</h2><p>Sousa Murray eLearning is an 18+ service. We do not accept purchases from, or sell courses to, anybody under the age of 18. The purchaser must confirm that they meet the minimum age requirement.</p></article>
      <article className="about-standard-card"><Users size={27} /><h2>Licence limits</h2><p>Up to 25 course licences may be purchased in one public online basket. Requirements for 26 licences or more must be arranged directly with Sousa Murray eLearning and must not be divided into smaller online orders.</p></article>
      <article className="about-standard-card"><LockKeyhole size={27} /><h2>Responsible information handling</h2><p>Learner details are collected only for order administration, enrolment, course delivery and support. Uploaded learner documents are kept in private storage and are not published on the website.</p></article>
      <article className="about-standard-card"><FileCheck2 size={27} /><h2>Activation and refunds</h2><p>Once course access has been activated or learning has begun, change-of-mind refunds are not available where immediate supply was expressly requested. Statutory rights for faulty or misdescribed digital content remain unaffected.</p><Link to="/refunds">Read the refund policy <ArrowRight size={16} /></Link></article>
    </div></section>
  </main>;
}

type HelpArticle = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  keywords: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
};

const helpArticles: HelpArticle[] = [
  {
    id: 'access-email',
    title: 'I have not received my course access email',
    summary: 'Highfield sends LMS access after Sousa Murray eLearning has completed enrolment. The message may be delayed or filtered by the receiving email service.',
    steps: [
      'Check the inbox and spam, junk, promotions and quarantine folders for a Highfield email.',
      'Search the mailbox for “Highfield” and confirm that the email address provided to Sousa Murray eLearning is correct.',
      'Allow reasonable enrolment-processing time after payment. A payment receipt is not the LMS access email.',
      'Contact Sousa Murray eLearning with the order reference and learner email if access has still not arrived. Do not contact Highfield directly.',
    ],
    keywords: 'email access enrolment invite missing login',
    priority: 'P3',
  },
  {
    id: 'sign-in',
    title: 'How do I sign in to the Highfield LMS?',
    summary: 'The learner’s first enrolment email contains the details and link needed to access the Learning Management System.',
    steps: [
      'Open the Highfield enrolment email sent to the learner address supplied during the Sousa Murray eLearning purchase.',
      'Use the login link and the credentials shown in that email. Passwords are case-sensitive.',
      'After signing in, select the course from the learner dashboard and follow the on-screen instructions.',
      'Use the course save-and-exit option before leaving so that completed learning is recorded correctly.',
    ],
    keywords: 'sign in login LMS credentials password dashboard',
    priority: 'P4',
  },
  {
    id: 'forgotten-password',
    title: 'I have forgotten my learner password',
    summary: 'Use the password-recovery option on the Highfield learner login screen rather than creating another account.',
    steps: [
      'Open the learner login page from the original Highfield access email.',
      'Choose “Forgotten learner password?” and enter the learner email address.',
      'Check spam and junk folders for the password-reset message.',
      'Contact Sousa Murray eLearning if no reset email arrives or the account cannot be identified. We will check the enrolment and escalate where necessary.',
    ],
    keywords: 'forgot reset password locked credentials',
    priority: 'P3',
  },
  {
    id: 'course-next',
    title: 'The course will not let me continue or show the next button',
    summary: 'A page may remain incomplete until every required activity, interaction or audio element has finished.',
    steps: [
      'Return to the current module and complete every activity, question, animation and audio section shown on the page.',
      'Wait for narrated or timed content to finish rather than closing the page early.',
      'Refresh the course page and re-open the incomplete section if the progress marker has not updated.',
      'Record the course title, module and page where the issue occurs, then contact Sousa Murray eLearning if it remains blocked.',
    ],
    keywords: 'next continue stuck progress incomplete button module page',
    priority: 'P3',
  },
  {
    id: 'freezing',
    title: 'My course is freezing, crashing or loading slowly',
    summary: 'Course performance can be affected by device support, browser configuration, connection stability or a network that blocks learning content.',
    steps: [
      'Save and exit, close other browser tabs, restart the browser and open the course again from the learner dashboard.',
      'Use an up-to-date supported browser and a stable internet connection. Avoid public or restricted workplace networks where possible.',
      'Test another supported device or network to identify whether the issue is local to the original setup.',
      'Contact Sousa Murray eLearning with screenshots, the device, browser, network type, course title and affected module. We will investigate and manage any Highfield escalation.',
    ],
    keywords: 'freeze crash slow loading internet browser device network',
    priority: 'P2',
  },
  {
    id: 'ipad',
    title: 'The course will not play correctly on an iPad',
    summary: 'An iPad may request the desktop version of the learning page, which can prevent the mobile course player from loading correctly.',
    steps: [
      'Open the page controls in Safari and check whether “Request Desktop Website” is enabled.',
      'Turn the desktop-site request off so that the mobile course page can load.',
      'Close and reopen the course after changing the setting.',
      'Contact Sousa Murray eLearning if the issue continues and include the iPad model, iPadOS version and course title.',
    ],
    keywords: 'ipad safari apple mobile tablet play desktop website',
    priority: 'P3',
  },
  {
    id: 'assessment-locked',
    title: 'The final assessment is locked',
    summary: 'The assessment normally remains unavailable until all required learning pages and modules have been completed.',
    steps: [
      'Return to the course dashboard and look for modules or pages that are not marked complete.',
      'Re-open incomplete sections and complete every interaction or knowledge check.',
      'Refresh the dashboard after completing the remaining content.',
      'Contact Sousa Murray eLearning if every module appears complete but the assessment remains locked.',
    ],
    keywords: 'assessment exam locked complete modules test',
    priority: 'P3',
  },
  {
    id: 'certificate',
    title: 'How do I obtain my completion certificate?',
    summary: 'A certificate is generally made available after the provider’s completion requirements have been met for the course.',
    steps: [
      'Confirm that every required module and assessment is marked complete.',
      'Return to the learner dashboard and open the completed course record.',
      'Open the certificate option, then download or print the available document.',
      'Contact Sousa Murray eLearning if the course is complete but no certificate is available, or if the certificate details are incorrect.',
    ],
    keywords: 'certificate download print completed evidence',
    priority: 'P4',
  },
  {
    id: 'wrong-name',
    title: 'My name or email address is incorrect',
    summary: 'Incorrect learner information should be reported promptly because it can affect account access and the name shown on completion evidence.',
    steps: [
      'Do not create another learner account or continue using details that belong to another person.',
      'Contact Sousa Murray eLearning with the order reference, incorrect information and the correct legal first name, legal last name or enrolment email.',
      'Sousa Murray eLearning will check the customer authority and update the information where possible.',
      'Where the provider must make the correction, Sousa Murray eLearning will raise and manage that request with Highfield.',
    ],
    keywords: 'wrong name email spelling certificate change correction',
    priority: 'P3',
  },
];

const priorityRows = [
  { priority: 'P1', description: 'Critical issue causing inability to access or use the service, such as a widespread login failure or programme error.', response: '1 working hour', resolution: '4 working hours', backstop: '1 week' },
  { priority: 'P2', description: 'Many users or important functions are affected and a business function cannot continue.', response: '4 working hours', resolution: '2 working days', backstop: '2 weeks' },
  { priority: 'P3', description: 'A minor number of users or functions are affected. The service remains usable but with disruption.', response: '8 working hours', resolution: '2 weeks', backstop: '3 weeks' },
  { priority: 'P4', description: 'General questions, information requests and change requests. Change delivery remains subject to scoping and planning.', response: '2 working days', resolution: '1 week', backstop: '2 weeks' },
];

export function HelpCentrePage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const largeOrder = searchParams.get('topic') === 'large-order';
  const filtered = useMemo(() => {
    const normalised = query.trim().toLowerCase();
    if (!normalised) return helpArticles;
    return helpArticles.filter((article) => `${article.title} ${article.summary} ${article.keywords}`.toLowerCase().includes(normalised));
  }, [query]);

  return <main>
    <PageHero
      eyebrow="Sousa Murray eLearning Help Centre"
      title={largeOrder ? 'Arrange an order of 26 licences or more' : 'Troubleshoot common learner and course issues'}
      copy={largeOrder ? 'Large requirements are handled directly by Sousa Murray eLearning. Tell us the courses, quantities and learner arrangements required so we can prepare one coordinated order.' : 'Start with the guided checks below. Sousa Murray eLearning remains your first support contact and manages any escalation to Highfield on your behalf.'}
    />

    {largeOrder ? <section className="section"><div className="container large-order-help-card"><Users size={40} /><div><h2>Contact Sousa Murray eLearning before purchasing</h2><p>Public checkout is limited to 25 licences in total. Do not divide a larger requirement into several online orders. Include the organisation or purchaser name, course titles, licence quantities and preferred timeframe.</p><a className="button button-primary" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Sousa Murray eLearning large licence order')}`}>Email the large-order team</a></div></div></section> : <>
      <section className="section help-search-section"><div className="container">
        <label className="help-search-box"><Search size={21} /><span>Search the Help Centre</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="For example: password, certificate, course frozen" /></label>
        <div className="help-start-cards">
          <InfoTile icon={<Mail size={23} />} title="Waiting for course access" copy="Check the learner email and enrolment status before assuming the LMS account has failed." />
          <InfoTile icon={<Laptop size={23} />} title="Course or device problem" copy="Use the troubleshooting steps and record the device, browser, course and affected module." />
          <InfoTile icon={<Headphones size={23} />} title="Still need help?" copy="Contact Sousa Murray eLearning with the order reference and learner email. We will manage any provider escalation." />
        </div>
      </div></section>

      <section className="section section-muted"><div className="container help-article-layout">
        <div><div className="section-heading left"><span>Self-service guidance</span><h2>{filtered.length} help {filtered.length === 1 ? 'article' : 'articles'}</h2><p>These steps are adapted for Sousa Murray eLearning customers from the learner guidance used with the Highfield Learning Management System.</p></div>
          <div className="help-article-list">
            {filtered.length ? filtered.map((article) => <details className="help-article" key={article.id} id={article.id}>
              <summary><div className={`priority-badge ${article.priority.toLowerCase()}`}>{article.priority}</div><div><strong>{article.title}</strong><span>{article.summary}</span></div><HelpCircle size={20} /></summary>
              <div className="help-article-content"><ol>{article.steps.map((step) => <li key={step}>{step}</li>)}</ol><div className="help-contact-reminder"><Headphones size={19} /><p><strong>Contact Sousa Murray eLearning if the issue remains.</strong> Include screenshots and exact error wording where possible. Do not send passwords or full payment-card details.</p></div></div>
            </details>) : <div className="empty-help-results"><Search size={30} /><h3>No matching help article</h3><p>Try a shorter search, or contact Sousa Murray eLearning and describe the problem.</p></div>}
          </div>
        </div>
        <aside className="help-contact-card"><Headphones size={31} /><span>Sousa Murray eLearning first-line support</span><h2>Need us to investigate?</h2><p>Tell us the customer name, order reference, learner email, course title, device or browser and what happened immediately before the issue.</p><a className="button button-primary full-width" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Sousa Murray eLearning learner support')}`}>Email {CONTACT_EMAIL}</a><div><ShieldCheck size={18} /><span>You do not need to contact Highfield. Sousa Murray eLearning will manage any required escalation.</span></div></aside>
      </div></section>
    </>}

    <section className="section"><div className="container support-priority-section">
      <div className="section-heading left"><span>Support service levels</span><h2>How Sousa Murray eLearning prioritises support requests</h2><p>Sousa Murray eLearning assigns a priority using its reasonable assessment of severity, impact and the ability of customers or learners to continue using the service.</p></div>
      <div className="priority-table-wrap"><table className="priority-table"><thead><tr><th>Priority</th><th>Description</th><th>Target response</th><th>Target resolution</th><th>Back-stop</th></tr></thead><tbody>{priorityRows.map((row) => <tr key={row.priority}><td><span className={`priority-badge ${row.priority.toLowerCase()}`}>{row.priority}</span></td><td>{row.description}</td><td>{row.response}</td><td>{row.resolution}</td><td>{row.backstop}</td></tr>)}</tbody></table></div>
      <div className="priority-notes">
        <div><Clock3 size={20} /><p><strong>Working time.</strong> Targets are measured during Sousa Murray eLearning’s published support working hours. We will acknowledge, investigate and communicate proportionately to the assigned priority.</p></div>
        <div><RefreshCw size={20} /><p><strong>Back-stop time.</strong> This is the target period within which use should be restored or a reasonable workaround supplied. Some provider dependencies may require managed escalation.</p></div>
        <div><AlertTriangle size={20} /><p><strong>Priority may change.</strong> New evidence, the number of affected learners or the availability of a workaround may cause a request to be reclassified.</p></div>
      </div>
    </div></section>
  </main>;
}

export function RefundPolicyPage() {
  return <main>
    <PageHero eyebrow="Refunds and cancellation" title="How cancellation changes when digital course access begins" copy="Sousa Murray eLearning reviews refund requests fairly, but access to immediately supplied digital training changes the normal change-of-mind position." />
    <section className="section"><div className="container refund-layout">
      <article className="refund-main-card">
        <h2>Before course activation</h2>
        <p>Contact Sousa Murray eLearning as soon as possible if you made a mistake or no longer require a course. Where enrolment and digital access have not been activated, we will review cancellation and refund eligibility in line with the customer’s statutory rights, the order status and the applicable terms.</p>

        <h2>Once access is activated or learning starts</h2>
        <p>A change-of-mind refund is not available once Sousa Murray eLearning has arranged activation of the digital course or the learner has begun accessing the learning, where the customer expressly requested immediate supply and acknowledged that the cancellation right would be lost when supply began.</p>
        <div className="refund-callout"><FileCheck2 size={24} /><div><strong>Activation includes more than completing the course</strong><span>The restriction may apply once the learner’s course access has been created, issued or used—not only when the course is finished.</span></div></div>

        <h2>Faulty, misdescribed or improperly supplied content</h2>
        <p>Nothing in this policy removes legal rights where digital content or services are faulty, not as described, not supplied with reasonable care and skill, or otherwise fail to meet statutory requirements. Depending on the circumstances, Sousa Murray eLearning may investigate correction, re-performance, replacement access, a price reduction or another remedy required by law.</p>

        <h2>Duplicate purchases and incorrect learner details</h2>
        <p>Report duplicate payments, an incorrect course selection or incorrect learner information immediately. Do not begin the course while the request is under review. Sousa Murray eLearning will check the Stripe payment, order, enrolment and provider status before confirming the available options.</p>

        <h2>How to request a review</h2>
        <p>Email Sousa Murray eLearning with the order reference, purchaser name, learner email, course title, reason for the request and whether any LMS access email has been received or used. Do not send a password or full payment-card number.</p>
        <a className="button button-primary" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Sousa Murray eLearning refund review')}`}>Request a refund review</a>
      </article>
      <aside className="refund-side-card"><ShieldCheck size={30} /><h2>Your statutory rights remain protected</h2><p>The no-change-of-mind position after activation does not exclude remedies that the law requires for faulty, misdescribed or improperly supplied digital content or services.</p><ul><li><Check size={17} /> Contact Sousa Murray eLearning, not Highfield</li><li><Check size={17} /> Each request is checked against the actual order status</li><li><Check size={17} /> Provider-side evidence is obtained by Sousa Murray eLearning where needed</li><li><Check size={17} /> Complaints and escalation remain available</li></ul><Link to="/complaints">Read the complaints route <ArrowRight size={16} /></Link></aside>
    </div></section>
  </main>;
}
