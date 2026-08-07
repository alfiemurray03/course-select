const TRIAL_COURSE_SLUG = 'ai-literacy-for-everyday-work';
const TRIAL_COURSE_TITLE = 'AI Literacy for Everyday Work';
const TRIAL_MARKER = 'data-free-course-trial';

type TrialStatus = {
  courseSlug: string;
  durationDays: number;
  pricePence: number;
  checkoutProvider: string;
  checkoutReady: boolean;
  available: boolean;
  claimed: boolean;
  active: boolean;
  status: 'available' | 'active' | 'expired';
  startsAt: string | null;
  expiresAt: string | null;
  source: string | null;
};

let coursePanelState: 'idle' | 'loading' | 'loaded' | 'polling' = 'idle';
let dashboardState: 'idle' | 'loading' | 'loaded' = 'idle';

async function trialRequest<T>(url: string, init?: RequestInit): Promise<T> {
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
    Object.assign(error, { status: response.status, body });
    throw error;
  }
  return body;
}

function formatExpiry(value: string | null) {
  if (!value) return 'the end of your trial period';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cleanTrialQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete('trial');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

function catalogueBadge() {
  if (window.location.pathname !== '/learning-library/courses') return;
  document.querySelectorAll<HTMLElement>('.plms-course-grid > article').forEach((card) => {
    const title = card.querySelector('h2')?.textContent?.trim();
    if (title !== TRIAL_COURSE_TITLE || card.querySelector(`[${TRIAL_MARKER}="catalogue"]`)) return;
    const badge = document.createElement('span');
    badge.className = 'free-course-trial-catalogue-badge';
    badge.setAttribute(TRIAL_MARKER, 'catalogue');
    badge.textContent = 'Free 7-day trial';
    const labels = card.querySelector('.plms-course-labels');
    labels?.insertAdjacentElement('afterend', badge);
  });
}

function trialPanelShell(aside: HTMLElement) {
  let panel = aside.querySelector<HTMLElement>(`[${TRIAL_MARKER}="course"]`);
  if (panel) return panel;
  panel = document.createElement('section');
  panel.className = 'free-course-trial-card';
  panel.setAttribute(TRIAL_MARKER, 'course');
  const dl = aside.querySelector('dl');
  if (dl) dl.insertAdjacentElement('afterend', panel);
  else aside.append(panel);
  return panel;
}

function renderPanel(panel: HTMLElement, status: TrialStatus, message = '') {
  if (status.active) {
    panel.innerHTML = `
      <span class="free-course-trial-badge">Free trial active</span>
      <h3>Your 7-day course trial is ready</h3>
      <p>You have full learner access to this course until <strong>${formatExpiry(status.expiresAt)}</strong>. Use the enrol/start button on this page to begin learning.</p>
      <div class="free-course-trial-price"><strong>£0.00</strong><span>one named learner</span></div>
    `;
    return;
  }

  if (status.claimed) {
    panel.innerHTML = `
      <span class="free-course-trial-badge used">Trial used</span>
      <h3>Your free trial has ended</h3>
      <p>This course trial can be claimed once per learning account. Existing learning and certificate records remain associated with your Sousa Murray LMS account.</p>
    `;
    return;
  }

  panel.innerHTML = `
    <span class="free-course-trial-badge">Free 7-day trial</span>
    <h3>Try ${TRIAL_COURSE_TITLE}</h3>
    <p>Get full access to this course for 7 days, including lessons, knowledge checks, the final assessment and completion certificate if you pass within the trial period.</p>
    <div class="free-course-trial-price"><strong>£0.00</strong><span>7 days · one named learner</span></div>
    ${message ? '<p class="free-course-trial-message"></p>' : ''}
    <button type="button" class="plms-primary-action free-course-trial-action" ${status.checkoutReady ? '' : 'disabled'}>
      ${status.checkoutReady ? 'Start free trial with Stripe' : 'Trial checkout unavailable'}
    </button>
    <small>You will continue through Stripe Checkout. Because the order total is £0.00, Stripe will not collect payment details. One free trial claim is available per learning account.</small>
  `;

  if (message) {
    const messageNode = panel.querySelector<HTMLElement>('.free-course-trial-message');
    if (messageNode) messageNode.textContent = message;
  }

  const button = panel.querySelector<HTMLButtonElement>('.free-course-trial-action');
  button?.addEventListener('click', async () => {
    if (!button || button.disabled) return;
    button.disabled = true;
    button.textContent = 'Opening Stripe Checkout…';
    try {
      const checkout = await trialRequest<{ url: string }>('/api/lms/course-trial', {
        method: 'POST',
        body: JSON.stringify({ courseSlug: TRIAL_COURSE_SLUG }),
      });
      window.location.assign(checkout.url);
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Start free trial with Stripe';
      const text = error instanceof Error ? error.message : 'The free trial checkout could not be started.';
      renderPanel(panel, status, text);
    }
  }, { once: true });
}

async function pollAfterCheckout(panel: HTMLElement) {
  coursePanelState = 'polling';
  panel.innerHTML = `
    <span class="free-course-trial-badge">Stripe Checkout complete</span>
    <h3>Setting up your course access</h3>
    <p>We are confirming the completed £0.00 Stripe order with JA Group Services Central Payments and attaching the trial to your Sousa Murray LMS account.</p>
    <div class="free-course-trial-loading" aria-label="Confirming trial access"></div>
  `;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const status = await trialRequest<TrialStatus>('/api/lms/course-trial');
      if (status.active) {
        cleanTrialQuery();
        window.location.reload();
        return;
      }
    } catch {
      // Central webhook/status propagation can take a few seconds after Checkout returns.
    }
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
  }

  panel.innerHTML = `
    <span class="free-course-trial-badge">Confirmation pending</span>
    <h3>Your Stripe order is still being confirmed</h3>
    <p>Your checkout has returned successfully, but Central Payments has not yet exposed the completed order to the LMS. Refresh this page shortly and your trial will be attached automatically.</p>
  `;
  coursePanelState = 'loaded';
}

