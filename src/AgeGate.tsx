import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

type GateState = 'checking' | 'required' | 'confirmed' | 'underage';

export default function AgeGate() {
  const [state, setState] = useState<GateState>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/age/status', { credentials: 'same-origin' })
      .then((response) => response.json())
      .then((data: { configured?: boolean; confirmed?: boolean }) => {
        const locallyConfirmed = localStorage.getItem('aptenvo-age-confirmed') === 'yes';
        setState(data.confirmed || (!data.configured && locallyConfirmed) ? 'confirmed' : 'required');
      })
      .catch(() => setState(localStorage.getItem('aptenvo-age-confirmed') === 'yes' ? 'confirmed' : 'required'));
  }, []);

  const confirmAdult = async () => {
    setMessage('Saving your confirmation…');
    try {
      const response = await fetch('/api/age/confirm', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdult: true }),
      });
      if (!response.ok && response.status !== 503) throw new Error('Unable to save confirmation');
      localStorage.setItem('aptenvo-age-confirmed', 'yes');
      localStorage.setItem('aptenvo-age-confirmed-at', new Date().toISOString());
      setState('confirmed');
    } catch {
      setMessage('We could not save the confirmation. Refresh the page and try again.');
    }
  };

  if (state === 'checking' || state === 'confirmed') return null;

  return (
    <div className="age-gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <section className="age-gate-card">
        <div className="age-gate-mark"><ShieldCheck size={30} /></div>
        <span className="age-gate-brand">Sousa Murray eLearning</span>
        {state === 'underage' ? (
          <>
            <h1 id="age-gate-title">Sousa Murray eLearning is an 18+ service</h1>
            <p>We do not sell online training to anyone under the age of 18. You cannot continue to the Sousa Murray eLearning website or checkout.</p>
            <a className="button button-primary" href="https://jagroupservices.co.uk/">Leave Sousa Murray eLearning</a>
          </>
        ) : (
          <>
            <h1 id="age-gate-title">Are you aged 18 or over?</h1>
            <p>Sousa Murray eLearning only accepts customers and purchasers who are at least 18 years old. Confirm your age to browse courses and use checkout.</p>
            <div className="age-gate-actions">
              <button className="button button-primary" type="button" onClick={confirmAdult}>Yes, I am 18 or over</button>
              <button className="button button-secondary" type="button" onClick={() => setState('underage')}>No, I am under 18</button>
            </div>
            {message && <p className="age-gate-message" role="status">{message}</p>}
          </>
        )}
      </section>
    </div>
  );
}
