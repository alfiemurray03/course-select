import {
  ArrowRight,
  Check,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './production-subscription-checkout.css';

type SessionResponse = {
  configured: boolean;
  authenticated: boolean;
  user: { accountId: string; email: string; name: string } | null;
};

type PlanDefinition = {
  id: 'learner' | 'learner-plus' | 'team-5' | 'team-15';
  name: string;
  customerType: 'Personal' | 'Business';
  price: string;
  seats: number;
  tier: 'Selected Core library' | 'Complete library';
  description: string;
};

const plans: PlanDefinition[] = [
  {
    id: 'learner',
    name: 'Learner',
    customerType: 'Personal',
    price: '£9.99',
    seats: 1,
    tier: 'Selected Core library',
    description: 'Access the selected Core Sousa Murray course collection for one named learner. Courses outside the Core collection can be purchased separately or unlocked with Learner Plus.',
  },
  {
    id: 'learner-plus',
    name: 'Learner Plus',
    customerType: 'Personal',
    price: '£16.99',
    seats: 1,
    tier: 'Complete library',
    description: 'Unlimited access to the complete Sousa Murray Learning Library for one named learner.',
  },
  {
    id: 'team-5',
    name: 'Team 5',
    customerType: 'Business',
    price: '£39.99',
    seats: 5,
    tier: 'Selected Core library',
    description: 'Access the selected Core Sousa Murray course collection for up to five named learners. Courses outside the Core collection are separate purchases or are included with Team 15.',
  },
  {
    id: 'team-15',
    name: 'Team 15',
    customerType: 'Business',
    price: '£89.99',
    seats: 15,
    tier: 'Complete library',
    description: 'Unlimited access to the complete Sousa Murray Learning Library for up to fifteen named learners.',
  },
];

const TERMS_VERSION = 'learning-library-subscription-v1.0-2026-08-06';

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
  if (!response.ok) throw new Error(body.message ?? body.error ?? `Request failed (${response.status}).`);
  return body;
}

function ErrorPanel({ message }: { message: string }) {
  return <div className="psc-error"><CircleAlert /><div><strong>Something needs attention</strong><span>{message}</span></div></div>;
}

export default function ProductionSubscriptionCheckoutPage({ planId }: { planId: string }) {
  const plan = plans.find((item) => item.id === planId);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [immediateAccessRequested, setImmediateAccessRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    jsonRequest<SessionResponse>('/api/auth/session')
      .then(setSession)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  if (!plan) {
    return <main className="psc-page"><div className="psc-not-found"><h1>Plan not found</h1><Link to="/plans">Return to plans</Link></div></main>;
  }

  const checkout = async () => {
    if (!termsAccepted || !immediateAccessRequested) return;
    setBusy(true);
    setError('');
    try {
      const result = await jsonRequest<{ url: string }>('/api/lms/checkout', {
        method: 'POST',
        body: JSON.stringify({
          planId: plan.id,
          termsAccepted,
          immediateAccessRequested,
          termsVersion: TERMS_VERSION,
        }),
      });
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Checkout could not be started.');
      setBusy(false);
    }
  };

  return <main className="psc-page"><div className="psc-shell">
    <section className="psc-plan">
      <span>{plan.customerType} · Learning Library subscription</span>
      <h1>{plan.name}</h1>
      <p>{plan.description}</p>
      <div className="psc-price">{plan.price}<small>per month<br />VAT included</small></div>
      <ul>
        <li><Check /> {plan.tier}</li>
        <li><Check /> {plan.seats === 1 ? 'One named learner' : `Up to ${plan.seats} named learners`}</li>
        <li><Check /> Sousa Murray courses delivered in the Sousa Murray LMS</li>
        <li><Check /> Progress, final assessments and completion certificates</li>
      </ul>
    </section>

    <aside className="psc-checkout">
      <ShieldCheck size={36} />
      <h2>Secure subscription checkout</h2>
      {error && <ErrorPanel message={error} />}
      {!session && !error && <div className="psc-loading"><LoaderCircle /> Checking your account</div>}

      {session && !session.authenticated && <>
        <p>Sign in before purchasing so the subscription can be assigned to the correct learning account.</p>
        <a className="psc-action" href={`/api/auth/login?returnTo=${encodeURIComponent(`/lms/subscribe/${plan.id}`)}`}>Sign in to continue <ArrowRight /></a>
      </>}

      {session?.authenticated && <>
        <p>You will be redirected to the JA Group Services Central Payments checkout. The subscription renews monthly until cancelled.</p>
        <div className="psc-consents">
          <label>
            <input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
            <span>I have read and agree to the <a href="/learning-library-subscription-terms.html" target="_blank" rel="noreferrer">Learning Library Subscription Terms and Privacy Notice</a>, including the monthly recurring charge and cancellation terms.</span>
          </label>
          <label>
            <input type="checkbox" checked={immediateAccessRequested} onChange={(event) => setImmediateAccessRequested(event.target.checked)} />
            <span>I request immediate access to the digital learning service before any applicable 14-day cooling-off period ends and understand that a lawful proportionate deduction may apply if I cancel after access begins.</span>
          </label>
        </div>
        <button className="psc-action" onClick={checkout} disabled={busy || !termsAccepted || !immediateAccessRequested}>
          {busy ? <><LoaderCircle className="psc-spin" /> Opening secure checkout</> : <>Continue to secure checkout <ArrowRight /></>}
        </button>
      </>}

      <small>Highfield Professional Training is a separate service, uses the Highfield LMS and is never included in a Sousa Murray Learning Library subscription.</small>
    </aside>
  </div></main>;
}
