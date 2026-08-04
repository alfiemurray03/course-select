import {
  ArrowRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleUserRound,
  Clock3,
  FileCheck2,
  FileSpreadsheet,
  GraduationCap,
  Headphones,
  Info,
  Laptop,
  LockKeyhole,
  Mail,
  ReceiptText,
  ShieldCheck,
  ShoppingBasket,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ONLINE_LICENCE_LIMIT } from './basket';

function PageHero({ eyebrow, title, copy, actions }: { eyebrow: string; title: string; copy: string; actions?: ReactNode }) {
  return <section className="page-hero service-page-hero"><div className="container service-hero-grid">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{copy}</p>{actions && <div className="button-row service-hero-actions">{actions}</div>}</div>
    <aside className="service-hero-assurance">
      <ShieldCheck size={28} />
      <div><strong>Aptenvo is your supplier and support contact</strong><span>Customers purchase from JA Group Services Ltd through Aptenvo. Highfield provides the course content and LMS used after enrolment.</span></div>
    </aside>
  </div></section>;
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <div className="section-heading left service-section-heading"><span>{eyebrow}</span><h2>{title}</h2><p>{copy}</p></div>;
}

function InfoCard({ icon, title, copy, children }: { icon: ReactNode; title: string; copy: string; children?: ReactNode }) {
  return <article className="service-info-card"><div className="service-card-icon">{icon}</div><h3>{title}</h3><p>{copy}</p>{children}</article>;
}

