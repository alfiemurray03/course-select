const CURRENT_NAVIGATION = [
  ['/', 'Home'],
  ['/courses', 'Courses'],
  ['/individuals', 'Individuals'],
  ['/organisations', 'Organisations'],
  ['/how-courses-are-delivered', 'Delivery'],
  ['/about', 'About'],
  ['/support', 'Help'],
  ['/contact', 'Contact'],
] as const;

function isActiveRoute(href: string) {
  const path = window.location.pathname;
  if (href === '/') return path === '/';
  if (href === '/courses') return path === '/courses' || path.startsWith('/courses/') || path.startsWith('/course/');
  return path === href || path.startsWith(`${href}/`);
}

function makeLink(href: string, label: string) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label;
  if (isActiveRoute(href)) {
    link.classList.add('active');
    link.setAttribute('aria-current', 'page');
  }
  return link;
}

function normaliseDesktopNavigation() {
  const navigation = document.querySelector<HTMLElement>('.desktop-nav');
  if (!navigation) return;

  const courseLink = navigation.querySelector<HTMLAnchorElement>('a[href="/courses"]');
  const hasLegacyNavigation = Boolean(
    navigation.querySelector('.nav-dropdown')
    || courseLink?.textContent?.trim().toLowerCase().startsWith('browse'),
  );
  if (!hasLegacyNavigation || navigation.dataset.aptenvoUnified === 'true') return;

  navigation.replaceChildren(...CURRENT_NAVIGATION.map(([href, label]) => makeLink(href, label)));
  navigation.dataset.aptenvoUnified = 'true';
}

function normaliseAccountButton() {
  const account = document.querySelector<HTMLAnchorElement>('.account-button.desktop-account');
  if (!account || account.dataset.aptenvoUnified === 'true') return;

  const icon = account.querySelector('svg');
  account.replaceChildren();
  if (icon) account.append(icon);
  account.append(document.createTextNode(' My Sousa Murray eLearning'));
  account.href = '/account';
  account.dataset.aptenvoUnified = 'true';
}

function normaliseMobileNavigation() {
  const navigation = document.querySelector<HTMLElement>('.mobile-nav');
  if (!navigation || navigation.dataset.aptenvoUnified === 'true') return;

  const oldCourseLink = navigation.querySelector<HTMLAnchorElement>('a[href="/courses"]');
  if (!oldCourseLink?.textContent?.toLowerCase().includes('browse')) return;

  const account = makeLink('/account', 'My Sousa Murray eLearning');
  account.className = 'mobile-account';

  const basket = makeLink('/basket', 'Basket');
  basket.className = 'mobile-basket-link';
  const badge = document.querySelector<HTMLElement>('.basket-count-badge');
  if (badge?.textContent?.trim()) basket.textContent = `Basket (${badge.textContent.trim()})`;

  navigation.replaceChildren(
    account,
    basket,
    ...CURRENT_NAVIGATION.map(([href, label]) => makeLink(href, label)),
  );
  navigation.dataset.aptenvoUnified = 'true';
}

function replaceLegacyCatalogueWording() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const original = node.nodeValue ?? '';
    const trimmed = original.trim();
    let replacement = original;

    if (/^Search 101 Highfield Online Training courses/i.test(trimmed)) {
      replacement = original.replace(
        /Search 101 Highfield Online Training courses and focused modules/i,
        'Search a wide range of Highfield Online Training courses and focused modules',
      );
    }

    if (trimmed === '101 results') {
      replacement = original.replace('101 results', 'All available courses');
    }

    if (replacement !== original) node.nodeValue = replacement;
  }
}

function normaliseLegacyRoute() {
  normaliseDesktopNavigation();
  normaliseAccountButton();
  normaliseMobileNavigation();
  replaceLegacyCatalogueWording();
}

normaliseLegacyRoute();

const observer = new MutationObserver(() => normaliseLegacyRoute());
observer.observe(document.documentElement, { childList: true, subtree: true });
