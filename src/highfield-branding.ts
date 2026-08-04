const HIGHFIELD_LOGO_URL = 'https://www.sfbbplus.co.uk/wp-content/uploads/2022/02/Picture3-1.png';
const HIGHFIELD_LMS_URL = 'https://lms.highfieldelearning.com/';

function createHighfieldLockup(context: 'home' | 'service') {
  const wrapper = document.createElement('a');
  wrapper.className = `highfield-provider-lockup highfield-provider-lockup-${context}`;
  wrapper.dataset.highfieldBranding = context;
  wrapper.href = HIGHFIELD_LMS_URL;
  wrapper.target = '_blank';
  wrapper.rel = 'noopener noreferrer';
  wrapper.setAttribute('aria-label', 'Open the Highfield Learning Management System in a new tab');

  const image = document.createElement('img');
  image.src = HIGHFIELD_LOGO_URL;
  image.alt = 'Highfield Online Training reseller';
  image.loading = context === 'home' ? 'eager' : 'lazy';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => wrapper.remove(), { once: true });

  const label = document.createElement('span');
  label.textContent = 'Course provider and LMS · Open Highfield LMS';

  wrapper.append(image, label);
  return wrapper;
}

function addHighfieldBranding() {
  // Remove any footer logo left behind by an older deployed bundle.
  document.querySelectorAll<HTMLElement>('[data-highfield-branding="footer"]').forEach((node) => node.remove());

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
}

function startHighfieldBranding() {
  addHighfieldBranding();
  const observer = new MutationObserver(addHighfieldBranding);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.body) startHighfieldBranding();
else window.addEventListener('DOMContentLoaded', startHighfieldBranding, { once: true });
