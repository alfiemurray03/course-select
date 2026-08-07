export {};

const PUBLIC_NAVIGATION = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About us' },
  { href: '/professional-training', label: 'Highfield Online Training' },
  { href: '/learning-library/courses', label: 'Sousa Murray eLearning courses' },
  { href: '/plans', label: 'Plans' },
] as const;

function isActive(href: string) {
  const path = window.location.pathname;
  if (href === '/') return path === '/';
  if (href === '/about') return path === '/about';
  if (href === '/professional-training') {
    return path === '/professional-training' || path.startsWith('/courses') || path === '/basket';
  }
  if (href === '/learning-library/courses') {
    return path.startsWith('/learning-library') || path.startsWith('/lms');
  }
  if (href === '/plans') return path === '/plans' || path === '/pricing';
  return false;
}

function navigationLink(href: string, label: string) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label;
  if (isActive(href)) link.classList.add('active');
  return link;
}

function simplifyDesktop(nav: HTMLElement) {
  const signature = `${window.location.pathname}:${PUBLIC_NAVIGATION.map((item) => item.label).join('|')}`;
  if (nav.dataset.simpleNavigation === signature) return;
  nav.replaceChildren(...PUBLIC_NAVIGATION.map((item) => navigationLink(item.href, item.label)));
  nav.dataset.simpleNavigation = signature;
}

function simplifyMobile(nav: HTMLElement) {
  const signature = `${window.location.pathname}:${PUBLIC_NAVIGATION.map((item) => item.label).join('|')}`;
  if (nav.dataset.simpleNavigation === signature) return;

  const account = nav.querySelector<HTMLAnchorElement>('.mobile-account')?.cloneNode(true) as HTMLAnchorElement | undefined;
  const basket = nav.querySelector<HTMLAnchorElement>('.mobile-basket-link')?.cloneNode(true) as HTMLAnchorElement | undefined;
  const nodes: Node[] = [];
  if (account) nodes.push(account);
  if (basket) nodes.push(basket);
  nodes.push(...PUBLIC_NAVIGATION.map((item) => navigationLink(item.href, item.label)));
  nav.replaceChildren(...nodes);
  nav.dataset.simpleNavigation = signature;
}

function applySimpleNavigation() {
  document.querySelectorAll<HTMLElement>('.site-header .desktop-nav').forEach(simplifyDesktop);
  document.querySelectorAll<HTMLElement>('.site-header .mobile-nav').forEach(simplifyMobile);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    applySimpleNavigation();
  });
}

schedule();
const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', schedule);
