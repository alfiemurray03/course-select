import { FileCheck2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const CONSENT_KEY = 'aptenvo-digital-supply-consent';

function installCheckoutConsentBridge() {
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (url.endsWith('/api/checkout') && init?.body instanceof FormData) {
      const form = init.body;
      const rawPayload = form.get('payload');
      if (typeof rawPayload === 'string') {
        try {
          const payload = JSON.parse(rawPayload) as Record<string, unknown>;
          payload.adultConfirmed = localStorage.getItem('aptenvo-age-confirmed') === 'yes';
          payload.adultConfirmedAt = localStorage.getItem('aptenvo-age-confirmed-at') ?? new Date().toISOString();
          payload.digitalContentConsent = sessionStorage.getItem(CONSENT_KEY) === 'accepted';
          payload.digitalContentConsentRecordedAt = new Date().toISOString();
          form.set('payload', JSON.stringify(payload));
        } catch {
          // The checkout endpoint will reject an invalid payload.
        }
      }
    }

    return original(input, init);
  };

  return () => { window.fetch = original; };
}

export default function DigitalSupplyConsent() {
  const [target, setTarget] = useState<Element | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => installCheckoutConsentBridge(), []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('checkout') === 'success') sessionStorage.removeItem(CONSENT_KEY);
    setAccepted(false);
    sessionStorage.removeItem(CONSENT_KEY);
  }, []);

  useEffect(() => {
    const locate = () => setTarget(document.querySelector('.customer-declarations'));
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!target) return null;

  return createPortal(
    <label className="provider-consent-field digital-supply-consent">
      <input
        type="checkbox"
        required
        checked={accepted}
        onChange={(event) => {
          const next = event.target.checked;
          setAccepted(next);
          if (next) sessionStorage.setItem(CONSENT_KEY, 'accepted');
          else sessionStorage.removeItem(CONSENT_KEY);
        }}
      />
      <span><strong><FileCheck2 size={16} /> Immediate digital supply and cancellation acknowledgement</strong>I request Sousa Murray eLearning to begin course enrolment and digital supply without waiting for the normal cancellation period. I understand that my change-of-mind cancellation right ends once course access is activated or learning begins. My statutory rights where digital content is faulty, misdescribed or improperly supplied remain unaffected.</span>
    </label>,
    target,
  );
}
