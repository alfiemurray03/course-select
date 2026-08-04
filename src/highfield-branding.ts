const HIGHFIELD_LOGO_URL = 'https://www.sfbbplus.co.uk/wp-content/uploads/2022/02/Picture3-1.png';

function createHighfieldLockup(context: 'home' | 'service' | 'footer') {
  const wrapper = document.createElement('div');
  wrapper.className = `highfield-provider-lockup highfield-provider-lockup-${context}`;
  wrapper.dataset.highfieldBranding = context;

  const image = document.createElement('img');
  image.src = HIGHFIELD_LOGO_URL;
  image.alt = 'Highfield';
  image.loading = context === 'home' ? 'eager' : 'lazy';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => wrapper.remove(), { once: true });

  const label = document.createElement('span');
  label.textContent = context === 'footer'
    ? 'Course provider and learning management system'
    : 'Course provider and LMS';

  wrapper.append(image, label);
  return wrapper;
}

function addHighfieldBranding() {
  const homePanel = document.querySelector<HTMLElement>('.home-outcome-panel');
  if (homePanel && !homePanel.querySelector('[data-highfield-branding="home"]')) {
    homePanel.prepend(createHighfieldLockup('home'));
  }

  document.querySelectorAll<HTMLElement>('.service-hero-assurance').forEach((assurance) => {
    const copy = assurance.querySelector<HTMLElement>('div');
    if (copy && !copy.querySelector('[data-highfield-branding="service"]')) {
      copy.prepend(createHighfieldLockup('service'));
    }
  });

  const footerBrand = document.querySelector<HTMLElement>('.footer-brand');
  if (footerBrand && !footerBrand.querySelector('[data-highfield-branding="footer"]')) {
    footerBrand.append(createHighfieldLockup('footer'));
  }
}

function startHighfieldBranding() {
  addHighfieldBranding();
  const observer = new MutationObserver(addHighfieldBranding);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.body) startHighfieldBranding();
else window.addEventListener('DOMContentLoaded', startHighfieldBranding, { once: true });
