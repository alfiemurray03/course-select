import { flattenCourseLessons, libraryCourses } from './libraryCatalogue';
import { addLearningCourseToStoredBasket } from './learning-course-basket';

const MARKER = 'data-own-course-commerce';
const RESULT_COPY = 'Individual purchase · Plan access · Final assessment · Certificate verification';

type AccountAccessResponse = {
  courses?: Array<{ slug: string }>;
  enrolments?: Array<{ course_slug: string }>;
};

let accessLoadStarted = false;
let accessKnown = false;
const accessibleSlugs = new Set<string>();
const enrolledSlugs = new Set<string>();

function findCourseByCard(card: Element) {
  const code = card.querySelector('.plms-course-labels span')?.textContent?.trim();
  const title = card.querySelector('h2')?.textContent?.trim();
  return libraryCourses.find((course) => course.code === code)
    ?? libraryCourses.find((course) => course.title === title)
    ?? null;
}

function learningHref(course: (typeof libraryCourses)[number]) {
  if (!enrolledSlugs.has(course.slug)) return `/lms/course/${course.slug}`;
  const firstLesson = flattenCourseLessons(course)[0];
  return firstLesson ? `/lms/course/${course.slug}?lesson=${encodeURIComponent(firstLesson.id)}` : `/lms/course/${course.slug}`;
}

function loadAccountAccess() {
  if (accessLoadStarted || window.location.pathname !== '/learning-library/courses') return;
  accessLoadStarted = true;
  fetch('/api/lms/me', { credentials: 'same-origin', cache: 'no-store' })
    .then(async (response) => response.ok ? response.json() as Promise<AccountAccessResponse> : null)
    .then((account) => {
      accessibleSlugs.clear();
      enrolledSlugs.clear();
      for (const course of account?.courses ?? []) accessibleSlugs.add(course.slug);
      for (const enrolment of account?.enrolments ?? []) enrolledSlugs.add(enrolment.course_slug);
      accessKnown = true;
      schedule();
    })
    .catch(() => {
      accessKnown = true;
      schedule();
    });
}

function createButton(label: string, className: string, onClick: () => void) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function enhanceCatalogue() {
  if (window.location.pathname !== '/learning-library/courses') return;
  loadAccountAccess();

  const resultLine = document.querySelector<HTMLElement>('.plms-result-line span');
  if (resultLine && resultLine.textContent !== RESULT_COPY) resultLine.textContent = RESULT_COPY;

  document.querySelectorAll<HTMLElement>('.plms-course-grid > article').forEach((card) => {
    const course = findCourseByCard(card);
    if (!course) return;

    const hasAccess = accessKnown && accessibleSlugs.has(course.slug);
    const expectedHref = hasAccess ? learningHref(course) : `/learning-library/courses/${course.slug}`;
    const expectedText = hasAccess ? 'Open course →' : 'View course →';
    const existingLink = card.querySelector<HTMLAnchorElement>('a[href*="/lms/course/"], a[href*="/learning-library/courses/"]');
    if (existingLink) {
      const currentPath = `${new URL(existingLink.href, window.location.origin).pathname}${new URL(existingLink.href, window.location.origin).search}`;
      if (currentPath !== expectedHref) existingLink.href = expectedHref;
      if (existingLink.textContent !== expectedText) existingLink.textContent = expectedText;
      if (!existingLink.classList.contains('sml-catalogue-view-course')) existingLink.classList.add('sml-catalogue-view-course');
    }

    const mode = hasAccess ? 'included' : 'purchase';
    const markerValue = `${course.slug}:${mode}`;
    const existingActions = card.querySelector<HTMLElement>(`[${MARKER}]`);
    if (existingActions?.getAttribute(MARKER) === markerValue) return;
    existingActions?.remove();

    const actions = document.createElement('div');
    actions.className = 'sml-own-course-card-actions';
    actions.setAttribute(MARKER, markerValue);

    if (hasAccess) {
      const included = document.createElement('span');
      included.className = 'sml-own-course-included-label';
      included.textContent = 'Included with your current course access';
      const open = document.createElement('a');
      open.href = learningHref(course);
      open.className = 'sml-own-course-open-learning';
      open.textContent = enrolledSlugs.has(course.slug) ? 'Continue course' : 'Enrol and start';
      actions.append(included, open);
    } else {
      const buyNow = createButton('Buy now', 'sml-own-course-buy-now', () => {
        if (addLearningCourseToStoredBasket(course.slug)) window.location.assign('/learning-library/basket');
      });
      const add = createButton('Add to basket', 'sml-own-course-add-basket', () => {
        if (!addLearningCourseToStoredBasket(course.slug)) {
          add.textContent = 'Basket full';
          add.disabled = true;
          return;
        }
        add.textContent = 'Added to basket';
        add.disabled = true;
      });
      const plan = document.createElement('a');
      plan.href = '/plans';
      plan.className = 'sml-own-course-buy-plan';
      plan.textContent = 'Buy a plan';
      actions.append(buyNow, add, plan);
    }

    if (existingLink) existingLink.insertAdjacentElement('beforebegin', actions);
    else card.append(actions);
  });
}

function enhanceLmsInformationPage() {
  const match = window.location.pathname.match(/^\/lms\/course\/([^/]+)$/);
  if (!match) return;
  const course = libraryCourses.find((item) => item.slug === decodeURIComponent(match[1]));
  if (!course) return;

  const aside = document.querySelector<HTMLElement>('.plms-course-information-grid > aside');
  if (!aside || aside.querySelector(`[${MARKER}="lms-access"]`)) return;

  const activePlanCopy = [...aside.querySelectorAll<HTMLElement>('p')]
    .find((item) => item.textContent?.includes('An active plan containing this course is required.'));
  const compareLink = [...aside.querySelectorAll<HTMLAnchorElement>('a')]
    .find((item) => item.textContent?.includes('Compare plans'));

  if (!activePlanCopy && !compareLink) return;
  if (activePlanCopy) activePlanCopy.textContent = 'This course is not currently in your learning account. Purchase this course individually or choose a Learning Library plan that includes it.';
  if (compareLink) compareLink.remove();

  const actions = document.createElement('div');
  actions.className = 'sml-own-course-lms-access-actions';
  actions.setAttribute(MARKER, 'lms-access');

  const buy = document.createElement('a');
  buy.href = `/learning-library/courses/${course.slug}`;
  buy.className = 'plms-primary-action';
  buy.textContent = 'Buy this course →';

  const plan = document.createElement('a');
  plan.href = '/plans';
  plan.className = 'sml-own-course-secondary-action';
  plan.textContent = 'Buy a plan →';

  actions.append(buy, plan);
  activePlanCopy?.insertAdjacentElement('afterend', actions);
  if (!activePlanCopy) aside.append(actions);
}

// Register before the generic site navigation handler so even a very fast click
// is resolved to the correct route: the public purchase page for a shopper, or
// the LMS for a learner who already has this course through a plan/entitlement.
document.addEventListener('click', (event) => {
  if (window.location.pathname !== '/learning-library/courses') return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest<HTMLAnchorElement>('.plms-course-grid > article a');
  if (!link || link.closest('.sml-own-course-card-actions')) return;
  const card = link.closest('.plms-course-grid > article');
  if (!card) return;
  const course = findCourseByCard(card);
  if (!course) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.assign(accessibleSlugs.has(course.slug) ? learningHref(course) : `/learning-library/courses/${course.slug}`);
}, true);

function apply() {
  enhanceCatalogue();
  enhanceLmsInformationPage();
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    apply();
  });
}

schedule();
const observer = new MutationObserver(schedule);
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('popstate', schedule);