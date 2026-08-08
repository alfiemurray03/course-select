import { FREE_TRIAL_OFFERS, freeTrialOfferForSlug, type FreeTrialOffer } from './freeTrialOffers';

const TRIAL_MARKER = 'data-free-course-trial';

type TrialStatus = {
  courseSlug: string;
  courseTitle: string;
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
let coursePanelSlug = '';
let dashboardState: 'idle' | 'loading' | 'loaded' = 'idle';

async function trialRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin', cache: 'no-store', ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({})) as T & { message?: string; error?: string };
  if (!response.ok) {
    const error = new Error(body.message ?? body.error ?? `Request failed (${response.status}).`);
    Object.assign(error, { status: response.status, body });
    throw error;
  }
  return body;
}

function statusUrl(offer: FreeTrialOffer) {
  return `/api/lms/course-trial?courseSlug=${encodeURIComponent(offer.courseSlug)}`;
}

function formatExpiry(value: string | null) {
  if (!value) return 'the end of your trial period';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    const offer = FREE_TRIAL_OFFERS.find((item) => item.courseTitle === title);
    if (!offer) return;

    if (!card.querySelector(`[${TRIAL_MARKER}="catalogue-badge"]`)) {
      const badge = document.createElement('span');
      badge.className = 'free-course-trial-catalogue-badge';
      badge.setAttribute(TRIAL_MARKER, 'catalogue-badge');
      badge.textContent = 'Free 7-day trial';
      card.querySelector('.plms-course-labels')?.insertAdjacentElement('afterend', badge);
    }

    const actions = card.querySelector<HTMLElement>('.sml-own-course-card-actions');
    if (actions && !actions.querySelector(`[${TRIAL_MARKER}="catalogue-action"]`)) {
      const trial = document.createElement('a');
      trial.href = `/lms/course/${offer.courseSlug}`;
      trial.className = 'sml-own-course-buy-plan free-course-trial-catalogue-action';
      trial.setAttribute(TRIAL_MARKER, 'catalogue-action');
      trial.textContent = 'Try free for 7 days';
      actions.append(trial);
    }
  });
}

function currentCourseOffer() {
  const match = window.location.pathname.match(/^\/lms\/course\/([^/]+)$/);
  return match ? freeTrialOfferForSlug(decodeURIComponent(match[1])) : null;
}

function trialHost() {
  return document.querySelector<HTMLElement>('.pcp-access-card')
    ?? document.querySelector<HTMLElement>('.plms-course-information-grid > aside');
}

function trialPanelShell(host: HTMLElement) {
  let panel = host.querySelector<HTMLElement>(`[${TRIAL_MARKER}="course"]`);
  if (panel) return panel;
  panel = document.createElement('section');
  panel.className = 'free-course-trial-card';
  panel.setAttribute(TRIAL_MARKER, 'course');
  host.append(panel);
  return panel;
}

