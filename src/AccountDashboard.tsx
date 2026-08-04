import {
  BookOpen,
  Building2,
  Check,
  CircleUserRound,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Plus,
  Save,
  ShieldCheck,
  ShoppingBasket,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useBasket } from './basket';
import { catalogue } from './catalogue';
import './account-auth.css';

type SessionState = {
  configured: boolean;
  authenticated: boolean;
  user: { accountId: string; email: string; name: string } | null;
};

type Profile = {
  customerType: 'individual' | 'business';
  legalFirstName: string;
  legalLastName: string;
  email: string;
  organisationName: string;
};

type SavedLearner = {
  id: string;
  label: string;
  legalFirstName: string;
  legalLastName: string;
  enrolmentEmail: string;
};

type SavedBasket = {
  id: string;
  name: string;
  items: Array<{ courseId: string; quantity: number }>;
  updatedAt?: string;
};

const emptyProfile: Profile = {
  customerType: 'individual',
  legalFirstName: '',
  legalLastName: '',
  email: '',
  organisationName: '',
};

function normaliseProfile(source: Record<string, unknown> | null | undefined): Profile {
  return {
    customerType: source?.customer_type === 'business' || source?.customerType === 'business' ? 'business' : 'individual',
    legalFirstName: String(source?.legal_first_name ?? source?.legalFirstName ?? ''),
    legalLastName: String(source?.legal_last_name ?? source?.legalLastName ?? ''),
    email: String(source?.email ?? ''),
    organisationName: String(source?.organisation_name ?? source?.organisationName ?? ''),
  };
}

function normaliseLearner(source: Record<string, unknown>): SavedLearner {
  return {
    id: String(source.id ?? ''),
    label: String(source.label ?? ''),
    legalFirstName: String(source.legal_first_name ?? source.legalFirstName ?? ''),
    legalLastName: String(source.legal_last_name ?? source.legalLastName ?? ''),
    enrolmentEmail: String(source.enrolment_email ?? source.enrolmentEmail ?? ''),
  };
}

function SignInLanding({ configured }: { configured: boolean }) {
  return <main className="account-signin-page">
    <section className="container account-signin-shell">
      <div className="account-signin-copy">
        <div className="eyebrow"><CircleUserRound size={17} /> My Aptenvo</div>
        <h1>Your training account, protected by JA Group Services ID.</h1>
        <p>Sign in before viewing or saving customer details, learner information or reusable training baskets. No account forms or saved personal information are shown to visitors who are not authenticated.</p>
        <div className="account-signin-benefits">
          <article><Users size={23} /><strong>Saved learners</strong><span>Keep authorised adult learner details ready for future orders.</span></article>
          <article><ShoppingBasket size={23} /><strong>Reusable baskets</strong><span>Save course combinations and restore them when you are ready.</span></article>
          <article><ShieldCheck size={23} /><strong>Protected account</strong><span>Access is authenticated through JA Group Services ID.</span></article>
        </div>
      </div>

      <aside className="account-signin-card">
        <div className="account-signin-icon"><KeyRound size={31} /></div>
        <h2>Sign in to My Aptenvo</h2>
        <p>JA Group Services ID uses Microsoft Entra External ID to authenticate Aptenvo customers securely. You may sign in or create an eligible customer account through the same protected journey.</p>
        <a className="button button-primary account-signin-button" href="/api/auth/login?returnTo=/account"><LogIn size={18} /> Sign in with JA Group Services ID</a>
        <div className="account-signin-trust">
          <span><LockKeyhole size={17} /> Aptenvo does not display customer, learner or saved-basket fields before authentication.</span>
          <span><ShieldCheck size={17} /> Your authenticated My Aptenvo data is stored against your Aptenvo account, not as an unsigned device profile.</span>
          <span><CircleUserRound size={17} /> Aptenvo is an adult-only service for customers and learners aged 18 or over.</span>
        </div>
        {!configured && <div className="account-signin-config-note">JA Group Services ID configuration has not yet been completed in the production environment. The sign-in page remains locked and no local saving fallback is available.</div>}
      </aside>
    </section>
  </main>;
}

