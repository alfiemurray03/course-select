import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  FileCheck2,
  Fingerprint,
  LockKeyhole,
  Printer,
  ReceiptText,
  Scale,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './legal-policies.css';

const EFFECTIVE_DATE = '4 August 2026';
const VERSION = '1.0';
const COMPANY_NAME = 'JA Group Services Ltd';
const REGISTERED_OFFICE = '167–169 Great Portland Street, 5th Floor, London, W1W 5PF';
const CONTACT_EMAIL = 'contact@jagroupservices.co.uk';

function PolicySection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section className="policy-section" id={id}><h2>{title}</h2>{children}</section>;
}

function PolicyList({ items }: { items: ReactNode[] }) {
  return <ul className="policy-list">{items.map((item, index) => <li key={index}><Check size={17} /><span>{item}</span></li>)}</ul>;
}

function PolicyNavigation({ active }: { active: 'terms' | 'privacy' | 'refunds' | 'acceptable-use' }) {
  const items = [
    ['terms', '/terms', 'Terms of Use'],
    ['privacy', '/privacy', 'Privacy Policy'],
    ['refunds', '/refunds', 'Refunds Policy'],
    ['acceptable-use', '/acceptable-use', 'Acceptable Use Policy'],
  ] as const;

  return <nav className="policy-suite-nav" aria-label="Sousa Murray eLearning legal policies">
    {items.map(([key, href, label]) => <Link className={active === key ? 'active' : ''} to={href} key={key}>{label}</Link>)}
  </nav>;
}

