import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  LoaderCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBasket,
  Trash2,
  UserRound,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthenticatedAccountPrefill from './AuthenticatedAccountPrefill';
import BasketPage from './BasketPage';
import { ONLINE_LICENCE_LIMIT, useBasket } from './basket';
import { catalogue, formatMoney, tierForQuantity } from './catalogue';
import DigitalSupplyConsent from './DigitalSupplyConsent';
import { findLibraryCourse } from './libraryCatalogue';
import LearningCourseBasketPage from './LearningCourseBasketPage';
import { useLearningCourseBasket } from './learning-course-basket';
import './unified-basket.css';

type CustomerType = '' | 'individual' | 'business';
type SessionResponse = {
  configured: boolean;
  authenticated: boolean;
  user: { accountId: string; email: string; name: string } | null;
};
type OwnPricingResponse = {
  configured: boolean;
  accessDays: number | null;
  accessLabel: string | null;
  items: Array<{
    courseSlug: string;
    courseCode: string;
    configured: boolean;
    grossPence: number | null;
    netPence: number | null;
    vatPence: number | null;
    currency: string;
  }>;
  message?: string;
};
type Learner = {
  legalFirstName: string;
  legalLastName: string;
  enrolmentEmail: string;
};
type SavedDetails = {
  customerType: CustomerType;
  legalFirstName: string;
  legalLastName: string;
  enrolmentEmail: string;
  organisationName: string;
};

type FulfilmentState = {
  loading: boolean;
  complete: boolean;
  ownComplete: boolean;
  highfieldPaid: boolean;
  ownCourses: Array<{ slug: string; title: string; firstLessonId?: string | null }>;
  message: string;
};

const DETAILS_KEY = 'sousa-murray-unified-basket-details-v1';
const TERMS_VERSION = 'unified-elearning-basket-v1.0-2026-08-08';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyLearner(): Learner {
  return { legalFirstName: '', legalLastName: '', enrolmentEmail: '' };
}