function renderPanel(panel: HTMLElement, offer: FreeTrialOffer, status: TrialStatus, message = '') {
  if (status.active) {
    panel.innerHTML = `
      <span class="free-course-trial-badge">Free trial active</span>
      <h3>Your 7-day programme trial is ready</h3>
      <p>You have learner access to <strong>${offer.courseTitle}</strong> until <strong>${formatExpiry(status.expiresAt)}</strong>. Continue into the Sousa Murray LMS and work through as much of the programme as you wish during the trial window.</p>
      <div class="free-course-trial-price"><strong>£0.00</strong><span>7 days · one named learner</span></div>
    `;
    return;
  }

  if (status.claimed) {
    panel.innerHTML = `
      <span class="free-course-trial-badge used">Trial used</span>
      <h3>Your ${offer.courseTitle} trial has ended</h3>
      <p>This programme trial can be claimed once per learning account. Your learning record remains on your Sousa Murray LMS account, and the full programme remains available by individual purchase or an eligible Learning Library plan.</p>
    `;
    return;
  }

  panel.innerHTML = `
    <span class="free-course-trial-badge">Free 7-day trial</span>
    <h3>Try ${offer.courseTitle}</h3>
    <p>Explore the real 12-week programme in the Sousa Murray LMS for 7 days, including lessons, formative assessments and applied learning activities available during your trial period.</p>
    <div class="free-course-trial-price"><strong>£0.00</strong><span>7 days · one named learner</span></div>
    ${message ? '<p class="free-course-trial-message"></p>' : ''}
    <button type="button" class="plms-primary-action free-course-trial-action" ${status.checkoutReady ? '' : 'disabled'}>
      ${status.checkoutReady ? 'Start free trial with Stripe' : 'Trial checkout unavailable'}
    </button>
    <small>You will continue through JA Group Services Central Payments and Stripe Checkout. The order total is £0.00, so no payment is charged. One trial claim is available per eligible programme, per learning account.</small>
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
        body: JSON.stringify({ courseSlug: offer.courseSlug }),
      });
      window.location.assign(checkout.url);
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Start free trial with Stripe';
      renderPanel(panel, offer, status, error instanceof Error ? error.message : 'The free trial checkout could not be started.');
    }
  }, { once: true });
}

async function pollAfterCheckout(panel: HTMLElement, offer: FreeTrialOffer) {
  coursePanelState = 'polling';
  panel.innerHTML = `<span class="free-course-trial-badge">Stripe Checkout complete</span><h3>Setting up your programme access</h3><p>We are confirming the £0.00 Central Payments order and attaching the 7-day ${offer.courseTitle} trial to your Sousa Murray LMS account.</p><div class="free-course-trial-loading" aria-label="Confirming trial access"></div>`;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const status = await trialRequest<TrialStatus>(statusUrl(offer));
      if (status.active) { cleanTrialQuery(); window.location.reload(); return; }
    } catch {}
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
  }
  panel.innerHTML = `<span class="free-course-trial-badge">Confirmation pending</span><h3>Your Stripe order is still being confirmed</h3><p>Refresh this page shortly and the ${offer.courseTitle} trial will be attached automatically.</p>`;
  coursePanelState = 'loaded';
}

async function courseTrialPanel() {
  const offer = currentCourseOffer();
  if (!offer) return;
  if (coursePanelSlug !== offer.courseSlug) {
    coursePanelSlug = offer.courseSlug;
    coursePanelState = 'idle';
  }
  if (coursePanelState !== 'idle') return;
  const host = trialHost();
  if (!host) return;
  coursePanelState = 'loading';
  const panel = trialPanelShell(host);
  const trialResult = new URL(window.location.href).searchParams.get('trial');
  if (trialResult === 'success') { await pollAfterCheckout(panel, offer); return; }
  try {
    const status = await trialRequest<TrialStatus>(statusUrl(offer));
    renderPanel(panel, offer, status, trialResult === 'cancelled' ? 'Stripe Checkout was cancelled. No trial has been claimed.' : '');
  } catch { panel.remove(); }
  finally { coursePanelState = 'loaded'; }
}

async function dashboardTrialAccess() {
  if (window.location.pathname !== '/lms/dashboard' || dashboardState !== 'idle') return;
  const dashboard = document.querySelector<HTMLElement>('.smlms-dashboard') ?? document.querySelector<HTMLElement>('.plms-dashboard');
  const header = dashboard?.querySelector(':scope > header');
  if (!dashboard || !header) return;
  dashboardState = 'loading';
  try {
    const statuses = await Promise.all(FREE_TRIAL_OFFERS.map(async (offer) => {
      try { return { offer, status: await trialRequest<TrialStatus>(statusUrl(offer)) }; }
      catch { return { offer, status: null }; }
    }));
    let insertionPoint: Element = header;
    for (const { offer, status } of statuses) {
      if (!status?.active || dashboard.querySelector(`[${TRIAL_MARKER}="dashboard-${offer.courseSlug}"]`)) continue;
      const card = document.createElement('section');
      card.className = 'free-course-trial-dashboard';
      card.setAttribute(TRIAL_MARKER, `dashboard-${offer.courseSlug}`);
      card.innerHTML = `<div><span class="free-course-trial-badge">Free trial active</span><h2>${offer.courseTitle}</h2><p>Programme access is active until <strong>${formatExpiry(status.expiresAt)}</strong>.</p></div><a href="/lms/course/${offer.courseSlug}">Open trial programme →</a>`;
      insertionPoint.insertAdjacentElement('afterend', card);
      insertionPoint = card;
    }
  } catch {}
  finally { dashboardState = 'loaded'; }
}

function applyFreeTrialUi() { catalogueBadge(); void courseTrialPanel(); void dashboardTrialAccess(); }
let scheduled = false;
function schedule() { if (scheduled) return; scheduled = true; queueMicrotask(() => { scheduled = false; applyFreeTrialUi(); }); }
schedule();
const freeCourseTrialObserver = new MutationObserver(schedule);
freeCourseTrialObserver.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', schedule);