function PolicyPage({
  active,
  eyebrow,
  title,
  summary,
  icon,
  contents,
  children,
}: {
  active: 'terms' | 'privacy' | 'refunds' | 'acceptable-use';
  eyebrow: string;
  title: string;
  summary: string;
  icon: ReactNode;
  contents: Array<[string, string]>;
  children: ReactNode;
}) {
  return <main className="policy-page">
    <section className="page-hero policy-hero"><div className="container policy-hero-grid">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{summary}</p></div>
      <aside className="policy-version-card">{icon}<div><span>Effective date</span><strong>{EFFECTIVE_DATE}</strong><small>Version {VERSION}</small></div></aside>
    </div></section>

    <section className="policy-navigation-section"><div className="container"><PolicyNavigation active={active} /></div></section>

    <section className="section policy-main-section"><div className="container policy-layout">
      <aside className="policy-toc-card">
        <span>On this page</span>
        <nav>{contents.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav>
        <button type="button" onClick={() => window.print()}><Printer size={17} /> Print or save as PDF</button>
        <div className="policy-company-summary"><Building2 size={20} /><span><strong>{COMPANY_NAME}</strong><small>Company number 16314179<br />ICO registration ZB877370</small></span></div>
      </aside>
      <article className="policy-document">
        <div className="policy-introduction-note"><ShieldCheck size={22} /><p>Sousa Murray eLearning is a trading division of {COMPANY_NAME}. It is not a separate legal entity. References to “Sousa Murray eLearning”, “we”, “us” or “our” mean {COMPANY_NAME} unless the context says otherwise.</p></div>
        {children}
        <section className="policy-contact-panel">
          <h2>Contact Sousa Murray eLearning</h2>
          <p>Questions about this policy should be submitted through the Sousa Murray eLearning contact page or sent to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
          <p><strong>Registered office:</strong> {REGISTERED_OFFICE}</p>
          <Link className="button button-primary" to="/contact">Contact Sousa Murray eLearning <ArrowRight size={17} /></Link>
        </section>
      </article>
    </div></section>
  </main>;
}

export function TermsOfUsePage() {
  const contents: Array<[string, string]> = [
    ['scope', 'Scope and acceptance'], ['operator', 'Who operates Sousa Murray eLearning'], ['eligibility', 'Eligibility and 18+ rule'],
    ['roles', 'Sousa Murray eLearning and Highfield roles'], ['accounts', 'My Sousa Murray eLearning and JA Group Services ID'], ['orders', 'Orders and contract formation'],
    ['pricing', 'Pricing and payment'], ['licences', 'Licences and larger orders'], ['learners', 'Learner information'],
    ['delivery', 'Enrolment and delivery'], ['course-use', 'Use of courses'], ['technical', 'Technical requirements'],
    ['support', 'Support and service targets'], ['cancellation', 'Cancellation and refunds'], ['acceptable-use', 'Acceptable use'],
    ['intellectual-property', 'Intellectual property'], ['availability', 'Availability and changes'], ['liability', 'Liability'],
    ['suspension', 'Suspension and termination'], ['communications', 'Communications'], ['complaints', 'Complaints'],
    ['law', 'Governing law'], ['changes', 'Changes to these terms'],
  ];

  return <PolicyPage
    active="terms"
    eyebrow="Legal terms"
    title="Sousa Murray eLearning Terms of Use"
    summary="These terms govern use of the Sousa Murray eLearning website, My Sousa Murray eLearning, JA Group Services ID, ordering, learner enrolment and the online-training services supplied through Sousa Murray eLearning."
    icon={<Scale size={29} />}
    contents={contents}
  >
    <PolicySection id="scope" title="1. Scope and acceptance">
      <p>These Terms of Use apply when you browse Sousa Murray eLearning, create or use a customer account, save information, submit an enquiry, place an order, provide learner details, upload a learner list, or use any related Sousa Murray eLearning feature.</p>
      <p>By using Sousa Murray eLearning, you agree to these terms, the <Link to="/privacy">Privacy Policy</Link>, the <Link to="/refunds">Refunds Policy</Link> and the <Link to="/acceptable-use">Acceptable Use Policy</Link>. Additional written terms may apply to a direct organisation order, quotation or separately agreed service. Where additional signed terms conflict with these terms, the signed terms take priority for that order.</p>
      <p>Nothing in these terms removes rights that cannot lawfully be excluded, including mandatory consumer rights.</p>
    </PolicySection>

    <PolicySection id="operator" title="2. Who operates Sousa Murray eLearning">
      <p>Sousa Murray eLearning is operated by {COMPANY_NAME}, a private limited company registered in England and Wales under company number 16314179. Our registered office is {REGISTERED_OFFICE}. Our ICO registration number is ZB877370.</p>
      <p>{COMPANY_NAME} is the seller, account provider, contractual customer contact and first-line support provider for Sousa Murray eLearning purchases.</p>
    </PolicySection>

    <PolicySection id="eligibility" title="3. Eligibility and the 18+ rule">
      <p>Sousa Murray eLearning is an adult-only service. You must be at least 18 years old to browse beyond the age gate, create an account, make a purchase, submit a contact request or act as an authorised organisation contact.</p>
      <p>We do not sell course licences for any learner who is under 18. An organisation or purchaser providing learner information must confirm that every named learner is an adult and meets any course-specific entry requirements.</p>
      <p>We may refuse, suspend or cancel access where we reasonably believe the age declaration is false or the service is being used for an under-18 learner.</p>
    </PolicySection>

    <PolicySection id="roles" title="4. The roles of Sousa Murray eLearning and Highfield">
      <p>{COMPANY_NAME}, trading through Sousa Murray eLearning, is an authorised reseller of Highfield Online Training. Customers purchase from Sousa Murray eLearning and remain customers of Sousa Murray eLearning.</p>
      <div className="policy-role-grid">
        <article><Building2 size={23} /><h3>Sousa Murray eLearning</h3><p>Markets the available courses, provides course information, operates the website and customer account, accepts payment, records orders, validates learner details, arranges enrolment, provides first-line support and manages complaints or provider escalation.</p></article>
        <article><BookOpen size={23} /><h3>Highfield Online Training</h3><p>Provides the course content and operates the Learning Management System used by enrolled learners. After Sousa Murray eLearning completes enrolment, Highfield sends the learner access instructions.</p></article>
      </div>
      <p>Using Highfield’s Learning Management System does not transfer the Sousa Murray eLearning customer relationship to Highfield. Customers should contact Sousa Murray eLearning first. Where provider assistance is required, Sousa Murray eLearning will manage the escalation.</p>
    </PolicySection>

    <PolicySection id="accounts" title="5. My Sousa Murray eLearning and JA Group Services ID">
      <p>My Sousa Murray eLearning allows customers to save customer information, adult learner details and reusable baskets. Signed-in accounts are authenticated through <strong>JA Group Services ID</strong>, the customer identity service operated by {COMPANY_NAME} using Microsoft Entra External ID.</p>
      <PolicyList items={[
        <>You must provide accurate identity and contact information and keep it up to date.</>,
        <>You must keep your sign-in method, password, one-time passcode and device access secure.</>,
        <>You must not share an account, impersonate another person, create an account for an under-18 user or allow unauthorised access.</>,
        <>You are responsible for activity carried out through your account unless you promptly report suspected compromise.</>,
        <>Where device mode is available before sign-in, saved details remain in that browser and may be lost if browser storage is cleared.</>,
      ]} />
      <p>JA Group Services ID may offer sign-in methods configured in the relevant customer user flow, such as email credentials, one-time passcodes or supported third-party identity providers. Sousa Murray eLearning does not receive or store the password used with an external identity provider.</p>
      <p>We may require identity, security or authority checks before changing account data, disclosing order information or processing a rights request.</p>
    </PolicySection>

    <PolicySection id="orders" title="6. Orders and contract formation">
      <p>Course listings and prices are invitations to place an order. Adding a course to a basket does not reserve availability or create a contract.</p>
      <p>By submitting an order, you offer to purchase the selected licence or licences using the information supplied. Stripe payment authorisation does not by itself require us to accept an order. A contract is formed when Sousa Murray eLearning sends an order acceptance or begins enrolment, whichever happens first.</p>
      <p>We may reject or cancel an order before activation where there is a pricing or catalogue error, suspected fraud, an age or authority concern, incomplete learner information, course unavailability, a sanctions or legal concern, a duplicate order, or a breach of these terms. Where we cancel after payment and no lawful deduction applies, we will arrange a refund.</p>
      <p>You must review the basket, course, quantity, purchaser details and learner information before paying. The website provides an opportunity to correct information before checkout.</p>
    </PolicySection>

    <PolicySection id="pricing" title="7. Pricing and payment">
      <p>Customer-facing prices are shown in pounds sterling and include VAT where stated. Quantity pricing is calculated separately for each course. The live Sousa Murray eLearning catalogue and checkout service verify the applicable price before Stripe Checkout is created.</p>
      <p>Payments are processed securely through Stripe. Sousa Murray eLearning does not store full payment-card numbers or card security codes. Stripe’s own terms and privacy information also apply to its payment processing.</p>
      <p>You must use a payment method that you are authorised to use. We may carry out fraud, security and transaction checks or request additional verification.</p>
    </PolicySection>

    <PolicySection id="licences" title="8. Course licences and larger orders">
      <p>One licence is required for each named learner taking each course. A licence is personal to the learner and course allocated to it. It may not be shared, transferred, resold, copied or used to enrol several people.</p>
      <p>The public Sousa Murray eLearning checkout accepts no more than 25 learner-course licences in a basket. A requirement for 26 licences or more must be arranged directly with Sousa Murray eLearning. Customers must not divide a larger requirement into several smaller online orders to avoid the direct-order process.</p>
      <p>Direct orders may require a quotation, separate payment arrangement, agreed learner-data format and additional written terms.</p>
    </PolicySection>

    <PolicySection id="learners" title="9. Customer and learner information">
      <p>Before payment, the purchaser must state whether the customer is an individual or business and provide the purchaser’s legal first name, legal last name and contact email.</p>
      <p>Each licence must be matched to an adult learner using the learner’s legal first name, legal last name and email address intended for Highfield LMS enrolment. Learners may be entered manually or supplied in an accepted CSV, XLS, XLSX or PDF learner list where that option is available.</p>
      <PolicyList items={[
        <>You must have authority to purchase for, and provide personal data about, every learner.</>,
        <>You must tell learners that Sousa Murray eLearning and Highfield will use their information for enrolment, course delivery and support.</>,
        <>Information must be accurate, complete and limited to what is reasonably required.</>,
        <>Do not include passwords, full card details, unrelated documents or unnecessary special-category information.</>,
        <>You are responsible for losses or delays caused by inaccurate, incomplete or unauthorised learner information, except where Sousa Murray eLearning caused the error.</>,
      ]} />
    </PolicySection>

    <PolicySection id="delivery" title="10. Enrolment, activation and delivery">
      <p>After successful payment, the order enters Sousa Murray eLearning’s enrolment workflow. Sousa Murray eLearning checks the order and learner allocation, then provides the information needed for Highfield to create course access.</p>
      <p>Highfield normally emails the enrolled learner with LMS access instructions. The Sousa Murray eLearning payment or order confirmation is not the same as the LMS access email.</p>
      <p>Delivery times may depend on accurate learner information, successful payment, provider availability, security checks, business operating hours and the size or complexity of the order. Any published estimate is an estimate unless a written direct-order agreement states otherwise.</p>
      <p>Course access is considered activated when the learner account or course licence is created or made available for use. Learning is considered to have begun when the learner opens, starts, progresses through or interacts with the supplied course content.</p>
    </PolicySection>

    <PolicySection id="course-use" title="11. Use of course content and certificates">
      <p>Highfield course access is licensed to the named learner for personal learning only. Course materials, questions, assessments, videos, graphics and certificates remain protected by intellectual-property rights.</p>
      <PolicyList items={[
        <>The learner must complete work personally and must not ask another person or automated system to complete assessments.</>,
        <>Course content must not be copied, recorded, published, sold, redistributed or used to create competing material.</>,
        <>A completion certificate does not automatically amount to a regulated qualification, professional licence, workplace competency sign-off or legal authorisation.</>,
        <>Where practical training, workplace observation or separate assessment is required, the customer or employer remains responsible for arranging it.</>,
      ]} />
      <p>The course page and qualification notice should be read before purchase. Sousa Murray eLearning does not make employment, regulatory or professional decisions for customers.</p>
    </PolicySection>

    <PolicySection id="technical" title="12. Technical requirements">
      <p>The learner needs a supported device, current browser, working email address, stable internet connection and any audio or accessibility tools required by the course. Workplace networks, filtering, device restrictions and third-party outages may affect access.</p>
      <p>Customers should use the Help Centre troubleshooting steps before reporting a technical problem and should provide the course title, learner email, device, browser, affected page and steps already tried. Passwords must never be sent to Sousa Murray eLearning.</p>
    </PolicySection>

    <PolicySection id="support" title="13. Support and service targets">
      <p>Sousa Murray eLearning is the first-line support contact for orders, enrolment, LMS access, account issues and course problems. Customers should not contact Highfield directly unless Sousa Murray eLearning expressly instructs them to do so.</p>
      <p>Sousa Murray eLearning uses a P1–P4 framework to prioritise support based on severity, number of affected users, business impact and available workarounds. Initial automated or customer-selected priority is provisional and may be changed after staff review.</p>
      <p>Published response, resolution and back-stop times are operational targets rather than guaranteed contractual deadlines, unless a signed direct-order agreement expressly makes them binding. Change requests receive a P4 response target but delivery remains subject to scoping and planning.</p>
    </PolicySection>

    <PolicySection id="cancellation" title="14. Cancellation and refunds">
      <p>Cancellation and refund rights are explained in the <Link to="/refunds">Refunds Policy</Link>, which forms part of these terms.</p>
      <p>Consumers may have a 14-day cancellation right before digital supply begins. During checkout, the purchaser may request immediate enrolment and digital supply and acknowledge that the change-of-mind cancellation right is lost once access is activated or learning begins. Statutory rights for faulty, misdescribed or improperly supplied digital content remain unaffected.</p>
      <p>Business customers do not normally receive a statutory cooling-off period. Direct-order cancellation rights are governed by the written quotation or agreement.</p>
    </PolicySection>

    <PolicySection id="acceptable-use" title="15. Acceptable use">
      <p>You must comply with the <Link to="/acceptable-use">Acceptable Use Policy</Link>. In particular, you must not misuse JA Group Services ID, share licences, upload malware, scrape the catalogue, interfere with security, submit fraudulent orders, abuse support channels or use the service for an under-18 learner.</p>
    </PolicySection>

    <PolicySection id="intellectual-property" title="16. Intellectual property">
      <p>The Sousa Murray eLearning name, website design, software, databases, written content and branding are owned by or licensed to {COMPANY_NAME}. Highfield names, course materials and related marks belong to their respective owners.</p>
      <p>You receive only the limited rights needed to use the website, account and purchased course licence for their intended purpose. No ownership is transferred.</p>
    </PolicySection>

    <PolicySection id="availability" title="17. Availability and changes to the service">
      <p>We may maintain, update, improve, suspend or withdraw parts of Sousa Murray eLearning. Course titles, descriptions, prices, provider availability, technical requirements and catalogue content may change before an order is accepted.</p>
      <p>We do not guarantee uninterrupted availability. Planned maintenance, urgent security work, internet failures, Microsoft, Stripe, Cloudflare or Highfield service events, and circumstances outside reasonable control may affect the service.</p>
      <p>Where a material change affects a paid and unfulfilled order, Sousa Murray eLearning will provide an appropriate remedy, replacement option or refund where required.</p>
    </PolicySection>

    <PolicySection id="liability" title="18. Liability">
      <p>Nothing in these terms excludes or limits liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, breach of rights that cannot lawfully be excluded, or any other liability that the law does not permit us to exclude.</p>
      <p>For consumers, Sousa Murray eLearning is responsible for foreseeable loss caused by our breach or failure to use reasonable care and skill. We are not responsible for loss that was not foreseeable, business loss arising from consumer use, or loss caused by inaccurate information, misuse, unsupported equipment, unauthorised access or failure to follow reasonable instructions.</p>
      <p>For business customers, Sousa Murray eLearning is not responsible for indirect or consequential loss, loss of profit, revenue, opportunity, goodwill or anticipated savings, except where the law prohibits that exclusion. Any separate business quotation or direct-order agreement may set additional liability terms.</p>
      <p>Sousa Murray eLearning does not guarantee that completing a course will satisfy a specific employer, regulator, insurer or professional body unless that outcome is expressly stated in writing.</p>
    </PolicySection>

    <PolicySection id="suspension" title="19. Suspension and termination">
      <p>We may restrict, suspend or close an account, cancel an unactivated order, block an upload or withdraw access where reasonably necessary to protect customers, investigate fraud or security concerns, comply with law, prevent misuse, enforce these terms or respond to a provider restriction.</p>
      <p>Where appropriate, we will explain the reason and provide a route to contact us. Serious, repeated, illegal or security-threatening conduct may result in immediate action without prior notice.</p>
      <p>Account closure does not remove payment obligations, intellectual-property restrictions, audit records, legal rights or provisions intended to continue after termination.</p>
    </PolicySection>

    <PolicySection id="communications" title="20. Electronic communications">
      <p>You agree that Sousa Murray eLearning may provide order confirmations, account messages, security notices, policy updates, support communications and enrolment information electronically using the email address or account provided.</p>
      <p>You must keep contact details accurate and check spam, junk, promotions and quarantine folders. Highfield may send separate LMS access and course-related emails to the learner email supplied.</p>
    </PolicySection>

    <PolicySection id="complaints" title="21. Complaints">
      <p>Complaints should be submitted to Sousa Murray eLearning through the <Link to="/contact?topic=complaint">contact form</Link>. Include the order reference, relevant learner email, dates, issue and the outcome sought.</p>
      <p>Sousa Murray eLearning remains responsible for managing the customer complaint even where provider information is required. Data-protection complaints may also be made to the Information Commissioner’s Office, and consumer advice may be available through the appropriate UK consumer-advice service.</p>
    </PolicySection>

    <PolicySection id="law" title="22. Governing law and courts">
      <p>These terms and non-contractual disputes are governed by the law of England and Wales.</p>
      <p>If you are a consumer, this does not remove mandatory rights under the law where you live, and you may bring proceedings in the courts available to you under applicable consumer law. Business disputes are subject to the exclusive jurisdiction of the courts of England and Wales unless a signed agreement says otherwise.</p>
    </PolicySection>

    <PolicySection id="changes" title="23. Changes to these terms">
      <p>We may update these terms to reflect legal, regulatory, security, provider or service changes. The current version and effective date will be published on this page.</p>
      <p>Material changes affecting an existing signed-in account may also be notified through the website, account or email. The terms in force when an order is accepted normally govern that order, unless a legal change must apply immediately or the customer agrees otherwise.</p>
    </PolicySection>
  </PolicyPage>;
}

export function PrivacyPolicyPage() {
  const contents: Array<[string, string]> = [
    ['controller', 'Controller and scope'], ['adult-service', 'Adult-only service'], ['information', 'Information we collect'],
    ['sources', 'Where information comes from'], ['purposes', 'Purposes and lawful bases'], ['identity', 'JA Group Services ID'],
    ['device-storage', 'Device storage and cookies'], ['payments', 'Payments'], ['enrolment', 'Learner enrolment and Highfield'],
    ['uploads', 'Uploaded learner documents'], ['support', 'Support and priority assessment'], ['sharing', 'Who we share information with'],
    ['transfers', 'International transfers'], ['retention', 'Retention'], ['security', 'Security'], ['rights', 'Your rights'],
    ['marketing', 'Marketing'], ['complaints', 'Privacy complaints'], ['changes', 'Changes'],
  ];

  return <PolicyPage
    active="privacy"
    eyebrow="Data protection"
    title="Sousa Murray eLearning Privacy Policy"
    summary="This policy explains how JA Group Services Ltd collects, uses, stores and shares personal information through Sousa Murray eLearning, My Sousa Murray eLearning, JA Group Services ID, checkout, enrolment and support."
    icon={<Fingerprint size={29} />}
    contents={contents}
  >
    <PolicySection id="controller" title="1. Controller and scope">
      <p>{COMPANY_NAME} is the controller for personal information used to operate Sousa Murray eLearning, decide how customer accounts and orders are managed, arrange enrolment and provide support.</p>
      <p><strong>Controller:</strong> {COMPANY_NAME}<br /><strong>Registered office:</strong> {REGISTERED_OFFICE}<br /><strong>Company number:</strong> 16314179<br /><strong>ICO registration:</strong> ZB877370<br /><strong>Data-protection contact:</strong> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
      <p>This policy applies to website visitors, purchasers, organisation contacts, learners, account holders, support contacts and people whose information is supplied by an authorised purchaser or organisation.</p>
    </PolicySection>

    <PolicySection id="adult-service" title="2. Adult-only service">
      <p>Sousa Murray eLearning is intended only for adults aged 18 or over. We do not knowingly sell courses to, create customer accounts for or enrol anyone under 18.</p>
      <p>If we reasonably believe that information relates to an under-18 person, we may restrict the account or order, investigate the circumstances and delete or retain the information only as needed for safeguarding, security, legal or record-keeping purposes.</p>
    </PolicySection>

    <PolicySection id="information" title="3. Information we collect">
      <div className="policy-data-grid">
        <article><UserCheck size={22} /><h3>Identity and contact</h3><p>Legal first and last name, display name, email address, customer type, organisation name, account identifier and age confirmation.</p></article>
        <article><ReceiptText size={22} /><h3>Orders and payments</h3><p>Basket contents, course and licence quantities, prices, VAT, order references, payment status, Stripe references, refunds and billing correspondence. We do not store full card numbers or card security codes.</p></article>
        <article><BookOpen size={22} /><h3>Learner and enrolment</h3><p>Learner legal name, enrolment email, allocated course, licence position, enrolment status, access or completion issue, and information needed to coordinate Highfield LMS delivery.</p></article>
        <article><FileCheck2 size={22} /><h3>Account and saved data</h3><p>My Sousa Murray eLearning profile, saved learners, named saved baskets, account preferences and locally stored device data.</p></article>
        <article><LockKeyhole size={22} /><h3>Security and technical</h3><p>IP address or hashed IP, user agent, browser, device, timestamps, sign-in events, session identifiers, fraud indicators, audit logs and diagnostic information.</p></article>
        <article><AlertTriangle size={22} /><h3>Support and complaints</h3><p>Enquiry category, reported impact, initial and final priority, order or learner references, message content, troubleshooting details and complaint outcomes.</p></article>
      </div>
      <p>Do not provide passwords, full payment-card details, criminal-offence information, health information or other special-category data unless it is strictly necessary and Sousa Murray eLearning has specifically asked for it through an appropriate secure route.</p>
    </PolicySection>

    <PolicySection id="sources" title="4. Where information comes from">
      <PolicyList items={[
        <>directly from you when you browse, sign up, save data, order, upload a document or contact us;</>,
        <>from an organisation or purchaser authorised to provide learner information;</>,
        <>from Microsoft Entra External ID and any identity provider used through JA Group Services ID;</>,
        <>from Stripe regarding payment, fraud checks, refunds and transaction status;</>,
        <>from Highfield regarding enrolment, LMS access, course delivery, completion or provider-side support;</>,
        <>from Cloudflare and technical systems through security, access and diagnostic logs;</>,
        <>from advisers, regulators, law enforcement or fraud-prevention sources where lawful and necessary.</>,
      ]} />
    </PolicySection>

    <PolicySection id="purposes" title="5. Purposes and lawful bases">
      <div className="policy-table-wrap"><table className="policy-table"><thead><tr><th>Purpose</th><th>Typical information</th><th>Lawful basis</th></tr></thead><tbody>
        <tr><td>Provide My Sousa Murray eLearning, process orders, take payment, enrol learners and deliver support</td><td>Identity, contact, account, order, learner and payment-reference data</td><td>Necessary for a contract or steps requested before a contract</td></tr>
        <tr><td>Maintain accounts, tax, VAT, audit and legal records</td><td>Orders, invoices, payment and consent records</td><td>Legal obligation</td></tr>
        <tr><td>Prevent fraud, misuse, account compromise and security incidents</td><td>IP, device, sign-in, session, transaction and audit data</td><td>Legitimate interests in protecting customers, Sousa Murray eLearning and service providers; legal obligation where applicable</td></tr>
        <tr><td>Handle complaints, disputes, chargebacks, legal claims and regulatory requests</td><td>Order, contact, correspondence, support and audit records</td><td>Contract, legal obligation and legitimate interests in establishing, exercising or defending legal rights</td></tr>
        <tr><td>Operate and improve the website, catalogue, account and support journey</td><td>Technical events, aggregated usage, errors and customer feedback</td><td>Legitimate interests in operating and improving the service</td></tr>
        <tr><td>Send optional marketing</td><td>Name, email, preferences and campaign interaction</td><td>Consent or legitimate interests where electronic-marketing law permits; every message will provide an opt-out</td></tr>
      </tbody></table></div>
      <p>The checkout request for immediate digital supply and acknowledgement of cancellation rights is a consumer-contract record. It is not treated as consent for unrelated personal-data use or marketing.</p>
    </PolicySection>

    <PolicySection id="identity" title="6. JA Group Services ID and Microsoft Entra External ID">
      <p>JA Group Services ID is the customer identity and access service used for My Sousa Murray eLearning. It is operated by {COMPANY_NAME} using a dedicated Microsoft Entra External ID customer tenant.</p>
      <PolicyList items={[
        <>Microsoft may create and maintain a customer directory object containing identifiers and profile attributes collected during sign-up.</>,
        <>Sousa Murray eLearning receives identity-token claims needed to recognise the account, such as a subject identifier, email, display name, given name and family name.</>,
        <>Sousa Murray eLearning converts the identity subject into an internal account identifier and uses a signed, secure session cookie to keep the customer signed in.</>,
        <>A normal Sousa Murray eLearning session lasts up to seven days unless the user signs out, the secret changes, the account is restricted or the session is otherwise invalidated.</>,
        <>Temporary sign-in transaction data is used to protect the authorisation flow and normally expires within minutes.</>,
        <>Sousa Murray eLearning does not receive the password used with Microsoft, Google or another configured external identity provider.</>,
      ]} />
      <p>Microsoft and any selected external identity provider process authentication information under their own privacy terms as well as applicable agreements with {COMPANY_NAME}.</p>
    </PolicySection>

    <PolicySection id="device-storage" title="7. Device storage, cookies and similar technologies">
      <p>Sousa Murray eLearning uses strictly necessary cookies and browser storage to operate security, sign-in, age confirmation, baskets, preferences and checkout.</p>
      <div className="policy-table-wrap"><table className="policy-table"><thead><tr><th>Item</th><th>Purpose</th><th>Typical duration</th></tr></thead><tbody>
        <tr><td><code>aptenvo_session</code></td><td>Signed JA Group Services ID session for My Sousa Murray eLearning</td><td>Up to 7 days</td></tr>
        <tr><td><code>aptenvo_auth</code></td><td>Protects the temporary Microsoft sign-in transaction</td><td>Up to 10 minutes</td></tr>
        <tr><td><code>aptenvo_age</code></td><td>Records the adult confirmation</td><td>Up to 12 months</td></tr>
        <tr><td>Basket and device-profile storage</td><td>Keeps basket, theme, saved details, learners and device-mode baskets in the browser</td><td>Until cleared, replaced or the browser removes it</td></tr>
        <tr><td>Checkout session storage</td><td>Records the immediate digital-supply declaration during checkout</td><td>Current browser session or until checkout completes</td></tr>
      </tbody></table></div>
      <p>Device-mode data stays in the browser until it is submitted through checkout, synchronised after sign-in or otherwise sent to Sousa Murray eLearning. Clearing browser data may permanently remove device-only baskets or saved details.</p>
    </PolicySection>

    <PolicySection id="payments" title="8. Payments and Stripe">
      <p>Stripe processes payment-card and transaction information when a customer enters Stripe Checkout. Sousa Murray eLearning receives limited transaction details such as the Stripe session or payment reference, amount, currency, status, customer email, refund status and fraud or failure information.</p>
      <p>Stripe may act as our payment service provider and may also act as an independent controller for some fraud, legal and network processing. Customers should read Stripe’s privacy information presented through the payment service.</p>
    </PolicySection>

    <PolicySection id="enrolment" title="9. Learner enrolment and Highfield">
      <p>Sousa Murray eLearning shares the learner’s legal name, enrolment email, selected course and related fulfilment information with Highfield where necessary to create and operate LMS access, deliver the course, provide completion evidence and resolve provider-side issues.</p>
      <p>Highfield operates the Learning Management System and may collect additional learning data such as login activity, course progress, assessment responses, completion status and certificate information under its own platform arrangements and privacy information.</p>
      <p>The customer relationship, order, payment, first-line support and complaint route remain with Sousa Murray eLearning. This does not prevent Highfield from having its own legal responsibilities for personal information processed in its systems.</p>
    </PolicySection>

    <PolicySection id="uploads" title="10. Uploaded learner documents">
      <p>Where a purchaser uploads a CSV, XLS, XLSX or PDF learner list, the file is stored in a private Cloudflare R2 bucket and is not given a public website address. The bucket has been configured with an EU jurisdiction restriction.</p>
      <p>Uploaded documents should contain only the course allocation, legal first name, legal last name and enrolment email needed for the order. The purchaser must remove passwords, payment data, health information and unrelated personal information.</p>
      <p>Sousa Murray eLearning may reject, quarantine or delete files that are unsafe, corrupted, unsupported, excessive, unrelated or inconsistent with the order.</p>
    </PolicySection>

    <PolicySection id="support" title="11. Support, contact requests and priority assessment">
      <p>The Sousa Murray eLearning contact form records the enquiry type, reported impact, message, customer information, optional order and learner references, technical context and a unique Sousa Murray eLearning reference.</p>
      <p>The system assigns an <strong>initial</strong> P1–P4 priority from the impact selected by the person submitting the form. This is a triage aid only. Sousa Murray eLearning staff review the circumstances and may confirm or change the priority. The initial classification does not make a solely automated decision with legal or similarly significant effect.</p>
      <p>We may retain hashed-IP and user-agent information to prevent form abuse and investigate security incidents. The public form limits repeated submissions from the same source.</p>
    </PolicySection>

    <PolicySection id="sharing" title="12. Who we share information with">
      <PolicyList items={[
        <><strong>Highfield Online Training</strong> for enrolment, LMS delivery, completion and provider-side support;</>,
        <><strong>Stripe</strong> for payment, refunds, fraud prevention and transaction administration;</>,
        <><strong>Microsoft</strong> and configured identity providers for JA Group Services ID authentication;</>,
        <><strong>Cloudflare</strong> for website hosting, Pages Functions, D1 database services, private R2 storage, security and network delivery;</>,
        <>email, communication, support and operational service providers where needed to respond and administer the service;</>,
        <><strong>JSDS Group Ltd</strong> and other authorised group personnel where necessary for governance, security, IT administration, legal oversight or shared operations, subject to role-based access;</>,
        <>professional advisers, auditors, insurers, banks, regulators, tax authorities, law enforcement and courts where lawful and necessary;</>,
        <>a buyer, investor or successor as part of a genuine corporate transaction, subject to confidentiality and data-protection safeguards.</>,
      ]} />
      <p>We do not sell personal information to advertisers.</p>
    </PolicySection>

    <PolicySection id="transfers" title="13. International transfers">
      <p>Some technology, payment, identity and course providers may process information outside the United Kingdom. Where a restricted transfer occurs, {COMPANY_NAME} will use an applicable UK adequacy regulation or appropriate safeguards such as the UK International Data Transfer Agreement, the UK Addendum to standard contractual clauses, binding corporate rules or another lawful mechanism.</p>
      <p>We assess transfer arrangements and supplementary measures where required. A person may contact us for further information about safeguards relevant to their data, subject to confidentiality and security restrictions.</p>
    </PolicySection>

    <PolicySection id="retention" title="14. How long we keep information">
      <p>We keep identifiable information only for as long as reasonably necessary for the purpose, legal duties, security, disputes and claims. Typical periods are:</p>
      <div className="policy-table-wrap"><table className="policy-table"><thead><tr><th>Record</th><th>Typical retention</th></tr></thead><tbody>
        <tr><td>Orders, invoices, payment and tax records</td><td>Normally 6 years from the end of the relevant company financial year, or longer where law, audit or an active enquiry requires</td></tr>
        <tr><td>Customer account and profile</td><td>While the account is active; after closure, only information linked to orders, security, disputes or legal obligations is retained for the applicable period</td></tr>
        <tr><td>Saved learners and saved baskets</td><td>Until the customer deletes them or the account is closed, subject to a limited backup and security period</td></tr>
        <tr><td>Learner enrolment and fulfilment records</td><td>Normally up to 6 years after the related order is completed or closed</td></tr>
        <tr><td>Uploaded learner-list files</td><td>Until enrolment and related issues are complete, normally deleted within 90 days afterwards unless a dispute, legal hold or compliance need requires longer</td></tr>
        <tr><td>Routine support requests</td><td>Normally 3 years after closure; complaints, chargebacks or legal disputes may be retained up to 6 years or longer where necessary</td></tr>
        <tr><td>Security, fraud and audit logs</td><td>Normally up to 24 months, or longer where needed to investigate an incident or protect legal rights</td></tr>
        <tr><td>Device-only browser storage</td><td>Until the user clears it or the browser removes it</td></tr>
      </tbody></table></div>
      <p>We may anonymise information so it can no longer identify an individual and then retain the anonymised data for statistical, security or service-improvement purposes.</p>
    </PolicySection>

    <PolicySection id="security" title="15. Security">
      <p>We use technical and organisational measures intended to protect personal information, including HTTPS, secure and HttpOnly cookies, signed sessions, PKCE and state protection for sign-in, access controls, private object storage, server-side validation, audit logging, rate limiting and separation between public website files and private learner documents.</p>
      <p>No internet service is completely risk-free. Customers must protect their devices, email accounts and identity-provider credentials and should report suspected compromise promptly.</p>
    </PolicySection>

    <PolicySection id="rights" title="16. Your data-protection rights">
      <p>Depending on the processing and lawful basis, you may have rights to:</p>
      <PolicyList items={[
        <>be informed about how personal information is used;</>,
        <>request access to personal information;</>,
        <>request correction of inaccurate or incomplete information;</>,
        <>request erasure in certain circumstances;</>,
        <>request restriction of processing in certain circumstances;</>,
        <>object to processing based on legitimate interests and object absolutely to direct marketing;</>,
        <>receive certain information in a portable format where the right applies;</>,
        <>withdraw consent where consent is the lawful basis, without affecting earlier lawful processing;</>,
        <>challenge a qualifying solely automated decision, where applicable.</>,
      ]} />
      <p>Rights are not absolute and exemptions may apply. We may request information to verify identity and authority. Submit a request through <Link to="/contact?topic=data-protection">Contact Sousa Murray eLearning</Link>.</p>
      <div className="policy-right-object"><strong>Your right to object</strong><p>You may object to processing based on legitimate interests by explaining your circumstances. You always have the right to object to direct marketing.</p></div>
    </PolicySection>

    <PolicySection id="marketing" title="17. Marketing">
      <p>Sousa Murray eLearning will only send electronic marketing where there is an appropriate lawful basis. Marketing messages will identify the sender and provide a clear unsubscribe method.</p>
      <p>Account, order, security, policy, enrolment and support communications are service messages rather than marketing and may still be sent where necessary.</p>
    </PolicySection>

    <PolicySection id="complaints" title="18. Privacy complaints">
      <p>Please contact Sousa Murray eLearning first so we can investigate. Select the data-protection enquiry type and explain the concern.</p>
      <p>You also have the right to complain to the Information Commissioner’s Office. Current contact and complaint information is available from the ICO website. This right is not affected by contacting Sousa Murray eLearning first.</p>
    </PolicySection>

    <PolicySection id="changes" title="19. Changes to this policy">
      <p>We may update this policy when our services, suppliers, legal obligations or data practices change. The current version and effective date will be shown on this page. Material changes may also be notified through the website, account or email.</p>
    </PolicySection>
  </PolicyPage>;
}

export function RefundsPolicyPage() {
  const contents: Array<[string, string]> = [
    ['scope', 'Scope'], ['consumer-right', 'Consumer cancellation period'], ['immediate-supply', 'Immediate digital supply'],
    ['activation', 'After activation or learning begins'], ['business', 'Business customers'], ['available', 'When a remedy may be available'],
    ['not-available', 'When a change-of-mind refund is not available'], ['details', 'Incorrect learner details'], ['technical', 'Technical problems'],
    ['provider-cancellation', 'Provider or Sousa Murray eLearning cancellation'], ['request', 'How to request a refund'], ['processing', 'How refunds are processed'],
    ['chargebacks', 'Chargebacks'], ['rights', 'Statutory rights'],
  ];

  return <PolicyPage
    active="refunds"
    eyebrow="Customer remedies"
    title="Sousa Murray eLearning Refunds and Cancellation Policy"
    summary="This policy explains cancellation before digital supply, the effect of course activation, remedies for faulty or misdescribed digital content, and the different position for business customers."
    icon={<ReceiptText size={29} />}
    contents={contents}
  >
    <PolicySection id="scope" title="1. Scope">
      <p>This policy applies to course licences purchased from {COMPANY_NAME} through Sousa Murray eLearning. It forms part of the Sousa Murray eLearning Terms of Use.</p>
      <p>“Activation” means that the learner account or course licence has been created or made available for use. “Learning begins” when the learner opens, starts, progresses through or interacts with course content.</p>
      <p>This policy distinguishes between consumers purchasing mainly outside their trade or profession and business customers purchasing wholly or mainly for business purposes.</p>
    </PolicySection>

    <PolicySection id="consumer-right" title="2. Consumer cancellation period before supply">
      <p>A consumer purchasing at a distance will normally have 14 days from contract formation to cancel without giving a reason, provided digital supply has not begun and the cancellation right has not lawfully been lost.</p>
      <p>To cancel before activation, contact Sousa Murray eLearning immediately using the billing and refund enquiry type. Include the Sousa Murray eLearning order reference, purchaser email, learner email and course title.</p>
      <p>A cancellation request is not effective merely because the learner does not open an email. Sousa Murray eLearning must receive the request through a contact route we can reasonably verify.</p>
    </PolicySection>

    <PolicySection id="immediate-supply" title="3. Request for immediate digital supply">
      <p>Sousa Murray eLearning normally begins enrolment promptly after successful payment. Before checkout, the purchaser is asked to:</p>
      <PolicyList items={[
        <>expressly request Sousa Murray eLearning to begin enrolment and digital supply without waiting for the 14-day cancellation period; and</>,
        <>acknowledge that the change-of-mind cancellation right will be lost once the digital content is supplied or course access is activated.</>,
      ]} />
      <p>Sousa Murray eLearning records that declaration with the checkout and order audit trail. If the required express request and acknowledgement were not obtained, the consumer’s legal cancellation position may be different.</p>
    </PolicySection>

    <PolicySection id="activation" title="4. Once access is activated or learning begins">
      <p>Once course access has been activated or the learner has begun the course, Sousa Murray eLearning does not provide a change-of-mind refund where immediate supply was expressly requested and the loss of the cancellation right was acknowledged.</p>
      <p>This applies even where the learner later decides the course is unnecessary, changes role, does not have time to complete it, no longer wants it, fails an assessment, or expected a regulated qualification that the course page clearly stated was not included.</p>
      <p>This rule does not remove remedies where digital content is faulty, not as described, not of satisfactory quality, not supplied with reasonable care and skill, or where another statutory right applies.</p>
    </PolicySection>

    <PolicySection id="business" title="5. Business and organisation customers">
      <p>Business customers do not normally have the statutory 14-day consumer cooling-off period. An online business order may be cancelled only where Sousa Murray eLearning agrees, the course has not been activated and no non-recoverable fulfilment cost has been incurred.</p>
      <p>Orders for 26 licences or more are handled directly and may have quotation-specific cancellation, administration, enrolment and payment terms. Those written terms take priority for that order.</p>
      <p>Nothing in this section removes rights a business customer may have where Sousa Murray eLearning breaches the contract or the supplied service does not conform to agreed terms.</p>
    </PolicySection>

    <PolicySection id="available" title="6. When a refund, repair, replacement or other remedy may be available">
      <PolicyList items={[
        <>A consumer validly cancels before digital supply begins and before the cancellation right is lost.</>,
        <>A duplicate payment or duplicate order was created and only one supply was intended.</>,
        <>Sousa Murray eLearning accepts payment but cannot supply the purchased course or a suitable agreed replacement.</>,
        <>Sousa Murray eLearning or Highfield cancels the course before fulfilment.</>,
        <>Digital content is faulty, not as described, not of satisfactory quality or does not perform as the contract requires.</>,
        <>A service has not been performed with reasonable care and skill and cannot be corrected within a reasonable time without significant inconvenience.</>,
        <>The wrong course or learner was activated because of an error caused by Sousa Murray eLearning.</>,
        <>The law otherwise requires a refund, price reduction, repair, replacement or repeat performance.</>,
      ]} />
      <p>The appropriate remedy depends on the circumstances. We may first investigate, correct the enrolment, restore access, repair the issue, replace the licence, repeat the service or offer a proportionate price reduction where the law permits.</p>
    </PolicySection>

    <PolicySection id="not-available" title="7. When a change-of-mind refund is not available">
      <PolicyList items={[
        <>course access has been activated or learning has begun after the required immediate-supply request and acknowledgement;</>,
        <>the learner did not check spam, junk or quarantine folders or failed to use the correct enrolment email;</>,
        <>the purchaser supplied inaccurate learner information and the licence has already been activated;</>,
        <>the customer purchased the wrong course despite clear course and qualification information;</>,
        <>the learner lacks a supported device, browser, internet connection or workplace permission;</>,
        <>the learner fails, does not finish or no longer needs the course;</>,
        <>an employer, regulator or third party refuses to accept a course where Sousa Murray eLearning did not expressly guarantee acceptance;</>,
        <>a customer attempts to transfer, resell, share or misuse a licence;</>,
        <>a larger order was split to avoid the direct-order process.</>,
      ]} />
      <p>We will still consider whether a statutory remedy applies despite one of these circumstances.</p>
    </PolicySection>

    <PolicySection id="details" title="8. Incorrect learner or enrolment details">
      <p>Contact Sousa Murray eLearning immediately if a legal name or enrolment email is wrong. Before activation, we will normally correct valid details without charge where reasonably possible.</p>
      <p>After activation, a correction may require provider intervention, licence replacement or additional cost and may not be possible. A customer-supplied error does not automatically create a refund right.</p>
      <p>Sousa Murray eLearning may ask for evidence of identity, authority and the correct information before changing an enrolled learner.</p>
    </PolicySection>

    <PolicySection id="technical" title="9. Technical or LMS problems">
      <p>A technical problem does not automatically entitle the customer to an immediate refund. Sousa Murray eLearning must be given a reasonable opportunity to investigate and provide troubleshooting, restore access, correct an enrolment or obtain Highfield assistance.</p>
      <p>The customer should provide the order reference, learner email, course title, device, browser, screenshots, affected module and steps already tried. Passwords and full payment details must not be sent.</p>
      <p>Where the content or service does not conform and cannot be repaired, replaced or repeated within a reasonable time and without significant inconvenience, Sousa Murray eLearning will provide the remedy required by law.</p>
    </PolicySection>

    <PolicySection id="provider-cancellation" title="10. Cancellation by Sousa Murray eLearning or the provider">
      <p>If Sousa Murray eLearning cannot fulfil a paid order because a course is withdrawn, unavailable or materially changed before activation, we may offer an equivalent replacement, account credit where agreed, or a refund for the affected unfulfilled licence.</p>
      <p>We are not required to refund unaffected courses in a mixed basket unless they are materially dependent on the cancelled item or the law requires it.</p>
    </PolicySection>

    <PolicySection id="request" title="11. How to request cancellation or a refund">
      <p>Use <Link to="/contact?topic=billing-refund">Contact Sousa Murray eLearning</Link> and select the payment, billing or refund enquiry type. Provide:</p>
      <PolicyList items={[
        <>the Sousa Murray eLearning order reference;</>,
        <>the purchaser’s legal name and email;</>,
        <>the affected learner email and course;</>,
        <>whether access has been received or learning has begun;</>,
        <>the reason and requested outcome;</>,
        <>relevant evidence, while excluding passwords and full card details.</>,
      ]} />
      <p>Sousa Murray eLearning may request further information to verify the customer, transaction, learner and entitlement.</p>
    </PolicySection>

    <PolicySection id="processing" title="12. How approved refunds are processed">
      <p>Approved refunds are normally returned to the original payment method. We will instruct the payment provider promptly after approval. The time taken for funds to appear is controlled by Stripe, the card network and the customer’s bank.</p>
      <p>Where only part of an order is affected, a partial refund may be issued for the affected licence or licences. VAT and accounting records will be adjusted where required.</p>
    </PolicySection>

    <PolicySection id="chargebacks" title="13. Chargebacks and payment disputes">
      <p>Customers should contact Sousa Murray eLearning before raising a chargeback so we can investigate and provide a remedy where appropriate. A chargeback does not itself cancel an activated licence or resolve a contractual dispute.</p>
      <p>Fraudulent, abusive or knowingly false chargebacks may result in account restriction, recovery action and evidence being supplied to Stripe or the card issuer. This does not prevent a genuine customer from using lawful card-dispute rights.</p>
    </PolicySection>

    <PolicySection id="rights" title="14. Statutory rights">
      <div className="policy-right-object"><strong>Statutory rights are not excluded</strong><p>Nothing in this policy restricts rights or remedies that cannot lawfully be excluded, including rights relating to digital content, services, unfair terms and distance contracts.</p></div>
      <p>Consumers may obtain independent advice from the appropriate UK consumer-advice service. Complaints can also be submitted through Sousa Murray eLearning’s complaints route.</p>
    </PolicySection>
  </PolicyPage>;
}

export function AcceptableUsePolicyPage() {
  const contents: Array<[string, string]> = [
    ['scope', 'Scope'], ['general', 'General standard'], ['identity', 'Accounts and identity'], ['learners', 'Learner authority and accuracy'],
    ['licences', 'Course licence restrictions'], ['uploads', 'Uploads and personal data'], ['technical', 'Technical misuse'], ['orders', 'Orders and payments'],
    ['communications', 'Communications and support'], ['intellectual-property', 'Intellectual property'], ['security', 'Security reporting'],
    ['enforcement', 'Enforcement'], ['reporting', 'Reporting concerns'],
  ];

  return <PolicyPage
    active="acceptable-use"
    eyebrow="Service protection"
    title="Sousa Murray eLearning Acceptable Use Policy"
    summary="This policy sets the rules for using the Sousa Murray eLearning website, My Sousa Murray eLearning, JA Group Services ID, baskets, learner uploads, contact channels and purchased course licences."
    icon={<LockKeyhole size={29} />}
    contents={contents}
  >
    <PolicySection id="scope" title="1. Scope">
      <p>This policy applies to everyone who accesses Sousa Murray eLearning, including visitors, account holders, purchasers, organisation contacts, learners and anyone acting on their behalf.</p>
      <p>It applies to the website, APIs, My Sousa Murray eLearning, JA Group Services ID sessions, baskets, uploads, contact and support forms, order processing and use of course access obtained through Sousa Murray eLearning.</p>
    </PolicySection>

    <PolicySection id="general" title="2. General standard of use">
      <p>You must use Sousa Murray eLearning lawfully, honestly, safely and only for its intended purpose of obtaining and administering adult online training.</p>
      <p>You must not use the service in a way that harms another person, compromises security, disrupts availability, misuses personal information, infringes rights, exposes {COMPANY_NAME} or a provider to legal or regulatory risk, or attempts to gain an unfair commercial advantage.</p>
    </PolicySection>

    <PolicySection id="identity" title="3. Accounts, JA Group Services ID and identity">
      <PolicyList items={[
        <>Do not create or use an account if you are under 18.</>,
        <>Do not impersonate another person, use false identity information or misrepresent authority to act for an organisation or learner.</>,
        <>Do not share passwords, one-time passcodes, sign-in links, authenticated browser sessions or account recovery information.</>,
        <>Do not create duplicate accounts to evade restrictions, rate limits, direct-order requirements or enforcement.</>,
        <>Do not attempt to access another customer’s profile, learners, basket, order, upload, support request or session.</>,
        <>Promptly report suspected account compromise and follow reasonable security instructions.</>,
      ]} />
    </PolicySection>

    <PolicySection id="learners" title="4. Learner authority, age and accuracy">
      <PolicyList items={[
        <>Every learner must be aged 18 or over.</>,
        <>You must have authority to purchase a licence and provide personal information for each learner.</>,
        <>Names must be the learner’s genuine legal first and last name where required for enrolment or certification.</>,
        <>The enrolment email must belong to, or be properly authorised for, the named learner.</>,
        <>Do not enrol a person without their knowledge or use another person’s details to obtain access.</>,
        <>Do not submit more learner records than the licences purchased or assign one licence to several people.</>,
      ]} />
    </PolicySection>

    <PolicySection id="licences" title="5. Course licence restrictions">
      <p>A course licence is personal, limited, non-transferable and for the named adult learner only.</p>
      <PolicyList items={[
        <>Do not share LMS credentials or allow another person to complete the course or assessment.</>,
        <>Do not resell, sublicense, rent, transfer or commercially distribute course access.</>,
        <>Do not record, copy, photograph, scrape or publish course pages, videos, assessments, answers or certificates except where the provider expressly permits personal record-keeping.</>,
        <>Do not falsify progress, completion, assessment results or certificates.</>,
        <>Do not use automation, artificial intelligence, answer-sharing services or another person to complete assessed work dishonestly.</>,
        <>Do not remove copyright, trade-mark, security or ownership notices.</>,
      ]} />
    </PolicySection>

    <PolicySection id="uploads" title="6. Learner-list uploads and personal information">
      <p>Uploads must be necessary for the relevant Sousa Murray eLearning order and must contain only accurate information you are authorised to provide.</p>
      <PolicyList items={[
        <>Do not upload malware, scripts, executable content, password-protected material that Sousa Murray eLearning cannot review, or files designed to exploit a parser or system.</>,
        <>Do not upload passwords, payment-card details, bank credentials, identity documents, criminal records, health data or other sensitive information unless Sousa Murray eLearning has specifically requested it through an approved secure process.</>,
        <>Do not upload unlawful, defamatory, discriminatory, threatening, obscene, infringing or unrelated content.</>,
        <>Do not disguise a file type, bypass extension or size checks, or repeatedly upload corrupted files.</>,
        <>Do not use the private upload facility as general document storage.</>,
      ]} />
    </PolicySection>

    <PolicySection id="technical" title="7. Prohibited technical conduct">
      <PolicyList items={[
        <>accessing, probing, scanning or testing systems without written permission;</>,
        <>attempting to bypass authentication, age controls, permissions, rate limits, checkout validation, licence limits or security measures;</>,
        <>introducing malware, harmful code, denial-of-service traffic or excessive automated requests;</>,
        <>scraping, crawling, indexing or harvesting catalogue, price, account or learner data except through a search engine operating in accordance with published instructions;</>,
        <>reverse engineering, decompiling or attempting to derive source code except where a non-excludable legal right permits it;</>,
        <>interfering with another user, session, order, payment, upload or support request;</>,
        <>using bots or automation to create accounts, submit forms, reserve baskets, place orders or manipulate support priority;</>,
        <>using Sousa Murray eLearning infrastructure to host, relay or distribute unrelated content or communications.</>,
      ]} />
    </PolicySection>

    <PolicySection id="orders" title="8. Orders, payments and commercial misuse">
      <PolicyList items={[
        <>Do not use stolen, unauthorised or fraudulent payment methods.</>,
        <>Do not manipulate checkout requests, quantities, prices, VAT, course identifiers, Stripe metadata or order status.</>,
        <>Do not divide a requirement for 26 licences or more across several online baskets or accounts.</>,
        <>Do not place speculative, sham or bad-faith orders, or repeatedly abandon checkouts to disrupt service.</>,
        <>Do not make knowingly false refund, fraud or chargeback claims.</>,
        <>Do not resell Sousa Murray eLearning courses or represent yourself as an authorised reseller, agent or partner without written authorisation.</>,
      ]} />
    </PolicySection>

    <PolicySection id="communications" title="9. Contact, complaints and support conduct">
      <p>Sousa Murray eLearning welcomes genuine questions, complaints and accessibility requests. Communications must remain lawful and relevant.</p>
      <PolicyList items={[
        <>Do not threaten, harass, abuse, discriminate against or intimidate staff, contractors, providers or other users.</>,
        <>Do not submit false emergencies or deliberately misclassify routine matters as P1.</>,
        <>Do not flood the contact form, create duplicate cases or use several channels to evade rate limits.</>,
        <>Do not send passwords, full card details or unrelated personal information.</>,
        <>Do not publish private support correspondence dishonestly or out of context to impersonate Sousa Murray eLearning or Highfield.</>,
      ]} />
      <p>Critical or persistent abusive communications may be restricted while Sousa Murray eLearning continues to meet any non-excludable legal obligations.</p>
    </PolicySection>

    <PolicySection id="intellectual-property" title="10. Intellectual property and branding">
      <p>You may link to public Sousa Murray eLearning pages in a fair and lawful way. You must not frame the website, copy substantial parts of the catalogue, use Sousa Murray eLearning or Highfield branding to suggest endorsement, or register confusingly similar domains, accounts or business names.</p>
      <p>Course information may be used to make a purchasing decision. It may not be republished as a competing catalogue or training product.</p>
    </PolicySection>

    <PolicySection id="security" title="11. Reporting security concerns">
      <p>Do not exploit a suspected vulnerability. Stop testing, preserve evidence and contact Sousa Murray eLearning with enough information for us to investigate safely.</p>
      <p>Responsible, good-faith reporting will be considered when deciding how to respond. This policy does not authorise security testing or guarantee immunity for unlawful conduct.</p>
    </PolicySection>

    <PolicySection id="enforcement" title="12. Enforcement">
      <p>Where we reasonably believe this policy has been breached, we may:</p>
      <PolicyList items={[
        <>block or delete an upload;</>,
        <>limit or suspend a session, account or feature;</>,
        <>cancel an unactivated order and refund only where appropriate;</>,
        <>refuse future orders or require a direct/manual process;</>,
        <>preserve evidence and investigate activity;</>,
        <>notify Stripe, Microsoft, Cloudflare, Highfield, an organisation customer or another affected provider;</>,
        <>report unlawful conduct to regulators or law enforcement;</>,
        <>seek recovery of loss or other legal remedies.</>,
      ]} />
      <p>Action will be proportionate to risk, seriousness, repetition and legal duties. Serious security, fraud or illegal conduct may result in immediate action without notice.</p>
    </PolicySection>

    <PolicySection id="reporting" title="13. Reporting misuse or appealing action">
      <p>Report suspected misuse through <Link to="/contact">Contact Sousa Murray eLearning</Link>. Include relevant references, dates and evidence without exposing passwords or unrelated personal information.</p>
      <p>A person affected by an account or order restriction may contact Sousa Murray eLearning to request a review. We may require identity and authority checks before discussing the account.</p>
    </PolicySection>
  </PolicyPage>;
}
