import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  Check,
  Clock3,
  GraduationCap,
  Headphones,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ONLINE_LICENCE_LIMIT } from './basket';
import { catalogue } from './catalogue';
import './home-refresh.css';

const ENROLMENT_TARGET = '3–5 business working days';

const pathways = [
  {
    icon: UserRound,
    title: 'Learning for yourself',
    copy: 'Compare adult online courses, understand who each course is for and purchase one or several courses through a single Aptenvo basket.',
    href: '/individuals',
    action: 'Explore individual learning',
  },
  {
    icon: Building2,
    title: 'Training for your organisation',
    copy: 'Allocate named adult learners, upload an organised learner list and manage up to 25 licences online. Larger requirements are handled directly.',
    href: '/organisations',
    action: 'Explore organisation training',
  },
  {
    icon: Headphones,
    title: 'Guidance before you purchase',
    copy: 'Not sure what a course covers or how enrolment works? Aptenvo explains the published information and remains your first-line contact.',
    href: '/contact?topic=course-information',
    action: 'Ask Aptenvo',
  },
];

const learningNeeds = [
  ['Food safety and hygiene', 'Food hygiene, allergens, HACCP and safer food-handling knowledge.', 'Food Safety and Hygiene'],
  ['Health and safety', 'Workplace safety, fire awareness, manual handling and risk knowledge.', 'Health and Safety'],
  ['Health and social care', 'Care standards, safeguarding, infection control and person-centred learning.', 'Health and Social Care'],
  ['Business compliance', 'Data protection, fraud prevention and responsible workplace practices.', 'Business Compliance'],
  ['Mental health and wellbeing', 'Awareness, supportive responses and healthier workplace understanding.', 'Mental Health and Wellbeing'],
  ['Construction and specialist safety', 'Focused knowledge for higher-risk workplaces and specialist duties.', 'Construction Safety'],
] as const;

