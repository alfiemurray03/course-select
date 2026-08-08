export {};

const HIGHFIELD_KEY = 'aptenvo-basket-v1';
const OWN_KEY = 'sousa-murray-learning-course-basket-v2';
const HEADER_MARKER = 'sousa-murray-elearning';

function storedArray(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function basketCount() {
  const highfield = new Set(storedArray(HIGHFIELD_KEY)
    .map((item) => item && typeof item === 'object' ? String((item as { courseId?: string }).courseId || '') : '')
    .filter(Boolean));
  const own = new Set(storedArray(OWN_KEY)
    .map((item) => item && typeof item === 'object' ? String((item as { courseSlug?: string }).courseSlug || '') : '')
    .filter(Boolean));
  return highfield.size + own.size;
}

function setBasketButton(button: HTMLAnchorElement, count: number) {
  if (button.getAttribute('href') !== '/basket') button.setAttribute('href', '/basket');
  button.title = 'Basket';
  button.setAttribute('aria-label', `Basket with ${count} selected ${count === 1 ? 'course' : 'courses'}`);

  const label = button.querySelector<HTMLElement>('.basket-header-label');
  if (label && label.textContent !== 'Basket') label.textContent = 'Basket';

  let badge = button.querySelector<HTMLElement>('.basket-count-badge');
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'basket-count-badge';
      button.append(badge);
    }
    if (badge.textContent !== String(count)) badge.textContent = String(count);
  } else {
    badge?.remove();
  }
}

function normaliseDesktopActions(header: HTMLElement, count: number) {
  const basketButtons = [...header.querySelectorAll<HTMLAnchorElement>('.header-actions a.basket-header-button')];
  const primaryBasket = basketButtons[0];
  if (primaryBasket) setBasketButton(primaryBasket, count);
  basketButtons.slice(1).forEach((button) => button.remove());

  const account = header.querySelector<HTMLAnchorElement>('.header-actions a.desktop-account');
  if (account) {
    account.href = '/lms/dashboard';
    const icon = account.querySelector('svg')?.cloneNode(true);
    account.replaceChildren();
    if (icon) account.append(icon);
    account.append(document.createTextNode(' My Sousa Murray eLearning'));
  }
}

function normaliseMobileActions(header: HTMLElement, count: number) {
  const nav = header.querySelector<HTMLElement>('.mobile-nav');
  if (!nav) return;

  const account = nav.querySelector<HTMLAnchorElement>('.mobile-account');
  if (account) {
    account.href = '/lms/dashboard';
    const icon = account.querySelector('svg')?.cloneNode(true);
    account.replaceChildren();
    if (icon) account.append(icon);
    account.append(document.createTextNode(' My Sousa Murray eLearning'));
  }

  const basketLinks = [...nav.querySelectorAll<HTMLAnchorElement>('.mobile-basket-link')];
  const basket = basketLinks[0];
  if (basket) {
    basket.href = '/basket';
    const icon = basket.querySelector('svg')?.cloneNode(true);
    basket.replaceChildren();
    if (icon) basket.append(icon);
    basket.append(document.createTextNode(` Basket${count > 0 ? ` (${count})` : ''}`));
  }
  basketLinks.slice(1).forEach((link) => link.remove());
}

function normalisePublicHeader() {
  if (window.location.pathname.startsWith('/lms')) return;
  const count = basketCount();
  document.querySelectorAll<HTMLElement>('.site-header').forEach((header) => {
    header.dataset.publicHeader = HEADER_MARKER;
    normaliseDesktopActions(header, count);
    normaliseMobileActions(header, count);
  });
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    normalisePublicHeader();
  });
}

schedule();
window.addEventListener('storage', schedule);
window.addEventListener('popstate', schedule);
window.addEventListener('sousa-murray-learning-course-basket-sync', schedule);
const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, { childList: true, subtree: true });