function Step({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <article className="service-journey-step"><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></article>;
}

function CheckList({ items }: { items: string[] }) {
  return <ul className="service-check-list">{items.map((item) => <li key={item}><Check size={18} /><span>{item}</span></li>)}</ul>;
}

function Faq({ question, children }: { question: string; children: ReactNode }) {
  return <details className="service-faq"><summary>{question}</summary><div>{children}</div></details>;
}

export function DetailedIndividualsPage() {
  return <main>
    <PageHero
      eyebrow="Aptenvo for individuals"
      title="Choose, purchase and start online training with a clear support route"
      copy="Aptenvo helps adults compare Highfield Online Training courses, purchase the right licence, provide enrolment details and receive support from one accountable customer-facing business."
      actions={<><Link className="button button-light" to="/courses">Explore the course catalogue <ArrowRight size={18} /></Link><Link className="button button-ghost" to="/contact?topic=course-information">Ask a course question</Link></>}
    />

    <section className="section"><div className="container">
      <SectionHeading eyebrow="Who the service is for" title="Adult learners purchasing for themselves or other adults" copy="The purchaser must be aged 18 or over. Every named learner must also meet any age, role, practical-training or qualification requirements stated on the relevant course page." />
      <div className="service-card-grid four">
        <InfoCard icon={<UserCheck size={24} />} title="18+ purchasing only" copy="Aptenvo does not accept purchases from, or sell training to, anybody under the age of 18. An adult declaration is required before using checkout." />
        <InfoCard icon={<BookOpen size={24} />} title="Clear course information" copy="Each course page explains the subject, intended audience, delivery method, certificate position and whether separate practical training or assessment may be required." />
        <InfoCard icon={<ShoppingBasket size={24} />} title="Several courses in one basket" copy={`Different courses can be combined and paid for together. Public online checkout supports up to ${ONLINE_LICENCE_LIMIT} licences in total.`} />
        <InfoCard icon={<Headphones size={24} />} title="Aptenvo support" copy="You contact Aptenvo for ordering, enrolment, access and course issues. We approach Highfield ourselves where provider assistance is required." />
      </div>
    </div></section>

    <section className="section section-muted"><div className="container">
      <SectionHeading eyebrow="The complete purchase journey" title="What happens from choosing a course to starting learning" copy="The payment receipt and LMS access email are separate. Aptenvo must validate and enrol the learner after a successful purchase before Highfield can issue access." />
      <div className="service-journey-list">
        <Step number="01" title="Compare the available courses" copy="Search by title, subject, level or course type. Read the overview, intended audience, learning outcomes, qualification notice and pricing before choosing." />
        <Step number="02" title="Choose the required licences" copy="One licence is required for each learner taking a course. A learner taking three different courses normally requires one licence for each of those three courses." />
        <Step number="03" title="Build the Aptenvo basket" copy="Add different courses, adjust quantities and review VAT-inclusive totals. The server verifies every price against Aptenvo’s live catalogue before payment begins." />
        <Step number="04" title="Provide customer and learner information" copy="Enter the purchaser’s legal details and the legal first name, legal last name and enrolment email for every learner licence. Multiple learners can be entered manually or supplied through an accepted learner-list document." />
        <Step number="05" title="Confirm digital supply and pay" copy="Request immediate enrolment and acknowledge the cancellation position, then complete secure payment through Stripe. Aptenvo records the paid order and learner allocation." />
        <Step number="06" title="Aptenvo checks and submits enrolment" copy="We check that payment, course quantities and learner details agree. Complete and valid learner information is then used to enrol the named adult onto the purchased course." />
        <Step number="07" title="Highfield emails LMS access" copy="Highfield sends the learner an email containing the information needed to enter its Learning Management System. This is separate from the Aptenvo order confirmation." />
        <Step number="08" title="The learner completes the course" copy="Learning is completed through the Highfield LMS. The learner should save progress, complete required modules and assessments, and obtain completion evidence where the course provides it." />
      </div>
    </div></section>

    <section className="section"><div className="container service-split-grid">
      <article className="service-long-card">
        <SectionHeading eyebrow="Choosing responsibly" title="Understand what you are buying" copy="Online training products do not all serve the same purpose. The course page should be read in full before purchase." />
        <div className="service-definition-list">
          <div><BookOpen size={22} /><span><strong>Full online course</strong><small>A structured course covering a wider subject area. It may support knowledge for a role or qualification but does not automatically award a regulated qualification.</small></span></div>
          <div><Clock3 size={22} /><span><strong>Short awareness course</strong><small>Focused knowledge or refresher learning. It does not replace workplace procedures, practical instruction or competent professional advice.</small></span></div>
          <div><FileCheck2 size={22} /><span><strong>Individual module</strong><small>One part of a broader subject. Completing a module does not mean the complete parent course or qualification has been achieved.</small></span></div>
          <div><Award size={22} /><span><strong>First-aid or role-related learning</strong><small>Online knowledge may need to be combined with practical training, observation or formal assessment before a person is competent or qualified.</small></span></div>
        </div>
      </article>
      <aside className="service-callout-card">
        <Info size={28} />
        <h2>Not sure which course is appropriate?</h2>
        <p>Tell Aptenvo what role, subject or outcome you are considering. We can explain the published course information, but we cannot decide an employer’s legal training needs or replace competent professional advice.</p>
        <Link className="button button-primary full-width" to="/contact?topic=course-information">Contact Aptenvo</Link>
      </aside>
    </div></section>

    <section className="section section-muted"><div className="container">
      <SectionHeading eyebrow="My Aptenvo" title="Save details and baskets for future purchases" copy="A My Aptenvo customer account reduces repeated data entry while keeping the customer relationship with JA Group Services Ltd." />
      <div className="service-card-grid three">
        <InfoCard icon={<CircleUserRound size={24} />} title="Reusable customer profile" copy="Save individual or business status, legal name, contact email and organisation details for later orders." />
        <InfoCard icon={<Users size={24} />} title="Saved learner directory" copy="Store frequently used adult learner names and enrolment emails, then reuse them when completing future baskets." />
        <InfoCard icon={<ShoppingBasket size={24} />} title="Saved training baskets" copy="Name and save a combination of courses, restore it later and review live prices before proceeding to payment." />
      </div>
      <div className="centre-action"><Link className="button button-primary" to="/account">Open My Aptenvo <ArrowRight size={18} /></Link></div>
    </div></section>

    <section className="section"><div className="container service-two-column-detail">
      <article className="service-long-card">
        <h2>Pricing, licence quantities and larger requirements</h2>
        <p>Prices shown to customers include VAT. Quantity pricing is calculated separately for each course rather than across unrelated products.</p>
        <CheckList items={[
          `A maximum of ${ONLINE_LICENCE_LIMIT} course licences may be purchased through one public online basket.`,
          `A requirement for ${ONLINE_LICENCE_LIMIT + 1} licences or more must be arranged directly with Aptenvo.`,
          'A larger requirement must not be divided into several smaller website orders to avoid the direct-order process.',
          'One licence must be purchased for every learner-course allocation.',
          'Aptenvo rechecks the current course price and quantity tier before creating Stripe Checkout.',
        ]} />
      </article>
      <article className="service-long-card">
        <h2>Activation, cancellation and refunds</h2>
        <p>Checkout asks the purchaser to request immediate digital supply. Once course access has been activated or learning has begun, a change-of-mind refund is not available where that immediate supply was expressly requested and acknowledged.</p>
        <CheckList items={[
          'Nothing is charged when Stripe Checkout is cancelled before payment.',
          'Contact Aptenvo promptly where learner information is incorrect or an order was placed in error.',
          'Statutory rights remain where digital content is faulty, misdescribed or improperly supplied.',
          'Refund decisions are made by Aptenvo as the seller and customer-facing business.',
        ]} />
        <Link className="service-inline-link" to="/refunds">Read the refund and cancellation policy <ArrowRight size={16} /></Link>
      </article>
    </div></section>

    <section className="section section-muted"><div className="container">
      <SectionHeading eyebrow="Questions for individual customers" title="Common things to understand before ordering" copy="These answers explain the Aptenvo purchase model. Course-specific rules remain on the relevant product page." />
      <div className="service-faq-list">
        <Faq question="Am I buying the course from Highfield?"><p>No. You buy from JA Group Services Ltd through Aptenvo. Highfield provides the course content and LMS used to fulfil the Aptenvo order.</p></Faq>
        <Faq question="Who do I contact when I need help?"><p>Contact Aptenvo first for every order, enrolment, access, technical or course issue. We investigate and manage any provider escalation.</p></Faq>
        <Faq question="Can I buy a course for another adult?"><p>Yes, provided you are authorised to give us that learner’s information and the named learner meets the course requirements. Enter the learner’s legal name and the email they will use for LMS enrolment.</p></Faq>
        <Faq question="Can two people share one course licence?"><p>No. A licence is allocated to one named learner for one course. Separate learners require separate licences.</p></Faq>
        <Faq question="Does completing an online course make me qualified?"><p>Not automatically. Some products provide awareness or underpinning knowledge only. Read the qualification notice on the course page to see whether practical training or separate assessment is required.</p></Faq>
        <Faq question="When will the learner receive access?"><p>Highfield sends access after Aptenvo has validated the paid order and completed enrolment. The exact timing depends on complete and accurate learner information and successful provider processing.</p></Faq>
      </div>
    </div></section>
  </main>;
}

export function DetailedOrganisationsPage() {
  return <main>
    <PageHero
      eyebrow="Aptenvo for organisations"
      title="Structured online course purchasing for teams and multiple learners"
      copy="Businesses, charities and other organisations can combine courses, allocate named adult learners, reuse customer information and keep Aptenvo as the single customer-facing support route."
      actions={<><Link className="button button-light" to="/courses">Explore available training <ArrowRight size={18} /></Link><Link className="button button-ghost" to="/contact?topic=large-order">Discuss a larger order</Link></>}
    />

    <section className="section"><div className="container">
      <SectionHeading eyebrow="Two order routes" title="Online checkout for up to 25 licences; direct handling above that limit" copy="The route is based on the total number of learner-course licences required, not simply the number of different courses in the basket." />
      <div className="organisation-route-grid">
        <article className="organisation-route-card online"><ShoppingBasket size={29} /><span>Public online checkout</span><h2>1–{ONLINE_LICENCE_LIMIT} licences</h2><p>Choose courses, enter or upload the learner list, pay through Stripe and place the complete requirement as one Aptenvo order.</p><CheckList items={['Different courses may be combined', 'Manual learner entry or accepted file upload', 'VAT-inclusive totals shown before payment', 'Paid order enters Aptenvo’s enrolment queue']} /><Link className="button button-primary full-width" to="/courses">Build an online basket</Link></article>
        <article className="organisation-route-card direct"><BriefcaseBusiness size={29} /><span>Direct Aptenvo order</span><h2>{ONLINE_LICENCE_LIMIT + 1}+ licences</h2><p>Contact Aptenvo before purchasing. We will confirm the course mix, learner volume, information format and direct-order arrangements.</p><CheckList items={['Do not split the requirement across online orders', 'Course and learner quantities confirmed together', 'Aptenvo coordinates enrolment arrangements', 'Customer support remains with Aptenvo']} /><Link className="button button-secondary full-width" to="/contact?topic=large-order">Request a larger-order discussion</Link></article>
      </div>
    </div></section>

    <section className="section section-muted"><div className="container">
      <SectionHeading eyebrow="Roles and responsibilities" title="Separate the purchaser, organisational contact and each learner" copy="Accurate role separation prevents the wrong person being enrolled or receiving LMS access." />
      <div className="service-card-grid three">
        <InfoCard icon={<Building2 size={24} />} title="Organisation/customer" copy="The organisation is the Aptenvo customer where the purchase is made for business use. Its name may be stored against the customer profile and order." />
        <InfoCard icon={<UserCheck size={24} />} title="Authorised purchaser or contact" copy="The person placing the order provides their legal name and contact email, confirms authority and acts as Aptenvo’s first contact for the order." />
        <InfoCard icon={<GraduationCap size={24} />} title="Named learner" copy="Every licence is allocated to an adult learner using that learner’s legal first name, legal last name and LMS enrolment email." />
      </div>
    </div></section>

    <section className="section"><div className="container service-split-grid">
      <article className="service-long-card">
        <SectionHeading eyebrow="Learner information" title="Enter each learner or upload an organised learner list" copy="The number of complete learner records must agree with the licence quantity purchased for each course." />
        <div className="organisation-method-grid">
          <div><Users size={25} /><h3>Manual entry</h3><p>The basket creates one learner row for each course licence. Enter the legal name and email for every row, including the same learner again where that person is taking several courses.</p></div>
          <div><FileSpreadsheet size={25} /><h3>Spreadsheet upload</h3><p>Use CSV, XLS or XLSX where several learner-course assignments need to be supplied in a structured list. Clearly identify the course and learner details for every allocation.</p></div>
          <div><Upload size={25} /><h3>PDF upload</h3><p>A PDF may be accepted where it presents the complete list clearly. The document must remain readable and contain the required legal names, enrolment emails and course allocations.</p></div>
        </div>
        <div className="service-warning"><Info size={20} /><p><strong>Authority is required.</strong> The purchaser must be authorised to provide every learner’s personal information and must confirm that the necessary details may be shared with Highfield solely for enrolment, LMS access and course delivery.</p></div>
      </article>
      <aside className="service-callout-card">
        <LockKeyhole size={28} />
        <h2>Private document handling</h2>
        <p>Uploaded learner files are stored in Aptenvo’s private Cloudflare R2 storage and linked to the order. They do not receive a public website URL.</p>
        <p>Do not include passwords, payment-card information, health data or information that is not required for enrolment.</p>
        <Link className="service-inline-link" to="/privacy">Read the privacy notice <ArrowRight size={16} /></Link>
      </aside>
    </div></section>

    <section className="section section-muted"><div className="container">
      <SectionHeading eyebrow="Organisation workflow" title="From internal training decision to learner access" copy="Aptenvo’s role is to make the purchasing and enrolment process traceable while Highfield supplies the LMS course delivery." />
      <div className="service-journey-list compact">
        <Step number="01" title="Define the training requirement" copy="Identify the course, adult learners, licence quantities and whether the product meets the organisation’s training objective. Employers remain responsible for determining their legal and role-specific training requirements." />
        <Step number="02" title="Select online or direct ordering" copy={`Use public checkout only where the complete requirement is ${ONLINE_LICENCE_LIMIT} licences or fewer. Contact Aptenvo for ${ONLINE_LICENCE_LIMIT + 1} or more.`} />
        <Step number="03" title="Prepare accurate learner data" copy="Confirm legal names and the individual email address each learner will use for Highfield LMS access. Check spelling before submitting." />
        <Step number="04" title="Complete one Aptenvo order" copy="Review the basket, VAT, declarations and learner allocations, then complete secure payment or the agreed direct-order arrangement." />
        <Step number="05" title="Aptenvo validates fulfilment data" copy="We check payment and learner-course quantities, identify missing information and place complete paid allocations into the enrolment workflow." />
        <Step number="06" title="Learners receive Highfield access" copy="After enrolment, Highfield emails each learner with LMS access instructions. The organisation and learners continue to contact Aptenvo for support." />
      </div>
    </div></section>

    <section className="section"><div className="container service-two-column-detail">
      <article className="service-long-card">
        <h2>My Aptenvo for repeat purchasing</h2>
        <p>A customer account can reduce repeated administration for organisations that purchase training more than once.</p>
        <CheckList items={[
          'Save the organisation and authorised-contact profile.',
          'Maintain a reusable directory of adult learners and enrolment emails.',
          'Save named baskets containing a preferred combination of courses.',
          'Restore a basket later and review current pricing before payment.',
          'Keep saved customer information within the Aptenvo account rather than the Highfield learner platform.',
        ]} />
        <Link className="button button-primary" to="/account">Open My Aptenvo</Link>
      </article>
      <article className="service-long-card">
        <h2>What the organisation should retain</h2>
        <p>Aptenvo provides the online purchasing and enrolment route, but the organisation remains responsible for its own training governance.</p>
        <CheckList items={[
          'Evidence explaining why the selected course is suitable for the role or risk.',
          'Internal authorisation for the purchase and provision of learner data.',
          'Any practical training, workplace observation or competency sign-off required in addition to online learning.',
          'Completion evidence and renewal dates required by the organisation’s own policy.',
          'A process for reporting leavers, incorrect learner data or access no longer required.',
        ]} />
      </article>
    </div></section>

    <section className="section section-muted"><div className="container">
      <SectionHeading eyebrow="Support and service management" title="Aptenvo owns the customer support relationship" copy="The organisation does not need to identify or contact a separate Highfield team. Aptenvo investigates first and manages provider escalation where necessary." />
      <div className="service-card-grid four">
        <InfoCard icon={<ReceiptText size={24} />} title="Order and billing" copy="Questions about the Aptenvo order, Stripe payment, invoice information, quantities or customer record are handled by Aptenvo." />
        <InfoCard icon={<GraduationCap size={24} />} title="Enrolment" copy="Aptenvo checks whether the learner data was complete, whether the allocation was submitted and whether corrections are required." />
        <InfoCard icon={<Laptop size={24} />} title="LMS access or technical issue" copy="Aptenvo gathers the evidence, provides first-line troubleshooting and raises the provider-side issue with Highfield if it cannot be resolved directly." />
        <InfoCard icon={<Headphones size={24} />} title="Priority assessment" copy="Support is assigned P1–P4 based on impact, severity, number of users affected and availability of a workaround—not simply the priority selected by the reporter." />
      </div>
      <div className="centre-action"><Link className="button button-primary" to="/support">Open the Aptenvo Help Centre <ArrowRight size={18} /></Link></div>
    </div></section>

    <section className="section"><div className="container">
      <SectionHeading eyebrow="Organisation FAQs" title="Important points for training coordinators and purchasers" copy="These answers describe the current Aptenvo service model and public online-order limits." />
      <div className="service-faq-list">
        <Faq question="Can an organisation purchase more than 25 licences online by placing several orders?"><p>No. A requirement of 26 licences or more must be handled directly by Aptenvo and must not be broken into smaller public website orders.</p></Faq>
        <Faq question="Can we use one shared email address for every learner?"><p>Each learner should normally have the email they will use for LMS access. Shared addresses can create identity, access and completion-record problems and should not be used unless Aptenvo has confirmed the provider arrangement.</p></Faq>
        <Faq question="Does Aptenvo provide our organisation with its own LMS?"><p>No. Purchased courses are delivered through Highfield’s LMS. My Aptenvo stores customer, learner and basket information for purchasing; it is not a replacement corporate learning-management platform.</p></Faq>
        <Faq question="Can the authorised purchaser also be a learner?"><p>Yes. The purchaser’s saved details may be reused for a learner allocation where that person is taking the course and the legal details and enrolment email are correct.</p></Faq>
        <Faq question="Who is responsible for deciding whether training is legally sufficient?"><p>The organisation remains responsible for assessing its legal, regulatory and workplace requirements. Aptenvo provides the published course information and purchasing route but does not replace competent risk, compliance or professional advice.</p></Faq>
        <Faq question="What happens when learner information is incomplete?"><p>Aptenvo cannot complete the affected enrolment until the required legal name, enrolment email and course allocation are clear. The order may remain awaiting learner information while Aptenvo contacts the authorised purchaser.</p></Faq>
      </div>
    </div></section>
  </main>;
}

export function DetailedDeliveryPage() {
  return <main>
    <PageHero
      eyebrow="How courses are delivered"
      title="Aptenvo manages the customer journey; Highfield provides the learning platform"
      copy="The service has two clearly separated roles. JA Group Services Ltd through Aptenvo sells, administers and supports the order. Highfield supplies the course content and Learning Management System used by enrolled learners."
      actions={<><Link className="button button-light" to="/courses">Choose a course <ArrowRight size={18} /></Link><Link className="button button-ghost" to="/support">Learner Help Centre</Link></>}
    />

    <section className="section"><div className="container">
      <SectionHeading eyebrow="Who does what" title="One customer relationship, two operational roles" copy="Highfield’s involvement in course delivery does not make the purchaser or learner a Highfield customer for the Aptenvo order." />
      <div className="delivery-responsibility-grid">
        <article className="delivery-party-card aptenvo"><Building2 size={30} /><span>Your supplier and customer contact</span><h2>JA Group Services Ltd — Aptenvo</h2><CheckList items={['Publishes the Aptenvo course catalogue and customer information', 'Calculates Aptenvo prices and takes payment', 'Creates the customer and order record', 'Collects and checks learner enrolment details', 'Submits learner enrolment for the purchased course', 'Provides first-line customer and learner support', 'Handles complaints, refunds and provider escalation']} /></article>
        <article className="delivery-party-card highfield"><Award size={30} /><span>Course provider and LMS operator</span><h2>Highfield Online Training</h2><CheckList items={['Supplies the online course content', 'Hosts learning within the Highfield LMS', 'Creates provider-side learner access after enrolment', 'Emails LMS access instructions to the enrolled learner', 'Records course progress and provider assessments', 'Makes completion evidence available where applicable', 'Assists Aptenvo with escalated provider-side issues']} /></article>
      </div>
      <div className="delivery-relationship-note"><ShieldCheck size={23} /><div><strong>Customers contact Aptenvo—not Highfield.</strong><span>Aptenvo checks the order, learner record and common access issues first. Where specialist provider action is needed, we raise and manage it with Highfield on the customer’s behalf.</span></div></div>
    </div></section>

    <section className="section section-muted"><div className="container">
      <SectionHeading eyebrow="The delivery timeline" title="What happens after secure payment" copy="Course access is not generated by Stripe. It follows Aptenvo’s paid-order validation and learner-enrolment process." />
      <div className="delivery-timeline">
        <Step number="01" title="Stripe confirms payment" copy="Stripe redirects the customer to Aptenvo and sends a signed webhook. Aptenvo marks the order paid only after verifying the provider event." />
        <Step number="02" title="The order enters the enrolment queue" copy="Each paid course item and learner allocation is queued. Orders with missing or unclear learner information remain awaiting details rather than being enrolled incorrectly." />
        <Step number="03" title="Aptenvo checks the learner-course allocation" copy="We confirm the legal name, enrolment email, course title and quantity. Uploaded learner lists are reviewed against the purchased licences." />
        <Step number="04" title="Aptenvo enrols the learner" copy="The minimum information needed for course fulfilment is provided to Highfield and linked to the purchased course." />
        <Step number="05" title="Highfield sends the access email" copy="The learner receives provider instructions for entering the Highfield LMS. The sender and appearance differ from the earlier Aptenvo order confirmation." />
        <Step number="06" title="Learning starts in the LMS" copy="The learner follows the course sequence, completes required interactions or assessments and saves progress before leaving." />
        <Step number="07" title="Completion evidence becomes available" copy="Where the product includes a provider completion certificate or evidence, it becomes available after the stated completion requirements are met." />
      </div>
    </div></section>

    <section className="section"><div className="container service-two-column-detail">
      <article className="service-long-card">
        <h2>The emails a customer or learner may receive</h2>
        <div className="delivery-email-list">
          <div><Mail size={22} /><span><strong>Aptenvo order or payment confirmation</strong><small>Confirms the customer transaction and Aptenvo order. It is not the LMS login email.</small></span></div>
          <div><GraduationCap size={22} /><span><strong>Highfield learner access email</strong><small>Sent after enrolment to the learner email supplied for the allocation. It contains the provider access route or credentials.</small></span></div>
          <div><Headphones size={22} /><span><strong>Aptenvo support communication</strong><small>Used where information is missing, a correction is required or the customer has asked Aptenvo for assistance.</small></span></div>
        </div>
        <div className="service-warning"><Info size={20} /><p>A learner who has a payment receipt but no Highfield access email should check spam and junk folders, confirm the enrolment email with the purchaser and then contact Aptenvo.</p></div>
      </article>
      <article className="service-long-card">
        <h2>Preparing the learner’s device</h2>
        <CheckList items={[
          'Use an up-to-date mainstream web browser and a stable internet connection.',
          'Allow the course page to load fully before moving between modules.',
          'Complete required audio, animations, interactions and knowledge checks.',
          'Use the course save-and-exit route where available before closing the browser.',
          'Avoid sharing login details or using another learner’s account.',
          'Record screenshots, course title, module and browser details when reporting a technical problem.',
        ]} />
        <Link className="service-inline-link" to="/support">View self-troubleshooting guidance <ArrowRight size={16} /></Link>
      </article>
    </div></section>

    <section className="section section-muted"><div className="container">
      <SectionHeading eyebrow="Progress, assessment and certificates" title="Completion depends on the requirements of the specific course" copy="A course may require all modules, interactions and assessments to be completed before the final status or certificate becomes available." />
      <div className="service-card-grid four">
        <InfoCard icon={<BookOpen size={24} />} title="Course modules" copy="Pages or modules may need to be completed in sequence. A next button or assessment can remain locked while required content is incomplete." />
        <InfoCard icon={<FileCheck2 size={24} />} title="Knowledge checks and assessments" copy="Some products include questions or a final assessment. The product page explains whether separate formal assessment is still needed for a regulated qualification." />
        <InfoCard icon={<Award size={24} />} title="Completion evidence" copy="Where offered, a Highfield completion certificate is normally available only after the provider’s completion conditions are satisfied." />
        <InfoCard icon={<BriefcaseBusiness size={24} />} title="Workplace competence" copy="Online completion does not replace practical instruction, observation, employer sign-off or professional competence requirements where those are necessary." />
      </div>
    </div></section>

    <section className="section"><div className="container service-split-grid">
      <article className="service-long-card">
        <SectionHeading eyebrow="Personal information" title="Why learner data is shared with Highfield" copy="Aptenvo cannot create provider access without identifying the learner and the course licence being fulfilled." />
        <CheckList items={[
          'Aptenvo collects the learner’s legal first name, legal last name and enrolment email.',
          'The purchaser confirms authority to provide the information of every learner included in the order.',
          'The necessary details are shared with Highfield solely for enrolment, LMS access, course delivery and related support.',
          'Uploaded learner documents remain in private Aptenvo storage and are not published.',
          'The customer relationship, support route and complaint handling remain with Aptenvo.',
        ]} />
        <Link className="service-inline-link" to="/privacy">Read the Aptenvo privacy notice <ArrowRight size={16} /></Link>
      </article>
      <aside className="service-callout-card">
        <FileCheck2 size={28} />
        <h2>Activation affects cancellation</h2>
        <p>The purchaser requests immediate digital supply before checkout. Once access is activated or learning begins, change-of-mind cancellation is not available where that position was expressly acknowledged.</p>
        <p>Statutory rights for faulty, misdescribed or improperly supplied digital content remain unaffected.</p>
        <Link className="button button-primary full-width" to="/refunds">Read the refund policy</Link>
      </aside>
    </div></section>

    <section className="section section-muted"><div className="container">
      <SectionHeading eyebrow="Support escalation" title="Aptenvo investigates before involving Highfield" copy="This keeps the customer from being passed between organisations and gives the provider a clear evidence-based escalation where one is needed." />
      <div className="support-escalation-flow">
        <div><span>1</span><strong>Customer contacts Aptenvo</strong><small>Provide the order reference, learner email, course and a clear description.</small></div>
        <ArrowRight size={22} />
        <div><span>2</span><strong>Aptenvo performs first-line checks</strong><small>We review the order, enrolment status, learner data and self-troubleshooting evidence.</small></div>
        <ArrowRight size={22} />
        <div><span>3</span><strong>Aptenvo resolves or escalates</strong><small>Provider-side matters are raised with Highfield using the evidence gathered.</small></div>
        <ArrowRight size={22} />
        <div><span>4</span><strong>Aptenvo updates the customer</strong><small>We remain the customer-facing contact and communicate the outcome or workaround.</small></div>
      </div>
      <div className="centre-action"><Link className="button button-primary" to="/contact?topic=access-support">Contact Aptenvo about access <ArrowRight size={18} /></Link></div>
    </div></section>

    <section className="section"><div className="container">
      <SectionHeading eyebrow="Delivery FAQs" title="Common questions about enrolment and LMS access" copy="The Help Centre contains step-by-step troubleshooting for individual technical issues." />
      <div className="service-faq-list">
        <Faq question="Why does the LMS email come from Highfield?"><p>Highfield operates the platform where the course is delivered, so it issues the learner-access instructions. Aptenvo remains the seller and customer support contact.</p></Faq>
        <Faq question="Can Aptenvo see or change my LMS password?"><p>No customer should send a password to Aptenvo. Use the provider password-recovery route. Aptenvo can check the enrolment record and manage an escalation if recovery does not work.</p></Faq>
        <Faq question="Can I change the named learner after activation?"><p>Contact Aptenvo immediately. Whether a change is possible depends on provider status, whether access has been activated and whether learning has started. Do not transfer or share the existing login.</p></Faq>
        <Faq question="What should I do when a module or assessment is locked?"><p>Check that every earlier page, activity and knowledge check is complete. Refresh the learner dashboard and then contact Aptenvo with screenshots if the item remains locked.</p></Faq>
        <Faq question="Where do I obtain a certificate?"><p>After all provider completion requirements are met, return to the completed course record in the LMS and use the available certificate option. Contact Aptenvo where a completed course has no expected evidence.</p></Faq>
        <Faq question="Do I need to contact Highfield during an incident?"><p>No. Contact Aptenvo. We gather the required information and approach Highfield ourselves when specialist provider action is necessary.</p></Faq>
      </div>
    </div></section>
  </main>;
}
