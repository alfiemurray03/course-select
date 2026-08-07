import { libraryCatalogueStats } from './libraryCatalogue';

const MARKER = 'data-course-family-boundary';

function makeBoundary(kind: 'library' | 'highfield', title: string, copy: string) {
  const element = document.createElement('div');
  element.className = `course-family-boundary course-family-boundary-${kind}`;
  element.setAttribute(MARKER, kind);
  element.innerHTML = `<div><strong>${title}</strong><span>${copy}</span></div>`;
  return element;
}

function addBoundaryBefore(target: Element | null, kind: 'library' | 'highfield', title: string, copy: string) {
  if (!target || document.querySelector(`[${MARKER}="${kind}"]`)) return;
  target.parentElement?.insertBefore(makeBoundary(kind, title, copy), target);
}

function addCardBadge(card: Element, kind: 'library' | 'highfield') {
  if (card.querySelector(`[data-course-source-badge="${kind}"]`)) return;
  const badge = document.createElement('div');
  badge.className = `course-source-badge course-source-badge-${kind}`;
  badge.setAttribute('data-course-source-badge', kind);
  badge.textContent = kind === 'library'
    ? 'Sousa Murray course · Sousa Murray LMS'
    : 'Highfield Professional Training · Highfield LMS';
  card.prepend(badge);
}

function replaceTextWithin(root: Element, from: string, to: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeValue?.includes(from)) node.nodeValue = node.nodeValue.replaceAll(from, to);
  }
}

function patchPlanCard(root: ParentNode, planName: string, replacements: Array<[string, string]>) {
  const cards = [...root.querySelectorAll<HTMLElement>('article')];
  const card = cards.find((item) => item.querySelector('h3')?.textContent?.trim() === planName)
    ?? cards.find((item) => item.querySelector('h1')?.textContent?.trim() === planName);
  if (!card) return;
  replacements.forEach(([from, to]) => replaceTextWithin(card, from, to));
}

function applyPlanCommercialModel() {
  const path = window.location.pathname;
  if (!(path === '/plans' || path === '/pricing' || path.startsWith('/lms/subscribe/'))) return;

  patchPlanCard(document, 'Learner', [
    ['Unlimited access to the core Learning Library', 'Access to the selected Core Learning Library'],
    ['Unlimited core-course access', 'Selected Core-course access'],
    ['Core library', 'Selected Core library'],
  ]);
  patchPlanCard(document, 'Team 5', [
    ['Complete Learning Library access', 'Selected Core Learning Library access'],
    ['Complete-library access', 'Selected Core-library access'],
    ['Complete library', 'Selected Core library'],
  ]);

  const grid = document.querySelector('.lp-plan-grid, .psc-shell');
  addBoundaryBefore(
    grid,
    'library',
    'Sousa Murray Learning Library plan scope',
    `Learner and Team 5 include the selected Core collection (${libraryCatalogueStats.coreCourses} courses). Learner Plus and Team 15 include the complete Sousa Murray catalogue (${libraryCatalogueStats.completeCourses} courses). Highfield Professional Training is always separate.`,
  );
}

function applyLibraryMarkers() {
  const path = window.location.pathname;
  if (!(path.startsWith('/learning-library') || path.startsWith('/lms/course/'))) return;

  const catalogue = document.querySelector('.plms-catalogue');
  addBoundaryBefore(
    catalogue,
    'library',
    'Sousa Murray Learning Library',
    `These are original Sousa Murray eLearning courses and run inside the Sousa Murray LMS. Core plans include ${libraryCatalogueStats.coreCourses}; Learner Plus and Team 15 include all ${libraryCatalogueStats.completeCourses}. They are not Highfield courses.`,
  );

  document.querySelectorAll('.plms-course-grid > article').forEach((card) => addCardBadge(card, 'library'));
  const hero = document.querySelector('.plms-course-hero .lp-container');
  if (hero) addCardBadge(hero, 'library');
}

function applyHighfieldMarkers() {
  const path = window.location.pathname;
  if (!(path === '/courses' || path.startsWith('/courses/') || path === '/basket' || path.startsWith('/professional-training'))) return;

  const target = document.querySelector('.section, .basket-section, .course-detail-section');
  addBoundaryBefore(
    target,
    'highfield',
    'Highfield Professional Training',
    'These are separately purchased Highfield Online Training courses. Course content and learner delivery use the Highfield LMS. They are not part of the Sousa Murray Learning Library or its subscriptions.',
  );

  if (path === '/courses') {
    document.querySelectorAll('.course-grid > article, .course-grid > a').forEach((card) => addCardBadge(card, 'highfield'));
  }
  if (path.startsWith('/courses/')) {
    const hero = document.querySelector('.course-hero .container');
    if (hero) addCardBadge(hero, 'highfield');
  }
}

function apply() {
  applyPlanCommercialModel();
  applyLibraryMarkers();
  applyHighfieldMarkers();
}

let scheduled = false;
function scheduleApply() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    apply();
  });
}

scheduleApply();
const observer = new MutationObserver(scheduleApply);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', scheduleApply);
