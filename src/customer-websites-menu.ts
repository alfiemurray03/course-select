type CustomerWebsite = {
  name: string;
  href: string;
};

const customerWebsites: CustomerWebsite[] = [
  { name: 'JA Group Services', href: 'https://jagroupservices.co.uk/' },
  { name: 'Profile Centre', href: 'https://profilecentre.jagroupservices.co.uk/' },
  { name: 'Planyx', href: 'https://planyx.jagroupservices.co.uk/' },
  { name: 'JA Domain Hub', href: 'https://jadomainhub.jagroupservices.co.uk/' },
  { name: 'Aptenvo', href: 'https://aptenvo.jagroupservices.co.uk/' },
];

const desktopMenuSelector = '[data-aptenvo-customer-websites-menu]';
const mobileMenuSelector = '[data-aptenvo-customer-websites-mobile]';

function createWebsiteLink(website: CustomerWebsite, mobile = false) {
  const link = document.createElement('a');
  link.href = website.href;
  link.textContent = website.name;
  link.className = mobile ? 'aptenvo-mobile-websites-link' : 'aptenvo-websites-link';
  if (!mobile) link.setAttribute('role', 'menuitem');
  return link;
}

function closeDesktopMenus(except?: HTMLElement) {
  document.querySelectorAll<HTMLElement>(desktopMenuSelector).forEach((menu) => {
    if (menu === except) return;
    const trigger = menu.querySelector<HTMLButtonElement>('.aptenvo-websites-trigger');
    const panel = menu.querySelector<HTMLElement>('.aptenvo-websites-panel');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (panel) panel.hidden = true;
  });
}

function createDesktopMenu() {
  const wrapper = document.createElement('div');
  wrapper.className = 'aptenvo-websites-menu';
  wrapper.dataset.aptenvoCustomerWebsitesMenu = 'true';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'aptenvo-websites-trigger';
  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = '<span>Our Websites</span><span class="aptenvo-websites-chevron" aria-hidden="true">⌄</span>';

  const panel = document.createElement('div');
  panel.className = 'aptenvo-websites-panel';
  panel.setAttribute('role', 'menu');
  panel.hidden = true;

  customerWebsites.forEach((website) => {
    const link = createWebsiteLink(website);
    link.addEventListener('click', () => {
      trigger.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
    });
    panel.append(link);
  });

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    const nextOpen = panel.hidden;
    closeDesktopMenus(wrapper);
    panel.hidden = !nextOpen;
    trigger.setAttribute('aria-expanded', String(nextOpen));
  });

  wrapper.append(trigger, panel);
  return wrapper;
}

function createMobileMenu() {
  const details = document.createElement('details');
  details.className = 'aptenvo-mobile-websites-menu';
  details.dataset.aptenvoCustomerWebsitesMobile = 'true';

  const summary = document.createElement('summary');
  summary.innerHTML = '<span>Our Websites</span><span class="aptenvo-mobile-websites-chevron" aria-hidden="true">⌄</span>';

  const links = document.createElement('div');
  links.className = 'aptenvo-mobile-websites-links';
  customerWebsites.forEach((website) => links.append(createWebsiteLink(website, true)));

  details.append(summary, links);
  return details;
}

function synchroniseMenus() {
  document.querySelectorAll<HTMLElement>('.header-actions').forEach((headerActions) => {
    if (headerActions.querySelector(desktopMenuSelector)) return;
    const menu = createDesktopMenu();
    const mobileButton = headerActions.querySelector('.mobile-menu-button');
    headerActions.insertBefore(menu, mobileButton);
  });

  document.querySelectorAll<HTMLElement>('.mobile-nav').forEach((mobileNavigation) => {
    if (mobileNavigation.querySelector(mobileMenuSelector)) return;
    const menu = createMobileMenu();
    const basketLink = mobileNavigation.querySelector('.mobile-basket-link');
    if (basketLink?.nextSibling) mobileNavigation.insertBefore(menu, basketLink.nextSibling);
    else if (basketLink) mobileNavigation.append(menu);
    else mobileNavigation.prepend(menu);
  });
}

function startCustomerWebsitesMenu() {
  synchroniseMenus();

  const observer = new MutationObserver(synchroniseMenus);
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('pointerdown', (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const activeMenu = target instanceof Element ? target.closest<HTMLElement>(desktopMenuSelector) : null;
    closeDesktopMenus(activeMenu ?? undefined);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDesktopMenus();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startCustomerWebsitesMenu, { once: true });
} else {
  startCustomerWebsitesMenu();
}