function TrustPoint({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <article className="home-trust-point">{icon}<div><strong>{title}</strong><span>{copy}</span></div></article>;
}

export default function AptenvoHomePage() {
  return <main className="refreshed-home">
    <section className="home-hero-redesign">
      <div className="home-hero-orb home-hero-orb-one" /><div className="home-hero-orb home-hero-orb-two" />
      <div className="container home-hero-redesign-grid">
        <div className="home-hero-main-copy">
          <div className="eyebrow"><Sparkles size={16} /> Adult online learning, sold and supported by Aptenvo</div>
          <h1>Build knowledge that helps you move forward.</h1>
          <p className="home-hero-lead">Choose from {catalogue.length} Highfield Online Training courses available through JA Group Services Ltd. Aptenvo handles your purchase, learner information, enrolment and first-line support from one clear place.</p>
          <div className="button-row home-primary-actions">
            <Link className="button button-light" to="/courses">Find your course <ArrowRight size={18} /></Link>
            <Link className="button button-ghost" to="/organisations">Train your team</Link>
          </div>
          <div className="home-hero-assurances">
            <span><Check size={16} /> 18+ customers and learners</span>
            <span><Check size={16} /> VAT-inclusive prices</span>
            <span><Check size={16} /> Aptenvo first-line support</span>
          </div>
        </div>

        <aside className="home-outcome-panel">
          <span className="home-panel-label">A clear route from payment to learning</span>
          <h2>Purchase through Aptenvo. Complete your course through Highfield.</h2>
          <div className="home-panel-timeline">
            <div><i>1</i><span><strong>Choose and pay</strong><small>Build one secure Aptenvo basket.</small></span></div>
            <div><i>2</i><span><strong>We validate the details</strong><small>Payment, course and learner information are checked.</small></span></div>
            <div><i>3</i><span><strong>Aptenvo enrols the learner</strong><small>Our target is {ENROLMENT_TARGET}.</small></span></div>
            <div><i>4</i><span><strong>Highfield sends LMS access</strong><small>The named learner receives the course-access email.</small></span></div>
          </div>
          <div className="home-panel-note"><Clock3 size={19} /><p>For this target, Sundays and UK public bank holidays do not count, including Christmas and New Year public bank holidays and substitute days. Complete and accurate learner information is required.</p></div>
        </aside>
      </div>
    </section>

    <section className="home-trust-strip"><div className="container home-trust-strip-grid">
      <TrustPoint icon={<ShieldCheck size={24} />} title="Your supplier" copy="JA Group Services Ltd through Aptenvo" />
      <TrustPoint icon={<Award size={24} />} title="Course provider" copy="Highfield Online Training" />
      <TrustPoint icon={<ShoppingBasket size={24} />} title="Online order limit" copy={`Up to ${ONLINE_LICENCE_LIMIT} learner-course licences`} />
      <TrustPoint icon={<Headphones size={24} />} title="Support route" copy="Customers contact Aptenvo first" />
    </div></section>

    <section className="section"><div className="container">
      <div className="section-heading"><span>Start with what you need</span><h2>Choose the route that fits your learning goal</h2><p>Aptenvo is designed for adults buying for themselves, authorised organisation contacts arranging team learning and customers who need a clear answer before ordering.</p></div>
      <div className="home-pathway-grid">{pathways.map(({ icon: Icon, title, copy, href, action }) => <article key={title} className="home-pathway-card"><div className="home-pathway-icon"><Icon size={27} /></div><h3>{title}</h3><p>{copy}</p><Link to={href}>{action} <ArrowRight size={16} /></Link></article>)}</div>
    </div></section>

    <section className="section section-muted"><div className="container home-needs-layout">
      <div className="home-needs-introduction">
        <span className="eyebrow blue">Explore by purpose</span>
        <h2>Practical subjects for safer, more confident workplaces and services</h2>
        <p>Choose the subject that matters to you, then compare the courses, audiences and learning outcomes available in that area.</p>
        <Link className="button button-primary" to="/courses">Explore the complete catalogue <ArrowRight size={18} /></Link>
      </div>
      <div className="home-needs-grid">{learningNeeds.map(([title, copy, category]) => <Link key={title} to={`/courses?category=${encodeURIComponent(category)}`}><BookOpen size={22} /><span><strong>{title}</strong><small>{copy}</small></span><ArrowRight size={17} /></Link>)}</div>
    </div></section>

    <section className="section"><div className="container">
      <div className="section-heading"><span>Why customers choose Aptenvo</span><h2>More than a payment page</h2><p>Your order is supported by a defined customer relationship, structured learner-data collection and a managed route into the Highfield LMS.</p></div>
      <div className="home-benefit-grid">
        <article><GraduationCap size={27} /><h3>Course information before purchase</h3><p>Every course page explains what the learning covers, who it is intended for, the likely certificate position and where practical training or separate assessment may still be needed.</p></article>
        <article><Users size={27} /><h3>Built for one or several learners</h3><p>Enter learner details against each licence or upload an accepted spreadsheet or PDF. My Aptenvo can store reusable customer details, learners and baskets after secure sign-in.</p></article>
        <article><LockKeyhole size={27} /><h3>Secure purchasing and account access</h3><p>Stripe handles card payments. JA Group Services ID, using Microsoft Entra External ID, provides the customer sign-in foundation for My Aptenvo.</p></article>
        <article><HeartHandshake size={27} /><h3>One accountable support contact</h3><p>Customers contact Aptenvo for ordering, enrolment, access and course issues. Where Highfield assistance is required, Aptenvo manages the escalation.</p></article>
      </div>
    </div></section>

    <section className="section section-muted"><div className="container home-process-block">
      <div className="home-process-heading"><span className="eyebrow blue">What to expect</span><h2>A managed journey into online learning</h2><p>Successful payment starts the order process. It does not instantly create LMS access because the named learner details must first be checked and enrolled correctly.</p></div>
      <div className="home-process-steps">
        <article><span>01</span><div><h3>Select the right course</h3><p>Review the course purpose, audience, outcomes, licence price and qualification notice.</p></div></article>
        <article><span>02</span><div><h3>Provide complete learner details</h3><p>Supply each learner’s legal first name, legal last name and intended LMS email address.</p></div></article>
        <article><span>03</span><div><h3>Pay securely through Stripe</h3><p>Aptenvo records the paid order and places it into the enrolment workflow.</p></div></article>
        <article><span>04</span><div><h3>Allow {ENROLMENT_TARGET}</h3><p>Our target begins once payment and all required learner information are complete and valid.</p></div></article>
        <article><span>05</span><div><h3>Receive Highfield LMS access</h3><p>Highfield emails the enrolled learner. Aptenvo remains the customer’s support contact.</p></div></article>
      </div>
    </div></section>

    <section className="section"><div className="container home-closing-cta">
      <div><span className="eyebrow">Ready to begin?</span><h2>Find training that matches your next step.</h2><p>Explore the full course catalogue, compare the details and build an Aptenvo basket when you are ready.</p></div>
      <div className="button-row"><Link className="button button-light" to="/courses">Find a course <ArrowRight size={18} /></Link><Link className="button button-ghost" to="/contact">Contact Aptenvo</Link></div>
    </div></section>
  </main>;
}
