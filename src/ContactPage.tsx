import {
  AlertTriangle,
  Building2,
  Check,
  Clock3,
  FileCheck2,
  Headphones,
  LockKeyhole,
  Mail,
  MessageSquareText,
  ReceiptText,
  Send,
  ShieldCheck,
  ShoppingBasket,
  UserRound,
  Users,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const CONTACT_EMAIL = 'contact@jagroupservices.co.uk';

type ContactResponse = {
  ok?: boolean;
  reference?: string;
  priority?: string;
  message?: string;
};

const topicOptions = [
  ['course-information', 'Course information or suitability'],
  ['large-order', 'Order of 26 or more licences'],
  ['order-enrolment', 'Existing order or learner enrolment'],
  ['access-support', 'Missing LMS access or sign-in help'],
  ['technical-support', 'Course or LMS technical problem'],
  ['billing-refund', 'Payment, billing or refund question'],
  ['complaint', 'Complaint'],
  ['data-protection', 'Privacy or data-protection request'],
  ['accessibility', 'Accessibility support'],
  ['other', 'Another enquiry'],
] as const;

const impactOptions = [
  ['general', 'General question or request', 'No service failure. Information, advice or a routine change is needed.'],
  ['minor', 'One or a small number of learners affected', 'The service remains usable but there is limited disruption.'],
  ['major', 'Several learners or an important function affected', 'A business or learning function cannot continue normally.'],
  ['critical', 'Critical inability to access or use the service', 'A widespread or severe issue is preventing use of the service.'],
] as const;

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const requestedTopic = searchParams.get('topic');
  const initialTopic = topicOptions.some(([value]) => value === requestedTopic) ? requestedTopic! : 'other';
  const [topic, setTopic] = useState(initialTopic);
  const [customerType, setCustomerType] = useState<'individual' | 'business'>('individual');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [learnerEmail, setLearnerEmail] = useState('');
  const [impact, setImpact] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [website, setWebsite] = useState('');
  const [submitted, setSubmitted] = useState<ContactResponse | null>(null);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('aptenvo-account-profile');
      if (!stored) return;
      const profile = JSON.parse(stored) as {
        customerType?: 'individual' | 'business'; legalFirstName?: string; legalLastName?: string; email?: string; organisationName?: string;
      };
      setCustomerType(profile.customerType ?? 'individual');
      setFirstName(profile.legalFirstName ?? '');
      setLastName(profile.legalLastName ?? '');
      setEmail(profile.email ?? '');
      setOrganisation(profile.organisationName ?? '');
    } catch {
      // Contact form remains available without saved profile data.
    }
  }, []);

  const topicLabel = useMemo(() => topicOptions.find(([value]) => value === topic)?.[1] ?? 'Another enquiry', [topic]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus('Sending your enquiry securely…');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enquiryType: topic,
          customerType,
          legalFirstName: firstName,
          legalLastName: lastName,
          email,
          organisationName: customerType === 'business' ? organisation : '',
          orderReference,
          learnerEmail,
          reportedImpact: impact,
          subject,
          message,
          adultConfirmed,
          privacyAccepted,
          website,
        }),
      });
      const data = await response.json() as ContactResponse;
      if (!response.ok || !data.ok) throw new Error(data.message ?? 'Your enquiry could not be submitted.');
      setSubmitted(data);
      setStatus('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Your enquiry could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted?.ok) {
    return <main>
      <section className="page-hero contact-page-hero"><div className="container"><div className="eyebrow">Enquiry received</div><h1>Thank you for contacting Sousa Murray eLearning</h1><p>Your enquiry has been recorded in the Sousa Murray eLearning contact queue. Keep the reference below when replying or contacting us again.</p></div></section>
      <section className="section"><div className="container contact-success-card">
        <div className="contact-success-icon"><Check size={34} /></div>
        <span>Sousa Murray eLearning reference</span>
        <h2>{submitted.reference}</h2>
        <p>{submitted.message}</p>
        <div className="contact-success-detail"><Clock3 size={20} /><div><strong>Initial support classification: {submitted.priority}</strong><span>Sousa Murray eLearning will confirm or change the final priority after reviewing severity, impact and any available workaround.</span></div></div>
        <div className="button-row"><Link className="button button-primary" to="/account">Return to My Sousa Murray eLearning</Link><Link className="button button-secondary" to="/support">View the Help Centre</Link></div>
      </div></section>
    </main>;
  }

  return <main>
    <section className="page-hero contact-page-hero"><div className="container contact-hero-grid">
      <div><div className="eyebrow">Contact Sousa Murray eLearning</div><h1>Tell us what you need help with</h1><p>Use the secure form for course questions, larger orders, paid-order support, enrolment, LMS access, technical problems, billing, complaints and privacy enquiries.</p></div>
      <aside><Headphones size={28} /><div><strong>Sousa Murray eLearning is your first-line contact</strong><span>Do not contact Highfield directly. We will investigate and manage any provider escalation on your behalf.</span></div></aside>
    </div></section>

    <section className="section contact-introduction-section"><div className="container contact-route-grid">
      <article><ShoppingBasket size={24} /><h2>Sales and course questions</h2><p>Ask about published course information, online ordering, quantities or the direct process for 26 or more licences.</p></article>
      <article><Users size={24} /><h2>Order and enrolment</h2><p>Provide the Sousa Murray eLearning order reference and learner email when asking about an existing paid order or learner allocation.</p></article>
      <article><Headphones size={24} /><h2>LMS and technical support</h2><p>Describe the course, module, device, browser and steps already tried. Attachments are not accepted through this form, so never include passwords.</p></article>
      <article><FileCheck2 size={24} /><h2>Complaints and rights</h2><p>Use the appropriate enquiry type for complaints, refunds, privacy, accessibility or other formal customer matters.</p></article>
    </div></section>

    <section className="section section-muted"><div className="container contact-layout">
      <form className="contact-form-card" onSubmit={submit}>
        <div className="contact-form-heading"><MessageSquareText size={28} /><div><span>Secure Sousa Murray eLearning enquiry form</span><h2>{topicLabel}</h2><p>Fields marked with * are required. Do not provide passwords, full payment-card numbers or unnecessary sensitive information.</p></div></div>

        <label className="contact-field">What do you need help with? *
          <select value={topic} onChange={(event) => setTopic(event.target.value)} required>{topicOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
        </label>

        <fieldset className="contact-customer-type"><legend>Are you contacting us as? *</legend><div>
          <label className={customerType === 'individual' ? 'selected' : ''}><input type="radio" name="contact-customer-type" checked={customerType === 'individual'} onChange={() => setCustomerType('individual')} /><UserRound size={20} /><span><strong>Individual</strong><small>Personal purchase or enquiry</small></span></label>
          <label className={customerType === 'business' ? 'selected' : ''}><input type="radio" name="contact-customer-type" checked={customerType === 'business'} onChange={() => setCustomerType('business')} /><Building2 size={20} /><span><strong>Business</strong><small>Organisation or authorised contact</small></span></label>
        </div></fieldset>

        <div className="contact-two-fields">
          <label className="contact-field">Legal first name *<input type="text" autoComplete="given-name" maxLength={80} value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label>
          <label className="contact-field">Legal last name *<input type="text" autoComplete="family-name" maxLength={80} value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label>
        </div>
        <label className="contact-field">Email address *<input type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        {customerType === 'business' && <label className="contact-field">Organisation name *<input type="text" autoComplete="organization" maxLength={160} value={organisation} onChange={(event) => setOrganisation(event.target.value)} required /></label>}

        <div className="contact-two-fields">
          <label className="contact-field">Sousa Murray eLearning order reference <span>Optional</span><input type="text" maxLength={80} value={orderReference} onChange={(event) => setOrderReference(event.target.value)} placeholder="For example, APT-…" /></label>
          <label className="contact-field">Affected learner email <span>Optional</span><input type="email" maxLength={254} value={learnerEmail} onChange={(event) => setLearnerEmail(event.target.value)} /></label>
        </div>

        <fieldset className="contact-impact-fieldset"><legend>What is the current impact? *</legend><div>{impactOptions.map(([value, title, copy]) => <label className={impact === value ? 'selected' : ''} key={value}><input type="radio" name="reported-impact" value={value} checked={impact === value} onChange={() => setImpact(value)} /><span><strong>{title}</strong><small>{copy}</small></span></label>)}</div><p>Sousa Murray eLearning makes the final P1–P4 assessment after reviewing the facts. Selecting “critical” does not automatically guarantee P1 classification.</p></fieldset>

        <label className="contact-field">Subject *<input type="text" maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} required placeholder="A short summary of the enquiry" /></label>
        <label className="contact-field">Tell us what happened and what you need *<textarea rows={9} minLength={20} maxLength={5000} value={message} onChange={(event) => setMessage(event.target.value)} required placeholder="Include relevant dates, course names, learner impact, steps already tried and the outcome you need. Do not include passwords or card details." /><span className="contact-character-count">{message.length}/5000</span></label>

        <label className="contact-honeypot" aria-hidden="true">Website<input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>

        <div className="contact-declarations">
          <label><input type="checkbox" checked={adultConfirmed} onChange={(event) => setAdultConfirmed(event.target.checked)} required /><span>I confirm that I am aged 18 or over. Sousa Murray eLearning is an adult-only service.</span></label>
          <label><input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required /><span>I understand that JA Group Services Ltd will use this information to handle the enquiry, protect the service and manage any necessary Highfield escalation. I have read the <Link to="/privacy">privacy notice</Link>.</span></label>
        </div>

        {status && <div className="contact-form-status" role="status"><AlertTriangle size={18} /><span>{status}</span></div>}
        <button className="button button-primary contact-submit-button" type="submit" disabled={submitting}><Send size={18} /> {submitting ? 'Submitting securely…' : 'Submit enquiry to Sousa Murray eLearning'}</button>
      </form>

      <aside className="contact-sidebar">
        <section className="contact-sidebar-card"><Mail size={28} /><span>Direct email</span><h2>{CONTACT_EMAIL}</h2><p>The secure form is preferred because it creates an Sousa Murray eLearning reference and records the correct enquiry type. Email remains available when the form cannot be used.</p><a className="button button-secondary full-width" href={`mailto:${CONTACT_EMAIL}`}>Open your email app</a></section>
        <section className="contact-sidebar-card"><Clock3 size={28} /><span>Response framework</span><h2>P1–P4 assessment</h2><dl><div><dt>P1</dt><dd>1 working hour target response</dd></div><div><dt>P2</dt><dd>4 working hours</dd></div><div><dt>P3</dt><dd>8 working hours</dd></div><div><dt>P4</dt><dd>2 working days</dd></div></dl><p>Targets depend on Sousa Murray eLearning’s reasonable severity assessment. Resolution and back-stop targets are explained in the Help Centre.</p><Link className="contact-sidebar-link" to="/support">Read the support framework</Link></section>
        <section className="contact-sidebar-card warning"><LockKeyhole size={28} /><span>Protect your account</span><h2>Never send secrets</h2><p>Sousa Murray eLearning will not ask for your Highfield password, Microsoft password, Stripe credentials or full payment-card number. Remove unnecessary personal data before submitting.</p></section>
        <section className="contact-sidebar-card"><ReceiptText size={28} /><span>Existing orders</span><h2>Help us find it quickly</h2><p>Include the Sousa Murray eLearning order reference, purchaser email, affected learner email and course title. That allows first-line checks before any provider escalation.</p></section>
        <section className="contact-sidebar-card"><ShieldCheck size={28} /><span>Legal operator</span><h2>JA Group Services Ltd</h2><p>Sousa Murray eLearning is a trading division of JA Group Services Ltd. Company number 16314179. ICO registration ZB877370.</p></section>
      </aside>
    </div></section>
  </main>;
}
