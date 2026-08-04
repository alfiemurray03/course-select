import {
  BookOpen,
  Building2,
  Check,
  CircleUserRound,
  LogIn,
  LogOut,
  Plus,
  Save,
  ShoppingBasket,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useBasket } from './basket';
import { catalogue } from './catalogue';

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

function readLocal<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

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
    id: String(source.id ?? `local-learner-${crypto.randomUUID()}`),
    label: String(source.label ?? ''),
    legalFirstName: String(source.legal_first_name ?? source.legalFirstName ?? ''),
    legalLastName: String(source.legal_last_name ?? source.legalLastName ?? ''),
    enrolmentEmail: String(source.enrolment_email ?? source.enrolmentEmail ?? ''),
  };
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

  const authenticated = Boolean(session?.authenticated);

  const loadLocalData = () => {
    const localProfile = readLocal<Profile>('aptenvo-account-profile', emptyProfile);
    const localLearners = readLocal<SavedLearner[]>('aptenvo-account-learners', []);
    const localBaskets = readLocal<SavedBasket[]>('aptenvo-saved-baskets', []);
    setProfile(localProfile);
    setLearners(localLearners);
    setSavedBaskets(localBaskets);
  };

  const loadServerData = async () => {
    const [profileResponse, learnerResponse, basketResponse] = await Promise.all([
      fetch('/api/account/profile'),
      fetch('/api/account/learners'),
      fetch('/api/account/saved-baskets'),
    ]);
    if (!profileResponse.ok || !learnerResponse.ok || !basketResponse.ok) throw new Error('Account data unavailable');
    const profileData = await profileResponse.json() as { profile?: Record<string, unknown> };
    const learnerData = await learnerResponse.json() as { learners?: Record<string, unknown>[] };
    const basketData = await basketResponse.json() as { baskets?: SavedBasket[] };
    const nextProfile = normaliseProfile(profileData.profile);
    const nextLearners = (learnerData.learners ?? []).map(normaliseLearner);
    const nextBaskets = basketData.baskets ?? [];
    setProfile(nextProfile);
    setLearners(nextLearners);
    setSavedBaskets(nextBaskets);
    localStorage.setItem('aptenvo-account-profile', JSON.stringify(nextProfile));
    localStorage.setItem('aptenvo-account-learners', JSON.stringify(nextLearners));
    localStorage.setItem('aptenvo-saved-baskets', JSON.stringify(nextBaskets));
  };

  useEffect(() => {
    fetch('/api/auth/session')
      .then((response) => response.json())
      .then(async (data: SessionState) => {
        setSession(data);
        if (data.authenticated) await loadServerData();
        else loadLocalData();
      })
      .catch(() => {
        setSession({ configured: false, authenticated: false, user: null });
        loadLocalData();
      });
  }, []);

  const basketCourseNames = useMemo(() => new Map(catalogue.map((course) => [course.id, course.title])), []);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('Saving customer details…');
    try {
      if (authenticated) {
        const response = await fetch('/api/account/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        });
        if (!response.ok) throw new Error((await response.json() as { message?: string }).message ?? 'Unable to save profile');
      }
      localStorage.setItem('aptenvo-account-profile', JSON.stringify(profile));
      setStatus(authenticated ? 'Customer details saved to My Aptenvo.' : 'Customer details saved securely on this device.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Customer details could not be saved.');
    }
  };

  const addLearner = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('Saving learner…');
    const localLearner: SavedLearner = { id: `local-learner-${crypto.randomUUID()}`, ...learnerDraft };
    try {
      if (authenticated) {
        const response = await fetch('/api/account/learners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(learnerDraft),
        });
        if (!response.ok) throw new Error((await response.json() as { message?: string }).message ?? 'Unable to save learner');
        await loadServerData();
      } else {
        const next = [localLearner, ...learners];
        setLearners(next);
        localStorage.setItem('aptenvo-account-learners', JSON.stringify(next));
      }
      setLearnerDraft({ label: '', legalFirstName: '', legalLastName: '', enrolmentEmail: '' });
      setStatus('Learner saved for future purchases.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Learner could not be saved.');
    }
  };

  const deleteLearner = async (learner: SavedLearner) => {
    if (authenticated) {
      await fetch(`/api/account/learners?id=${encodeURIComponent(learner.id)}`, { method: 'DELETE' });
      await loadServerData();
    } else {
      const next = learners.filter((entry) => entry.id !== learner.id);
      setLearners(next);
      localStorage.setItem('aptenvo-account-learners', JSON.stringify(next));
    }
  };

  const saveCurrentBasket = async () => {
    if (!basket.items.length) {
      setStatus('Add at least one course before saving a basket.');
      return;
    }
    setStatus('Saving basket…');
    const localBasket: SavedBasket = {
      id: `local-basket-${crypto.randomUUID()}`,
      name: basketName.trim() || 'Saved training basket',
      items: basket.items,
      updatedAt: new Date().toISOString(),
    };
    try {
      if (authenticated) {
        const response = await fetch('/api/account/saved-baskets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: localBasket.name, items: localBasket.items }),
        });
        if (!response.ok) throw new Error((await response.json() as { message?: string }).message ?? 'Unable to save basket');
        await loadServerData();
      } else {
        const next = [localBasket, ...savedBaskets];
        setSavedBaskets(next);
        localStorage.setItem('aptenvo-saved-baskets', JSON.stringify(next));
      }
      setStatus('Basket saved for a future purchase.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Basket could not be saved.');
    }
  };

  const restoreBasket = (saved: SavedBasket) => {
    basket.clearBasket();
    saved.items.forEach((item) => basket.addItem(item.courseId, item.quantity));
    setStatus(`“${saved.name}” has been restored to your basket.`);
  };

  const deleteBasket = async (saved: SavedBasket) => {
    if (authenticated) {
      await fetch(`/api/account/saved-baskets?id=${encodeURIComponent(saved.id)}`, { method: 'DELETE' });
      await loadServerData();
    } else {
      const next = savedBaskets.filter((entry) => entry.id !== saved.id);
      setSavedBaskets(next);
      localStorage.setItem('aptenvo-saved-baskets', JSON.stringify(next));
    }
  };

  return (
    <main>
      <section className="page-hero account-hero">
        <div className="container account-hero-grid">
          <div><div className="eyebrow">My Aptenvo</div><h1>Your customer and training dashboard</h1><p>Save reusable customer details, maintain a learner directory and keep baskets ready for future purchases.</p></div>
          <div className="account-status-card">
            <CircleUserRound size={28} />
            <div><strong>{authenticated ? session?.user?.name : 'Device profile'}</strong><span>{authenticated ? session?.user?.email : 'Saved only in this browser until you sign in'}</span></div>
          </div>
        </div>
      </section>

      <section className="section account-section"><div className="container">
        {!session ? <div className="account-loading">Loading My Aptenvo…</div> : (
          <>
            <div className={`account-connection-banner ${authenticated ? 'connected' : ''}`}>
              <div>{authenticated ? <Check size={22} /> : <LogIn size={22} />}<span><strong>{authenticated ? 'Connected to JA Group Services ID' : 'Sign in to sync across devices'}</strong><small>{authenticated ? 'Your saved profile, learners and baskets are stored against your Aptenvo account.' : 'Device saving works now. Sign in to protect and access the information from other devices.'}</small></span></div>
              {authenticated
                ? <a className="button button-secondary" href="/api/auth/logout"><LogOut size={17} /> Sign out</a>
                : <a className="button button-primary" href="/api/auth/login?returnTo=/account"><LogIn size={17} /> Sign in or create account</a>}
            </div>
            {!session.configured && <p className="account-configuration-note">JA Group Services ID is being connected. Until configuration is complete, this dashboard saves information on this device.</p>}
            {status && <div className="account-message" role="status">{status}</div>}

            <div className="account-dashboard-grid">
              <section className="account-panel account-profile-panel">
                <div className="account-panel-heading"><UserRound size={23} /><div><h2>Customer details</h2><p>Save the information Aptenvo should use as the starting point for future purchases.</p></div></div>
                <form className="account-form" onSubmit={saveProfile}>
                  <fieldset><legend>Customer type</legend><div className="account-type-options">
                    <label className={profile.customerType === 'individual' ? 'selected' : ''}><input type="radio" checked={profile.customerType === 'individual'} onChange={() => setProfile({ ...profile, customerType: 'individual' })} /><UserRound size={18} /> Individual</label>
                    <label className={profile.customerType === 'business' ? 'selected' : ''}><input type="radio" checked={profile.customerType === 'business'} onChange={() => setProfile({ ...profile, customerType: 'business' })} /><Building2 size={18} /> Business</label>
                  </div></fieldset>
                  <div className="account-field-grid">
                    <label>Legal first name<input required value={profile.legalFirstName} onChange={(event) => setProfile({ ...profile, legalFirstName: event.target.value })} /></label>
                    <label>Legal last name<input required value={profile.legalLastName} onChange={(event) => setProfile({ ...profile, legalLastName: event.target.value })} /></label>
                  </div>
                  <label>Email address<input type="email" required value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label>
                  {profile.customerType === 'business' && <label>Organisation name<input value={profile.organisationName} onChange={(event) => setProfile({ ...profile, organisationName: event.target.value })} /></label>}
                  <button className="button button-primary" type="submit"><Save size={17} /> Save customer details</button>
                </form>
              </section>

              <section className="account-panel">
                <div className="account-panel-heading"><Users size={23} /><div><h2>Saved learners</h2><p>Keep legal names and enrolment emails ready for repeat or team purchases.</p></div></div>
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
                  {learners.length ? learners.map((learner) => <article key={learner.id}><div><strong>{learner.legalFirstName} {learner.legalLastName}</strong><span>{learner.label || 'Saved learner'} · {learner.enrolmentEmail}</span></div><button type="button" onClick={() => deleteLearner(learner)} aria-label={`Delete ${learner.legalFirstName}`}><Trash2 size={17} /></button></article>) : <p className="empty-account-state">No learners have been saved yet.</p>}
                </div>
              </section>

              <section className="account-panel account-baskets-panel">
                <div className="account-panel-heading"><ShoppingBasket size={23} /><div><h2>Saved baskets</h2><p>Save the current combination of courses and licence quantities, then restore it later.</p></div></div>
                <div className="save-basket-row"><input value={basketName} onChange={(event) => setBasketName(event.target.value)} aria-label="Saved basket name" /><button className="button button-primary" type="button" onClick={saveCurrentBasket}><Save size={17} /> Save current basket ({basket.licenceCount})</button></div>
                <div className="saved-basket-list">
                  {savedBaskets.length ? savedBaskets.map((saved) => {
                    const total = saved.items.reduce((sum, item) => sum + item.quantity, 0);
                    return <article key={saved.id}><div className="saved-basket-icon"><BookOpen size={20} /></div><div><strong>{saved.name}</strong><span>{saved.items.length} different {saved.items.length === 1 ? 'course' : 'courses'} · {total} {total === 1 ? 'licence' : 'licences'}</span><small>{saved.items.map((item) => basketCourseNames.get(item.courseId)).filter(Boolean).slice(0, 3).join(', ')}</small></div><div className="saved-basket-actions"><button type="button" onClick={() => restoreBasket(saved)}>Restore</button><button type="button" onClick={() => deleteBasket(saved)} aria-label={`Delete ${saved.name}`}><Trash2 size={16} /></button></div></article>;
                  }) : <p className="empty-account-state">Your current basket has not been saved yet.</p>}
                </div>
                <Link className="button button-secondary" to="/basket">Open current basket</Link>
              </section>
            </div>
          </>
        )}
      </div></section>
    </main>
  );
}