export default function AccountDashboard() {
  const basket = useBasket();
  const [session, setSession] = useState<SessionState | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [learners, setLearners] = useState<SavedLearner[]>([]);
  const [savedBaskets, setSavedBaskets] = useState<SavedBasket[]>([]);
  const [status, setStatus] = useState('');
  const [basketName, setBasketName] = useState('My training basket');
  const [learnerDraft, setLearnerDraft] = useState<Omit<SavedLearner, 'id'>>({
    label: '', legalFirstName: '', legalLastName: '', enrolmentEmail: '',
  });

  const loadServerData = async () => {
    const [profileResponse, learnerResponse, basketResponse] = await Promise.all([
      fetch('/api/account/profile', { credentials: 'same-origin' }),
      fetch('/api/account/learners', { credentials: 'same-origin' }),
      fetch('/api/account/saved-baskets', { credentials: 'same-origin' }),
    ]);
    if ([profileResponse, learnerResponse, basketResponse].some((response) => response.status === 401)) {
      setSession((current) => current ? { ...current, authenticated: false, user: null } : current);
      throw new Error('Your session has ended. Sign in again to use My Aptenvo.');
    }
    if (!profileResponse.ok || !learnerResponse.ok || !basketResponse.ok) throw new Error('Your My Aptenvo data is temporarily unavailable.');

    const profileData = await profileResponse.json() as { profile?: Record<string, unknown> };
    const learnerData = await learnerResponse.json() as { learners?: Record<string, unknown>[] };
    const basketData = await basketResponse.json() as { baskets?: SavedBasket[] };
    setProfile(normaliseProfile(profileData.profile));
    setLearners((learnerData.learners ?? []).map(normaliseLearner));
    setSavedBaskets(basketData.baskets ?? []);
  };

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => response.json())
      .then(async (data: SessionState) => {
        setSession(data);
        if (data.authenticated) {
          try { await loadServerData(); }
          catch (error) { setStatus(error instanceof Error ? error.message : 'Your account data could not be loaded.'); }
        }
      })
      .catch(() => setSession({ configured: false, authenticated: false, user: null }));
  }, []);

  const basketCourseNames = useMemo(() => new Map(catalogue.map((course) => [course.id, course.title])), []);

  if (!session) {
    return <main className="account-loading-screen"><div><LoaderCircle size={34} /><strong>Checking your JA Group Services ID session…</strong></div></main>;
  }

  if (!session.authenticated || !session.user) return <SignInLanding configured={session.configured} />;

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('Saving customer details…');
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!response.ok) throw new Error((await response.json() as { message?: string }).message ?? 'Unable to save customer details.');
      await loadServerData();
      setStatus('Customer details saved to your authenticated My Aptenvo account.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Customer details could not be saved.');
    }
  };

  const addLearner = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('Saving learner…');
    try {
      const response = await fetch('/api/account/learners', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(learnerDraft),
      });
      if (!response.ok) throw new Error((await response.json() as { message?: string }).message ?? 'Unable to save learner.');
      await loadServerData();
      setLearnerDraft({ label: '', legalFirstName: '', legalLastName: '', enrolmentEmail: '' });
      setStatus('Learner saved to your authenticated My Aptenvo account.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Learner could not be saved.');
    }
  };

  const deleteLearner = async (learner: SavedLearner) => {
    setStatus('Removing learner…');
    const response = await fetch(`/api/account/learners?id=${encodeURIComponent(learner.id)}`, { method: 'DELETE', credentials: 'same-origin' });
    if (!response.ok) {
      setStatus('The learner could not be removed.');
      return;
    }
    await loadServerData();
    setStatus('Learner removed.');
  };

  const saveCurrentBasket = async () => {
    if (!basket.items.length) {
      setStatus('Add at least one course before saving a basket.');
      return;
    }
    setStatus('Saving basket…');
    try {
      const response = await fetch('/api/account/saved-baskets', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: basketName.trim() || 'Saved training basket', items: basket.items }),
      });
      if (!response.ok) throw new Error((await response.json() as { message?: string }).message ?? 'Unable to save basket.');
      await loadServerData();
      setStatus('Basket saved to your authenticated My Aptenvo account.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Basket could not be saved.');
    }
  };

  const restoreBasket = (saved: SavedBasket) => {
    basket.clearBasket();
    saved.items.forEach((item) => basket.addItem(item.courseId, item.quantity));
    setStatus(`“${saved.name}” has been restored to your current basket.`);
  };

  const deleteBasket = async (saved: SavedBasket) => {
    setStatus('Removing saved basket…');
    const response = await fetch(`/api/account/saved-baskets?id=${encodeURIComponent(saved.id)}`, { method: 'DELETE', credentials: 'same-origin' });
    if (!response.ok) {
      setStatus('The saved basket could not be removed.');
      return;
    }
    await loadServerData();
    setStatus('Saved basket removed.');
  };

  return <main>
    <section className="page-hero account-hero"><div className="container account-hero-grid">
      <div><div className="eyebrow">My Aptenvo</div><h1>Your authenticated customer and training dashboard</h1><p>Save reusable customer details, maintain an authorised adult learner directory and keep training baskets ready for future purchases.</p></div>
      <div className="account-status-card"><CircleUserRound size={28} /><div><strong>{session.user.name}</strong><span>{session.user.email}</span></div></div>
    </div></section>

    <section className="section account-section"><div className="container">
      <div className="account-connection-banner connected">
        <div><Check size={22} /><span><strong>Connected through JA Group Services ID</strong><small>Your profile, learners and saved baskets are stored against this authenticated Aptenvo account.</small></span></div>
        <a className="button button-secondary" href="/api/auth/logout"><LogOut size={17} /> Sign out</a>
      </div>
      {status && <div className="account-message" role="status">{status}</div>}

      <div className="account-dashboard-grid">
        <section className="account-panel account-profile-panel">
          <div className="account-panel-heading"><UserRound size={23} /><div><h2>Customer details</h2><p>Save the purchaser information Aptenvo should use as a starting point for future orders.</p></div></div>
          <form className="account-form" onSubmit={saveProfile}>
            <fieldset><legend>Customer type</legend><div className="account-type-options">
              <label className={profile.customerType === 'individual' ? 'selected' : ''}><input type="radio" name="account-customer-type" checked={profile.customerType === 'individual'} onChange={() => setProfile({ ...profile, customerType: 'individual' })} /><UserRound size={18} /> Individual</label>
              <label className={profile.customerType === 'business' ? 'selected' : ''}><input type="radio" name="account-customer-type" checked={profile.customerType === 'business'} onChange={() => setProfile({ ...profile, customerType: 'business' })} /><Building2 size={18} /> Business</label>
            </div></fieldset>
            <div className="account-field-grid">
              <label>Legal first name<input required autoComplete="given-name" value={profile.legalFirstName} onChange={(event) => setProfile({ ...profile, legalFirstName: event.target.value })} /></label>
              <label>Legal last name<input required autoComplete="family-name" value={profile.legalLastName} onChange={(event) => setProfile({ ...profile, legalLastName: event.target.value })} /></label>
            </div>
            <label>Email address<input type="email" required autoComplete="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
            {profile.customerType === 'business' && <label>Organisation name<input required autoComplete="organization" value={profile.organisationName} onChange={(event) => setProfile({ ...profile, organisationName: event.target.value })} /></label>}
            <button className="button button-primary" type="submit"><Save size={17} /> Save customer details</button>
          </form>
        </section>

        <section className="account-panel">
          <div className="account-panel-heading"><Users size={23} /><div><h2>Saved learners</h2><p>Store only adult learners you are authorised to enrol and whose details you are authorised to provide.</p></div></div>
          <form className="account-form compact" onSubmit={addLearner}>
            <label>Label <span>optional</span><input placeholder="For example: Accounts team" value={learnerDraft.label} onChange={(event) => setLearnerDraft({ ...learnerDraft, label: event.target.value })} /></label>
            <div className="account-field-grid">
              <label>Legal first name<input required value={learnerDraft.legalFirstName} onChange={(event) => setLearnerDraft({ ...learnerDraft, legalFirstName: event.target.value })} /></label>
              <label>Legal last name<input required value={learnerDraft.legalLastName} onChange={(event) => setLearnerDraft({ ...learnerDraft, legalLastName: event.target.value })} /></label>
            </div>
            <label>Enrolment email<input type="email" required value={learnerDraft.enrolmentEmail} onChange={(event) => setLearnerDraft({ ...learnerDraft, enrolmentEmail: event.target.value })} /></label>
            <button className="button button-secondary" type="submit"><Plus size={17} /> Add learner</button>
          </form>
          <div className="saved-record-list">
            {learners.length ? learners.map((learner) => <article key={learner.id}><div><strong>{learner.legalFirstName} {learner.legalLastName}</strong><span>{learner.label || 'Saved learner'} · {learner.enrolmentEmail}</span></div><button type="button" onClick={() => deleteLearner(learner)} aria-label={`Delete ${learner.legalFirstName}`}><Trash2 size={17} /></button></article>) : <p className="empty-account-state">No learners have been saved to this account yet.</p>}
          </div>
        </section>

        <section className="account-panel account-baskets-panel">
          <div className="account-panel-heading"><ShoppingBasket size={23} /><div><h2>Saved baskets</h2><p>Save the current combination of courses and quantities to your authenticated account.</p></div></div>
          <div className="save-basket-row"><input value={basketName} onChange={(event) => setBasketName(event.target.value)} aria-label="Saved basket name" /><button className="button button-primary" type="button" onClick={saveCurrentBasket}><Save size={17} /> Save current basket ({basket.licenceCount})</button></div>
          <div className="saved-basket-list">
            {savedBaskets.length ? savedBaskets.map((saved) => {
              const total = saved.items.reduce((sum, item) => sum + item.quantity, 0);
              return <article key={saved.id}><div className="saved-basket-icon"><BookOpen size={20} /></div><div><strong>{saved.name}</strong><span>{saved.items.length} different {saved.items.length === 1 ? 'course' : 'courses'} · {total} {total === 1 ? 'licence' : 'licences'}</span><small>{saved.items.map((item) => basketCourseNames.get(item.courseId)).filter(Boolean).slice(0, 3).join(', ')}</small></div><div className="saved-basket-actions"><button type="button" onClick={() => restoreBasket(saved)}>Restore</button><button type="button" onClick={() => deleteBasket(saved)} aria-label={`Delete ${saved.name}`}><Trash2 size={16} /></button></div></article>;
            }) : <p className="empty-account-state">No baskets have been saved to this account yet.</p>}
          </div>
          <Link className="button button-secondary" to="/basket">Open current basket</Link>
        </section>
      </div>
    </div></section>
  </main>;
}
