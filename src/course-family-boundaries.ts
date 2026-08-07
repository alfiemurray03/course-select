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
    : 'Highfield Online Training · Highfield LMS';
  card.prepend(badge);
}

function applyLibraryMarkers() {
  const path = window.location.pathname;
  if (!(path.startsWith('/learning-library') || path.startsWith('/lms/course/'))) return;

  const catalogue = document.querySelector('.plms-catalogue');
  addBoundaryBefore(
    catalogue,
    'library',
    'Sousa Murray eLearning courses',
    `Original Sousa Murray courses delivered through the Sousa Murray LMS. Learner and Team 5 include the selected Core collection (${libraryCatalogueStats.coreCourses} courses); Learner Plus and Team 15 include all ${libraryCatalogueStats.completeCourses}. Highfield Online Training is separate.`,
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
    'Highfield Online Training',
    'Separately purchased Highfield courses delivered through the Highfield LMS. They are not Sousa Murray courses and are never included in a Sousa Murray Learning Library plan.',
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
