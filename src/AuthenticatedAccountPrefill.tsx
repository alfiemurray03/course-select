import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type SessionState = {
  authenticated?: boolean;
};

type AccountProfileResponse = {
  profile?: {
    customer_type?: 'individual' | 'business';
    legal_first_name?: string;
    legal_last_name?: string;
    email?: string;
    organisation_name?: string;
  } | null;
};

type LearnerResponse = {
  learners?: Array<{
    legal_first_name?: string;
    legal_last_name?: string;
    enrolment_email?: string;
  }>;
};

function setInputValue(input: HTMLInputElement, value: string) {
  if (!value || input.value) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export default function AuthenticatedAccountPrefill() {
  const location = useLocation();

  useEffect(() => {
    // Remove the legacy unsigned device-profile feature. The active shopping basket is not removed.
    localStorage.removeItem('aptenvo-account-profile');
    localStorage.removeItem('aptenvo-account-learners');
    localStorage.removeItem('aptenvo-saved-baskets');

    if (location.pathname !== '/basket') return;
    let cancelled = false;
    let observer: MutationObserver | null = null;

    const load = async () => {
      try {
        const sessionResponse = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
        const session = await sessionResponse.json() as SessionState;
        if (!session.authenticated || cancelled) return;

        const [profileResponse, learnersResponse] = await Promise.all([
          fetch('/api/account/profile', { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/account/learners', { credentials: 'same-origin', cache: 'no-store' }),
        ]);
        if (!profileResponse.ok || !learnersResponse.ok || cancelled) return;

        const profileData = await profileResponse.json() as AccountProfileResponse;
        const learnerData = await learnersResponse.json() as LearnerResponse;
        const profile = profileData.profile;
        const learners = learnerData.learners ?? [];

        const apply = () => {
          if (cancelled) return;
          if (profile) {
            const type = profile.customer_type === 'business' ? 'business' : 'individual';
            const typeInput = document.querySelector<HTMLInputElement>(`input[name="customer-type"][value="${type}"]`);
            if (typeInput && !document.querySelector<HTMLInputElement>('input[name="customer-type"]:checked')) typeInput.click();

            const firstName = document.querySelector<HTMLInputElement>('input[autocomplete="given-name"]');
            const lastName = document.querySelector<HTMLInputElement>('input[autocomplete="family-name"]');
            const email = document.querySelector<HTMLInputElement>('input[autocomplete="email"]');
            const organisation = document.querySelector<HTMLInputElement>('input[autocomplete="organization"]');
            if (firstName) setInputValue(firstName, profile.legal_first_name ?? '');
            if (lastName) setInputValue(lastName, profile.legal_last_name ?? '');
            if (email) setInputValue(email, profile.email ?? '');
            if (organisation) setInputValue(organisation, profile.organisation_name ?? '');
          }

          const rows = [...document.querySelectorAll<HTMLElement>('.learner-entry-row')];
          const primary = profile?.legal_first_name && profile?.legal_last_name && profile?.email
            ? [{
                legal_first_name: profile.legal_first_name,
                legal_last_name: profile.legal_last_name,
                enrolment_email: profile.email,
              }]
            : [];
          const available = [...primary, ...learners];

          rows.forEach((row, index) => {
            const learner = available[index];
            if (!learner) return;
            const inputs = row.querySelectorAll<HTMLInputElement>('input');
            if (inputs[0]) setInputValue(inputs[0], learner.legal_first_name ?? '');
            if (inputs[1]) setInputValue(inputs[1], learner.legal_last_name ?? '');
            if (inputs[2]) setInputValue(inputs[2], learner.enrolment_email ?? '');
          });
        };

        apply();
        observer = new MutationObserver(apply);
        observer.observe(document.body, { childList: true, subtree: true });
      } catch {
        // Checkout remains fully usable without saved-account prefill.
      }
    };

    void load();
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [location.pathname]);

  return null;
}
