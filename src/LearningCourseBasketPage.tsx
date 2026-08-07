import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  ShoppingBasket,
  Trash2,
  UserRound,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { findLibraryCourse } from './libraryCatalogue';
import { useLearningCourseBasket } from './learning-course-basket';
import './learning-course-basket.css';

type CustomerType = '' | 'individual' | 'business';
type SessionResponse = {
  configured: boolean;
  authenticated: boolean;
  user: { accountId: string; email: string; name: string } | null;
};
type PricingResponse = {
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
type SavedDetails = {
  customerType: CustomerType;
  legalFirstName: string;
  legalLastName: string;
  enrolmentEmail: string;
  organisationName: string;
};

const DETAILS_KEY = 'sousa-murray-own-course-checkout-details-v1';
const TERMS_VERSION = 'individual-sousa-murray-course-v1.0-2026-08-08';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function formatMoney(pence: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(pence / 100);
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({})) as T & { message?: string; error?: string };
  if (!response.ok) {
    const error = new Error(body.message ?? body.error ?? `Request failed (${response.status}).`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  return body;
}

export default function LearningCourseBasketPage() {
  const { items, itemCount, removeItem, clearBasket } = useLearningCourseBasket();
  const [searchParams] = useSearchParams();
  const saved = useMemo(loadDetails, []);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [customerType, setCustomerType] = useState<CustomerType>(saved.customerType);
  const [legalFirstName, setLegalFirstName] = useState(saved.legalFirstName);
  const [legalLastName, setLegalLastName] = useState(saved.legalLastName);
  const [enrolmentEmail, setEnrolmentEmail] = useState(saved.enrolmentEmail);
  const [organisationName, setOrganisationName] = useState(saved.organisationName);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [immediateAccessRequested, setImmediateAccessRequested] = useState(false);
  const [learnerDetailsConfirmed, setLearnerDetailsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const detailedItems = useMemo(() => items.flatMap((item) => {
    const course = findLibraryCourse(item.courseSlug);
    return course ? [course] : [];
  }), [items]);

  useEffect(() => {
    jsonRequest<SessionResponse>('/api/auth/session')
      .then((result) => {
        setSession(result);
        if (result.authenticated && result.user) {
          setEnrolmentEmail(result.user.email.toLowerCase());
          if (!legalFirstName && !legalLastName) {
            const parts = result.user.name.trim().split(/\s+/);
            if (parts.length > 1) {
              setLegalFirstName(parts[0]);
              setLegalLastName(parts.slice(1).join(' '));
            }
          }
        }
      })
      .catch(() => setSession({ configured: false, authenticated: false, user: null }));
  }, []);

  useEffect(() => {
    localStorage.setItem(DETAILS_KEY, JSON.stringify({ customerType, legalFirstName, legalLastName, enrolmentEmail, organisationName }));
  }, [customerType, legalFirstName, legalLastName, enrolmentEmail, organisationName]);

  useEffect(() => {
    if (!detailedItems.length) {
      setPricing(null);
      return;
    }
    const slugs = detailedItems.map((course) => course.slug).join(',');
    jsonRequest<PricingResponse>(`/api/lms/course-purchase-pricing?slugs=${encodeURIComponent(slugs)}`)
      .then(setPricing)
      .catch((error: Error) => setPricing({ configured: false, accessDays: null, accessLabel: null, items: [], message: error.message }));
  }, [detailedItems]);

  const priceBySlug = useMemo(() => new Map(pricing?.items.map((item) => [item.courseSlug, item]) ?? []), [pricing]);
  const totals = useMemo(() => detailedItems.reduce((sum, course) => {
    const price = priceBySlug.get(course.slug);
    return {
      net: sum.net + Number(price?.netPence || 0),
      vat: sum.vat + Number(price?.vatPence || 0),
      gross: sum.gross + Number(price?.grossPence || 0),
    };
  }, { net: 0, vat: 0, gross: 0 }), [detailedItems, priceBySlug]);

  const detailsComplete = Boolean(
    customerType
    && legalFirstName.trim()
    && legalLastName.trim()
    && emailPattern.test(enrolmentEmail.trim())
    && (customerType !== 'business' || organisationName.trim())
  );
  const consentComplete = termsAccepted && immediateAccessRequested && learnerDetailsConfirmed;
  const accountEmailMatches = !session?.authenticated || session.user?.email.trim().toLowerCase() === enrolmentEmail.trim().toLowerCase();

  const beginCheckout = async (event: FormEvent) => {
    event.preventDefault();
    if (!detailedItems.length || !detailsComplete || !consentComplete || !pricing?.configured || !accountEmailMatches) return;
    if (!session?.authenticated) {
      window.location.assign(`/api/auth/login?returnTo=${encodeURIComponent('/learning-library/basket?resume=1')}`);
      return;
    }

    setBusy(true);
    setMessage('Preparing your secure Stripe checkout…');
    try {
      const result = await jsonRequest<{ url: string }>('/api/lms/course-purchase-checkout', {
        method: 'POST',
        body: JSON.stringify({
          courseSlugs: detailedItems.map((course) => course.slug),
          learner: {
            legalFirstName: legalFirstName.trim(),
            legalLastName: legalLastName.trim(),
            enrolmentEmail: enrolmentEmail.trim().toLowerCase(),
          },
          customerType,
          organisationName: organisationName.trim(),
          termsAccepted,
          immediateAccessRequested,
          learnerDetailsConfirmed,
          termsVersion: TERMS_VERSION,
        }),
      });
      window.location.assign(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The secure course checkout could not be started.');
      setBusy(false);
    }
  };

  if (searchParams.get('checkout') === 'success') {
    clearBasket();
  }

  return <main className="sml-course-basket-page">
    <section className="sml-course-basket-hero"><div className="lp-container"><span><ShoppingBasket /> Sousa Murray course basket</span><h1>Purchase individual Sousa Murray courses.</h1><p>Courses in this basket are one-time individual course purchases for one named learner. Learning is delivered through the Sousa Murray LMS after payment and enrolment are confirmed.</p></div></section>
    <section className="lp-container sml-course-basket-shell">
      {!detailedItems.length ? <div className="sml-course-basket-empty"><ShoppingBasket size={44} /><h2>Your Sousa Murray course basket is empty</h2><p>Add courses from the Sousa Murray eLearning catalogue. Learning Library plans are purchased separately and are never added to this basket.</p><Link to="/learning-library/courses">Browse Sousa Murray courses <ArrowRight /></Link></div> : <form onSubmit={beginCheckout} className="sml-course-basket-layout">
        <div className="sml-course-basket-main">
          <section className="sml-course-basket-panel">
            <div className="sml-course-basket-panel-heading"><div><span>{itemCount} selected {itemCount === 1 ? 'course' : 'courses'}</span><h2>Courses for the named learner</h2></div><Link to="/learning-library/courses">Add another course</Link></div>
            <div className="sml-course-basket-items">{detailedItems.map((course) => {
              const price = priceBySlug.get(course.slug);
              return <article key={course.slug}><BookOpen /><div><small>{course.code} · {course.level}</small><h3>{course.title}</h3><p>{course.shortDescription}</p></div><div className="sml-course-basket-price">{price?.configured && price.grossPence ? <><strong>{formatMoney(price.grossPence)}</strong><span>including VAT</span></> : <><strong>Price pending</strong><span>Head Office pricing not configured</span></>}<button type="button" onClick={() => removeItem(course.slug)}><Trash2 size={17} /> Remove</button></div></article>;
            })}</div>
          </section>

          <section className="sml-course-basket-panel">
            <div className="sml-course-basket-panel-heading"><div><span>Required for enrolment</span><h2>Customer and learner details</h2></div></div>
            <p className="sml-course-basket-intro">Enter the personal information that Sousa Murray eLearning will use to create the named learner record. If you are new, you can complete these details before signing in or creating your JA Group Services ID.</p>
            <div className="sml-customer-type-options">
              <label className={customerType === 'individual' ? 'selected' : ''}><input type="radio" name="customerType" checked={customerType === 'individual'} onChange={() => setCustomerType('individual')} /><UserRound /><span><strong>Individual</strong><small>Purchasing for yourself</small></span></label>
              <label className={customerType === 'business' ? 'selected' : ''}><input type="radio" name="customerType" checked={customerType === 'business'} onChange={() => setCustomerType('business')} /><Building2 /><span><strong>Business</strong><small>Purchasing a named learner course through an organisation</small></span></label>
            </div>
            <div className="sml-course-details-fields">
              <label>Legal first name<input type="text" maxLength={80} autoComplete="given-name" value={legalFirstName} onChange={(event) => setLegalFirstName(event.target.value)} required /></label>
              <label>Legal last name<input type="text" maxLength={80} autoComplete="family-name" value={legalLastName} onChange={(event) => setLegalLastName(event.target.value)} required /></label>
              <label className="wide">Enrolment email<input type="email" maxLength={254} autoComplete="email" value={enrolmentEmail} onChange={(event) => setEnrolmentEmail(event.target.value)} readOnly={Boolean(session?.authenticated)} required /><small>{session?.authenticated ? 'This must match the signed-in JA Group Services ID that will hold the LMS learning record.' : 'Use the email address the learner will use for their JA Group Services ID and Sousa Murray LMS access.'}</small></label>
              {customerType === 'business' && <label className="wide">Organisation name<input type="text" maxLength={160} autoComplete="organization" value={organisationName} onChange={(event) => setOrganisationName(event.target.value)} required /></label>}
            </div>
            {!accountEmailMatches && <p className="sml-course-basket-warning"><CircleAlert /> The enrolment email must match the signed-in JA Group Services ID.</p>}
          </section>

          <section className="sml-course-basket-panel">
            <div className="sml-course-basket-panel-heading"><div><span>Before payment</span><h2>Confirm the course enrolment</h2></div></div>
            <div className="sml-course-consents">
              <label><input type="checkbox" checked={learnerDetailsConfirmed} onChange={(event) => setLearnerDetailsConfirmed(event.target.checked)} /><span>I confirm that the legal name and enrolment email entered above are correct for the named learner and may be used to create the Sousa Murray LMS learning record and certificate.</span></label>
              <label><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span>I agree to the <Link to="/terms" target="_blank">Terms of Use</Link>, <Link to="/privacy" target="_blank">Privacy Policy</Link> and <Link to="/refunds" target="_blank">Refunds Policy</Link> for this individual digital course purchase.</span></label>
              <label><input type="checkbox" checked={immediateAccessRequested} onChange={(event) => setImmediateAccessRequested(event.target.checked)} /><span>I request that digital course access and enrolment begin as soon as payment is confirmed.</span></label>
            </div>
          </section>
        </div>

        <aside className="sml-course-basket-summary">
          <ShieldCheck size={30} />
          <h2>Order summary</h2>
          <div><span>Courses</span><strong>{itemCount}</strong></div>
          {pricing?.configured ? <><div><span>Subtotal excluding VAT</span><strong>{formatMoney(totals.net)}</strong></div><div><span>VAT</span><strong>{formatMoney(totals.vat)}</strong></div><div className="total"><span>Total to pay</span><strong>{formatMoney(totals.gross)}</strong></div><p>{pricing.accessLabel}</p></> : <div className="sml-pricing-unavailable"><CircleAlert /><p>{pricing?.message || 'Individual course pricing and access duration are not yet configured in Head Office Central Payments.'}</p></div>}
          {!session ? <div className="sml-course-basket-loading"><LoaderCircle /> Checking your account…</div> : !session.authenticated ? <button className="sml-course-checkout-button" type="submit" disabled={!detailsComplete || !consentComplete || !pricing?.configured}>Sign in or create account to continue <ArrowRight /></button> : <button className="sml-course-checkout-button" type="submit" disabled={busy || !detailsComplete || !consentComplete || !pricing?.configured || !accountEmailMatches}>{busy ? <><LoaderCircle className="sml-spin" /> Opening Stripe…</> : <>Continue to secure Stripe checkout <ArrowRight /></>}</button>}
          {message && <p className="sml-course-basket-message">{message}</p>}
          {searchParams.get('checkout') === 'cancelled' && <p className="sml-course-basket-message">Stripe Checkout was cancelled. Your course basket and learner details are still here.</p>}
          <small>Learning Library plans are not placed in this basket. Highfield Online Training continues to use the separate Highfield Basket.</small>
        </aside>
      </form>}
    </section>
  </main>;
}

export function LearningCoursePurchaseSuccessPage() {
  const [searchParams] = useSearchParams();
  const { clearBasket } = useLearningCourseBasket();
  const order = searchParams.get('order') || '';
  const [status, setStatus] = useState<'loading' | 'complete' | 'pending' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your payment and creating the LMS enrolment…');
  const [courses, setCourses] = useState<Array<{ slug: string; code: string; title: string; firstLessonId: string | null }>>([]);

  useEffect(() => {
    if (!order) {
      setStatus('error');
      setMessage('The course order reference is missing.');
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const result = await jsonRequest<{ completed: boolean; status?: string; message?: string; courses?: Array<{ slug: string; code: string; title: string; firstLessonId: string | null }> }>(`/api/lms/course-purchase-status?order=${encodeURIComponent(order)}`);
        if (cancelled) return;
        if (result.completed) {
          setCourses(result.courses ?? []);
          setStatus('complete');
          setMessage('Payment confirmed. The named learner has been enrolled and the courses are now inside My Sousa Murray eLearning.');
          clearBasket();
          return;
        }
        setStatus('pending');
        setMessage(result.message || 'Stripe payment is complete and Central Payments is still confirming the order.');
      } catch (error) {
        if (cancelled) return;
        setStatus('pending');
        setMessage(error instanceof Error ? error.message : 'The order is still being confirmed.');
      }
      if (attempts < 15 && !cancelled) window.setTimeout(poll, 2000);
      else if (!cancelled) setStatus('error');
    };
    void poll();
    return () => { cancelled = true; };
  }, [order, clearBasket]);

  return <main className="sml-course-purchase-success"><div className="lp-container"><section>
    {status === 'complete' ? <CheckCircle2 size={54} /> : status === 'error' ? <CircleAlert size={54} /> : <LoaderCircle className="sml-spin" size={50} />}
    <span>Individual Sousa Murray course purchase</span>
    <h1>{status === 'complete' ? 'Your courses are ready in the LMS.' : status === 'error' ? 'Your order needs attention.' : 'Setting up your courses…'}</h1>
    <p>{message}</p>
    {status === 'complete' && <div className="sml-purchased-course-list">{courses.map((course) => <article key={course.slug}><BookOpen /><div><small>{course.code}</small><strong>{course.title}</strong></div>{course.firstLessonId ? <Link to={`/lms/course/${course.slug}?lesson=${course.firstLessonId}`}>Start course <ArrowRight /></Link> : <Link to="/lms/dashboard">Open LMS</Link>}</article>)}</div>}
    <div className="sml-success-actions"><Link to="/lms/dashboard">My Sousa Murray eLearning</Link><Link to="/learning-library/courses">Browse more courses</Link></div>
  </section></div></main>;
}