function loadDetails(): SavedDetails {
  try {
    const saved = JSON.parse(localStorage.getItem(DETAILS_KEY) || '{}') as Partial<SavedDetails>;
    return {
      customerType: saved.customerType === 'individual' || saved.customerType === 'business' ? saved.customerType : '',
      legalFirstName: String(saved.legalFirstName || ''),
      legalLastName: String(saved.legalLastName || ''),
      enrolmentEmail: String(saved.enrolmentEmail || ''),
      organisationName: String(saved.organisationName || ''),
    };
  } catch {
    return { customerType: '', legalFirstName: '', legalLastName: '', enrolmentEmail: '', organisationName: '' };
  }
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...init });
  const body = await response.json().catch(() => ({})) as T & { message?: string; error?: string };
  if (!response.ok) {
    const error = new Error(body.message ?? body.error ?? `Request failed (${response.status}).`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return body;
}

function MixedCourseBasketPage() {
  const highfield = useBasket();
  const own = useLearningCourseBasket();
  const [searchParams] = useSearchParams();
  const saved = useMemo(loadDetails, []);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [pricing, setPricing] = useState<OwnPricingResponse | null>(null);
  const [customerType, setCustomerType] = useState<CustomerType>(saved.customerType);
  const [legalFirstName, setLegalFirstName] = useState(saved.legalFirstName);
  const [legalLastName, setLegalLastName] = useState(saved.legalLastName);
  const [enrolmentEmail, setEnrolmentEmail] = useState(saved.enrolmentEmail);
  const [organisationName, setOrganisationName] = useState(saved.organisationName);
  const [providerConsent, setProviderConsent] = useState(false);
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false);
  const [learnerDetailsConfirmed, setLearnerDetailsConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [immediateAccessRequested, setImmediateAccessRequested] = useState(false);
  const [learnerDetails, setLearnerDetails] = useState<Record<string, Learner[]>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [fulfilment, setFulfilment] = useState<FulfilmentState>({
    loading: false,
    complete: false,
    ownComplete: false,
    highfieldPaid: false,
    ownCourses: [],
    message: '',
  });

  const ownCourses = useMemo(() => own.items.flatMap((item) => {
    const course = findLibraryCourse(item.courseSlug);
    return course ? [course] : [];
  }), [own.items]);
  const highfieldRows = useMemo(() => highfield.items.flatMap((item) => {
    const course = catalogue.find((entry) => entry.id === item.courseId);
    if (!course) return [];
    return [{ ...item, course, tier: tierForQuantity(course, item.quantity) }];
  }), [highfield.items]);

  useEffect(() => {
    jsonRequest<SessionResponse>('/api/auth/session')
      .then((result) => {
        setSession(result);
        if (result.authenticated && result.user) {
          setEnrolmentEmail(result.user.email.toLowerCase());
          const parts = result.user.name.trim().split(/\s+/);
          if (!legalFirstName && parts.length) setLegalFirstName(parts[0] || '');
          if (!legalLastName && parts.length > 1) setLegalLastName(parts.slice(1).join(' '));
        }
      })
      .catch(() => setSession({ configured: false, authenticated: false, user: null }));
  }, []);

  useEffect(() => {
    localStorage.setItem(DETAILS_KEY, JSON.stringify({ customerType, legalFirstName, legalLastName, enrolmentEmail, organisationName }));
  }, [customerType, legalFirstName, legalLastName, enrolmentEmail, organisationName]);

  useEffect(() => {
    if (!ownCourses.length) return setPricing(null);
    const slugs = ownCourses.map((course) => course.slug).join(',');
    jsonRequest<OwnPricingResponse>(`/api/lms/course-purchase-pricing?slugs=${encodeURIComponent(slugs)}`)
      .then(setPricing)
      .catch((error: Error) => setPricing({ configured: false, accessDays: null, accessLabel: null, items: [], message: error.message }));
  }, [ownCourses]);

  useEffect(() => {
    setLearnerDetails((current) => {
      const next: Record<string, Learner[]> = {};
      for (const row of highfieldRows) {
        const existing = current[row.course.id] ?? [];
        next[row.course.id] = Array.from({ length: row.quantity }, (_, index) => existing[index] ?? emptyLearner());
      }
      return next;
    });
  }, [highfieldRows]);

  useEffect(() => {
    const primary = {
      legalFirstName: legalFirstName.trim(),
      legalLastName: legalLastName.trim(),
      enrolmentEmail: enrolmentEmail.trim().toLowerCase(),
    };
    if (!primary.legalFirstName && !primary.legalLastName && !primary.enrolmentEmail) return;
    setLearnerDetails((current) => {
      const next = { ...current };
      let changed = false;
      for (const row of highfieldRows) {
        const rows = [...(next[row.course.id] ?? [])];
        if (rows[0] && !rows[0].legalFirstName && !rows[0].legalLastName && !rows[0].enrolmentEmail) {
          rows[0] = primary;
          next[row.course.id] = rows;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [legalFirstName, legalLastName, enrolmentEmail, highfieldRows]);

  const ownPriceBySlug = useMemo(() => new Map(pricing?.items.map((item) => [item.courseSlug, item]) ?? []), [pricing]);
  const ownTotals = useMemo(() => ownCourses.reduce((sum, course) => {
    const price = ownPriceBySlug.get(course.slug);
    return {
      net: sum.net + Number(price?.netPence || 0),
      vat: sum.vat + Number(price?.vatPence || 0),
      gross: sum.gross + Number(price?.grossPence || 0),
    };
  }, { net: 0, vat: 0, gross: 0 }), [ownCourses, ownPriceBySlug]);
  const highfieldTotals = useMemo(() => highfieldRows.reduce((sum, row) => ({
    net: sum.net + row.tier.aptenvoNetPence * row.quantity,
    vat: sum.vat + row.tier.vatPence * row.quantity,
    gross: sum.gross + row.tier.aptenvoGrossPence * row.quantity,
  }), { net: 0, vat: 0, gross: 0 }), [highfieldRows]);
  const totals = {
    net: ownTotals.net + highfieldTotals.net,
    vat: ownTotals.vat + highfieldTotals.vat,
    gross: ownTotals.gross + highfieldTotals.gross,
  };

  const manualAssignments = useMemo(() => highfieldRows.flatMap((row) => (
    (learnerDetails[row.course.id] ?? []).map((learner, index) => ({
      courseId: row.course.id,
      position: index + 1,
      legalFirstName: learner.legalFirstName.trim(),
      legalLastName: learner.legalLastName.trim(),
      enrolmentEmail: learner.enrolmentEmail.trim().toLowerCase(),
    }))
  )), [highfieldRows, learnerDetails]);
  const highfieldLearnerCount = highfieldRows.reduce((sum, row) => sum + row.quantity, 0);
  const highfieldDetailsComplete = manualAssignments.length === highfieldLearnerCount && manualAssignments.every((learner) => (
    learner.legalFirstName && learner.legalLastName && emailPattern.test(learner.enrolmentEmail)
  ));
  const customerComplete = Boolean(
    customerType
    && legalFirstName.trim()
    && legalLastName.trim()
    && emailPattern.test(enrolmentEmail.trim())
    && (customerType !== 'business' || organisationName.trim())
  );
  const accountEmailMatches = !session?.authenticated || session.user?.email.trim().toLowerCase() === enrolmentEmail.trim().toLowerCase();
  const ownPricingReady = Boolean(pricing?.configured && ownCourses.every((course) => {
    const price = ownPriceBySlug.get(course.slug);
    return price?.configured && Number(price.grossPence) > 0;
  }));
  const declarationsComplete = providerConsent && authorityConfirmed && learnerDetailsConfirmed && termsAccepted && immediateAccessRequested;
  const ready = customerComplete && highfieldDetailsComplete && ownPricingReady && declarationsComplete && accountEmailMatches;

  const updateLearner = (courseId: string, index: number, field: keyof Learner, value: string) => {
    setLearnerDetails((current) => {
      const rows = [...(current[courseId] ?? [])];
      rows[index] = { ...(rows[index] ?? emptyLearner()), [field]: value };
      return { ...current, [courseId]: rows };
    });
  };

  const beginCheckout = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    if (!session?.authenticated) {
      window.location.assign(`/api/auth/login?returnTo=${encodeURIComponent('/basket?resume=1')}`);
      return;
    }

    setBusy(true);
    setMessage('Preparing one secure Stripe checkout for your complete basket…');
    try {
      const payload = {
        unifiedBasket: true,
        highfieldItems: highfieldRows.map((row) => ({ courseId: row.course.id, quantity: row.quantity })),
        ownCourseSlugs: ownCourses.map((course) => course.slug),
        customer: {
          type: customerType,
          legalFirstName: legalFirstName.trim(),
          legalLastName: legalLastName.trim(),
          enrolmentEmail: enrolmentEmail.trim().toLowerCase(),
          organisationName: customerType === 'business' ? organisationName.trim() : '',
          providerConsent,
          authorityConfirmed,
        },
        learnerSubmission: { method: 'manual', learners: manualAssignments },
        termsAccepted,
        immediateAccessRequested,
        learnerDetailsConfirmed,
        termsVersion: TERMS_VERSION,
      };
      const body = new FormData();
      body.set('payload', JSON.stringify(payload));
      const response = await fetch('/api/checkout', { method: 'POST', body });
      const data = await response.json().catch(() => ({})) as { url?: string; message?: string };
      if (!response.ok || !data.url) throw new Error(data.message || 'The secure checkout could not be created.');
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The secure checkout could not be started.');
      setBusy(false);
    }
  };

  useEffect(() => {
    if (searchParams.get('checkout') !== 'success' || searchParams.get('unified') !== '1') return;
    const orderId = searchParams.get('order_id')?.trim() || '';
    if (!orderId) return;
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;
    setFulfilment((current) => ({ ...current, loading: true, message: 'Confirming your payment and enrolments…' }));

    const poll = async () => {
      attempts += 1;
      let ownComplete = ownCourses.length === 0;
      let highfieldPaid = highfieldRows.length === 0;
      let ownCourseResults: FulfilmentState['ownCourses'] = [];
      let statusMessage = '';

      if (ownCourses.length) {
        try {
          const result = await jsonRequest<{ completed: boolean; status?: string; courses?: FulfilmentState['ownCourses']; message?: string }>(`/api/lms/course-purchase-status?order=${encodeURIComponent(orderId)}`);
          ownComplete = result.completed;
          ownCourseResults = result.courses ?? [];
          if (!ownComplete && result.message) statusMessage = result.message;
        } catch (error) {
          if ((error as Error & { status?: number }).status !== 404) statusMessage = error instanceof Error ? error.message : 'Sousa Murray LMS fulfilment is still being confirmed.';
        }
      }

      if (highfieldRows.length) {
        try {
          const result = await jsonRequest<{ paid: boolean; status?: string }>(`/api/professional-training/payment-status?orderId=${encodeURIComponent(orderId)}`);
          highfieldPaid = result.paid;
        } catch (error) {
          if ((error as Error & { status?: number }).status !== 404 && !statusMessage) statusMessage = error instanceof Error ? error.message : 'Highfield order payment is still being confirmed.';
        }
      }

      if (cancelled) return;
      if (ownComplete) own.clearBasket();
      if (highfieldPaid) highfield.clearBasket();
      const complete = ownComplete && highfieldPaid;
      setFulfilment({
        loading: !complete,
        complete,
        ownComplete,
        highfieldPaid,
        ownCourses: ownCourseResults,
        message: complete ? 'Payment confirmed. Your order has been recorded successfully.' : statusMessage || 'Stripe payment is confirmed and enrolment records are being updated…',
      });
      if (!complete && attempts < 15) timer = window.setTimeout(poll, 2000);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [searchParams.get('checkout'), searchParams.get('order_id'), searchParams.get('unified')]);

  if (searchParams.get('checkout') === 'success' && searchParams.get('unified') === '1') {
    return <main className="unified-basket-page">
      <section className="unified-basket-hero"><div className="lp-container"><span><CheckCircle2 /> Order received</span><h1>Thank you for your purchase.</h1><p>One Stripe payment has been used for the complete basket. Sousa Murray courses are added to the Sousa Murray LMS; Highfield courses continue through the Highfield enrolment process.</p></div></section>
      <section className="lp-container unified-success-shell"><div className="unified-success-card">
        {fulfilment.loading ? <LoaderCircle className="sml-spin" size={34} /> : <CheckCircle2 size={38} />}
        <h2>{fulfilment.complete ? 'Payment and learning records confirmed' : 'Finishing your enrolments'}</h2>
        <p>{fulfilment.message}</p>
        {fulfilment.ownCourses.length > 0 && <div className="unified-success-courses">{fulfilment.ownCourses.map((course) => <article key={course.slug}><BookOpen /><div><strong>{course.title}</strong><span>Available in Sousa Murray LMS</span></div><Link to={course.firstLessonId ? `/lms/course/${course.slug}?lesson=${encodeURIComponent(course.firstLessonId)}` : `/lms/course/${course.slug}`}>Start course <ArrowRight /></Link></article>)}</div>}
        {highfieldRows.length > 0 && <div className="unified-highfield-notice"><GraduationCap /><div><strong>Highfield course enrolment</strong><p>Your paid Highfield order is recorded for learner enrolment. Highfield LMS access is issued through the existing Highfield fulfilment process.</p></div></div>}
        <div className="unified-success-actions"><Link to="/lms/dashboard">My Sousa Murray eLearning</Link><Link to="/learning-library/courses">Browse more courses</Link></div>
      </div></section>
    </main>;
  }

  return <main className="unified-basket-page">
    <DigitalSupplyConsent />
    <AuthenticatedAccountPrefill />
    <section className="unified-basket-hero"><div className="lp-container"><span><ShoppingBasket /> Your Sousa Murray eLearning basket</span><h1>One basket. One secure checkout.</h1><p>Review Sousa Murray courses and Highfield Online Training together. Each course keeps its own provider, learning platform and enrolment process after payment.</p></div></section>
    <section className="lp-container unified-basket-shell">
      {searchParams.get('checkout') === 'cancelled' && <div className="unified-basket-alert"><CircleAlert /> Stripe Checkout was cancelled. Nothing has been charged and your complete basket is still here.</div>}
      <form className="unified-basket-layout" onSubmit={beginCheckout}>
        <div className="unified-basket-main">
          <section className="unified-panel">
            <div className="unified-panel-heading"><div><span>Sousa Murray eLearning courses</span><h2>{ownCourses.length} individual {ownCourses.length === 1 ? 'course' : 'courses'}</h2></div><Link to="/learning-library/courses">Add Sousa Murray course</Link></div>
            <div className="unified-item-list">{ownCourses.map((course) => {
              const price = ownPriceBySlug.get(course.slug);
              return <article key={course.slug}><BookOpen /><div><small>{course.code} · Sousa Murray LMS</small><h3>{course.title}</h3><p>{course.shortDescription}</p></div><div className="unified-item-price">{price?.configured && price.grossPence ? <><strong>{formatMoney(price.grossPence)}</strong><small>including VAT</small></> : <><strong>Price pending</strong><small>Head Office pricing required</small></>}<button type="button" onClick={() => own.removeItem(course.slug)}><Trash2 /> Remove</button></div></article>;
            })}</div>
          </section>

          <section className="unified-panel">
            <div className="unified-panel-heading"><div><span>Highfield Online Training</span><h2>{highfieldRows.length} Highfield {highfieldRows.length === 1 ? 'course' : 'courses'} · {highfieldLearnerCount} {highfieldLearnerCount === 1 ? 'licence' : 'licences'}</h2></div><Link to="/courses">Add Highfield course</Link></div>
            <div className="unified-item-list">{highfieldRows.map((row) => {
              const maximumForItem = row.quantity + highfield.remainingLicenceCapacity;
              return <article key={row.course.id}><GraduationCap /><div><small>{row.course.category} · Highfield LMS</small><h3>{row.course.title}</h3><p>{row.course.shortDescription}</p><div className="unified-quantity"><button type="button" onClick={() => highfield.setItemQuantity(row.course.id, Math.max(1, row.quantity - 1))}><Minus /></button><input type="number" min="1" max={maximumForItem} value={row.quantity} onChange={(event) => highfield.setItemQuantity(row.course.id, Number(event.target.value) || 1)} /><button type="button" disabled={highfield.remainingLicenceCapacity === 0} onClick={() => highfield.setItemQuantity(row.course.id, row.quantity + 1)}><Plus /></button></div></div><div className="unified-item-price"><strong>{formatMoney(row.tier.aptenvoGrossPence * row.quantity)}</strong><small>{formatMoney(row.tier.aptenvoGrossPence)} per licence · inc VAT</small><button type="button" onClick={() => highfield.removeItem(row.course.id)}><Trash2 /> Remove</button></div></article>;
            })}</div>
          </section>

          <section className="unified-panel">
            <div className="unified-panel-heading"><div><span>Customer record</span><h2>Purchaser and Sousa Murray LMS learner</h2></div></div>
            <p className="unified-panel-copy">The customer details below are used for the JA Group Services customer record. Sousa Murray courses in this basket are enrolled to this signed-in learner account.</p>
            <div className="sml-customer-type-options">
              <label className={customerType === 'individual' ? 'selected' : ''}><input type="radio" name="customerType" checked={customerType === 'individual'} onChange={() => setCustomerType('individual')} /><UserRound /><span><strong>Individual</strong><small>Purchasing personally</small></span></label>
              <label className={customerType === 'business' ? 'selected' : ''}><input type="radio" name="customerType" checked={customerType === 'business'} onChange={() => setCustomerType('business')} /><Building2 /><span><strong>Business</strong><small>Purchasing through an organisation</small></span></label>
            </div>
            <div className="sml-course-details-fields">
              <label>Legal first name<input value={legalFirstName} maxLength={80} autoComplete="given-name" onChange={(event) => setLegalFirstName(event.target.value)} required /></label>
              <label>Legal last name<input value={legalLastName} maxLength={80} autoComplete="family-name" onChange={(event) => setLegalLastName(event.target.value)} required /></label>
              <label className="wide">Customer and LMS email<input type="email" value={enrolmentEmail} maxLength={254} autoComplete="email" onChange={(event) => setEnrolmentEmail(event.target.value)} readOnly={Boolean(session?.authenticated)} required /><small>{session?.authenticated ? 'This is your signed-in JA Group Services ID and Sousa Murray LMS account.' : 'Use the email address that will be used for JA Group Services ID.'}</small></label>
              {customerType === 'business' && <label className="wide">Organisation name<input value={organisationName} maxLength={160} autoComplete="organization" onChange={(event) => setOrganisationName(event.target.value)} required /></label>}
            </div>
            {!accountEmailMatches && <div className="unified-basket-alert"><CircleAlert /> The customer email must match the signed-in JA Group Services ID.</div>}
          </section>

          <section className="unified-panel">
            <div className="unified-panel-heading"><div><span>Highfield learner enrolment</span><h2>Who will take each Highfield licence?</h2></div></div>
            <p className="unified-panel-copy">Provide the legal name and email for every Highfield licence. These details are used only for the Highfield enrolment workflow and course access.</p>
            <div className="unified-learner-groups">{highfieldRows.map((row) => <article key={row.course.id}><h3>{row.course.title}</h3>{(learnerDetails[row.course.id] ?? []).map((learner, index) => <div className="unified-learner-row" key={`${row.course.id}-${index}`}><strong>Learner {index + 1}</strong><input placeholder="Legal first name" value={learner.legalFirstName} onChange={(event) => updateLearner(row.course.id, index, 'legalFirstName', event.target.value)} /><input placeholder="Legal last name" value={learner.legalLastName} onChange={(event) => updateLearner(row.course.id, index, 'legalLastName', event.target.value)} /><input type="email" placeholder="Learner email" value={learner.enrolmentEmail} onChange={(event) => updateLearner(row.course.id, index, 'enrolmentEmail', event.target.value)} /></div>)}</article>)}</div>
          </section>

          <section className="unified-panel customer-declarations">
            <div className="unified-panel-heading"><div><span>Before payment</span><h2>Confirm this order</h2></div></div>
            <div className="unified-declarations">
              <label><input type="checkbox" checked={learnerDetailsConfirmed} onChange={(event) => setLearnerDetailsConfirmed(event.target.checked)} /><span>I confirm the learner names and email addresses are correct and may be used to create the relevant Sousa Murray LMS and Highfield enrolment records.</span></label>
              <label><input type="checkbox" checked={providerConsent} onChange={(event) => setProviderConsent(event.target.checked)} /><span>I authorise Sousa Murray eLearning to provide the Highfield learner details to Highfield Online Training where required to fulfil the Highfield courses in this basket.</span></label>
              <label><input type="checkbox" checked={authorityConfirmed} onChange={(event) => setAuthorityConfirmed(event.target.checked)} /><span>I confirm that I have authority to provide the learner information entered for this order.</span></label>
              <label><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span>I agree to the <Link to="/terms" target="_blank">Terms of Use</Link>, <Link to="/privacy" target="_blank">Privacy Policy</Link> and <Link to="/refunds" target="_blank">Refunds Policy</Link>.</span></label>
              <label><input type="checkbox" checked={immediateAccessRequested} onChange={(event) => setImmediateAccessRequested(event.target.checked)} /><span>I request enrolment and digital course supply to begin as soon as payment is confirmed.</span></label>
            </div>
          </section>
        </div>

        <aside className="unified-summary">
          <ShieldCheck />
          <span>One shared basket</span>
          <h2>Order summary</h2>
          <div><span>Sousa Murray courses</span><strong>{ownCourses.length}</strong></div>
          <div><span>Highfield licences</span><strong>{highfieldLearnerCount}</strong></div>
          <div><span>Subtotal excluding VAT</span><strong>{formatMoney(totals.net)}</strong></div>
          <div><span>VAT</span><strong>{formatMoney(totals.vat)}</strong></div>
          <div className="total"><span>Total to pay</span><strong>{ownPricingReady ? formatMoney(totals.gross) : 'Pending price'}</strong></div>
          {pricing?.accessLabel && <p><strong>Sousa Murray course access:</strong> {pricing.accessLabel}</p>}
          {!ownPricingReady && <div className="unified-basket-alert"><CircleAlert /> {pricing?.message || 'Individual Sousa Murray course pricing must be configured before this mixed basket can be purchased.'}</div>}
          {!session ? <div className="unified-loading"><LoaderCircle className="sml-spin" /> Checking your account…</div> : !session.authenticated ? <button type="submit" disabled={!customerComplete || !highfieldDetailsComplete || !ownPricingReady || !declarationsComplete}>Sign in or create account <ArrowRight /></button> : <button type="submit" disabled={!ready || busy}>{busy ? <><LoaderCircle className="sml-spin" /> Opening Stripe…</> : <>Continue to Stripe <ArrowRight /></>}</button>}
          {message && <p className="unified-message">{message}</p>}
          <small>Plans are purchased separately. All individual Sousa Murray and Highfield courses use this one website basket.</small>
        </aside>
      </form>
    </section>
  </main>;
}

export default function UnifiedBasketPage() {
  const highfield = useBasket();
  const own = useLearningCourseBasket();
  const hasHighfield = highfield.items.length > 0;
  const hasOwn = own.items.length > 0;

  if (hasHighfield && hasOwn) return <MixedCourseBasketPage />;
  if (hasOwn) return <><DigitalSupplyConsent /><AuthenticatedAccountPrefill /><LearningCourseBasketPage /></>;
  return <><DigitalSupplyConsent /><AuthenticatedAccountPrefill /><BasketPage /></>;
}