async function courseTrialPanel() {
  if (window.location.pathname !== `/lms/course/${TRIAL_COURSE_SLUG}`) return;
  if (coursePanelState !== 'idle') return;
  const aside = document.querySelector<HTMLElement>('.plms-course-information-grid > aside');
  if (!aside) return;

  coursePanelState = 'loading';
  const panel = trialPanelShell(aside);
  const trialResult = new URL(window.location.href).searchParams.get('trial');
  if (trialResult === 'success') {
    await pollAfterCheckout(panel);
    return;
  }

  try {
    const status = await trialRequest<TrialStatus>('/api/lms/course-trial');
    const needsAccess = aside.textContent?.includes('An active plan containing this course is required.') ?? false;
    if (status.active || status.claimed || needsAccess) {
      renderPanel(panel, status, trialResult === 'cancelled' ? 'Stripe Checkout was cancelled. No trial has been claimed.' : '');
    } else {
      panel.remove();
    }
  } catch {
    panel.remove();
  } finally {
    if (coursePanelState !== 'polling') coursePanelState = 'loaded';
  }
}

async function dashboardTrialAccess() {
  if (window.location.pathname !== '/lms/dashboard') return;
  if (dashboardState !== 'idle') return;
  const dashboard = document.querySelector<HTMLElement>('.plms-dashboard');
  const header = dashboard?.querySelector(':scope > header');
  if (!dashboard || !header) return;

  dashboardState = 'loading';
  try {
    const status = await trialRequest<TrialStatus>('/api/lms/course-trial');
    if (!status.active || dashboard.querySelector(`[${TRIAL_MARKER}="dashboard"]`)) return;

    const card = document.createElement('section');
    card.className = 'free-course-trial-dashboard';
    card.setAttribute(TRIAL_MARKER, 'dashboard');
    card.innerHTML = `
      <div>
        <span class="free-course-trial-badge">Free trial active</span>
        <h2>${TRIAL_COURSE_TITLE}</h2>
        <p>Full course access is active until <strong>${formatExpiry(status.expiresAt)}</strong>.</p>
      </div>
      <a href="/lms/course/${TRIAL_COURSE_SLUG}">Open trial course →</a>
    `;
    header.insertAdjacentElement('afterend', card);
  } catch {
    // The standard dashboard remains usable if trial status cannot be loaded.
  } finally {
    dashboardState = 'loaded';
  }
}

function applyFreeTrialUi() {
  catalogueBadge();
  void courseTrialPanel();
  void dashboardTrialAccess();
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    applyFreeTrialUi();
  });
}

schedule();
const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', schedule);
