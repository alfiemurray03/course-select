import { findLibraryCourse, flattenCourseLessons } from './libraryCatalogue';

const MARKER = 'data-lms-player-route';

type CourseState = {
  lessons?: Array<{ lessonId: string; status: string }>;
};

async function nextLessonHref(slug: string) {
  const course = findLibraryCourse(slug);
  if (!course) return `/lms/course/${slug}`;
  const lessons = flattenCourseLessons(course);
  if (!lessons.length) return `/lms/course/${slug}`;

  try {
    const response = await fetch(`/api/lms/courses/${encodeURIComponent(slug)}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (response.ok) {
      const state = await response.json() as CourseState;
      const progress = new Map((state.lessons ?? []).map((item) => [item.lessonId, item.status]));
      const next = lessons.find((lesson) => progress.get(lesson.id) !== 'completed') ?? lessons[0];
      return `/lms/course/${slug}?lesson=${encodeURIComponent(next.id)}`;
    }
  } catch {
    // If progress cannot be loaded, entering lesson one is still better than
    // sending an enrolled learner back to the public-style course overview.
  }

  return `/lms/course/${slug}?lesson=${encodeURIComponent(lessons[0].id)}`;
}

async function routeDashboardActions() {
  if (window.location.pathname !== '/lms/dashboard') return;

  const links = [...document.querySelectorAll<HTMLAnchorElement>('.smlms-course-row a.smlms-row-action')]
    .filter((link) => !link.hasAttribute(MARKER));

  for (const link of links) {
    const match = new URL(link.href, window.location.origin).pathname.match(/^\/lms\/course\/([^/]+)$/);
    if (!match) continue;
    link.setAttribute(MARKER, 'loading');
    const slug = decodeURIComponent(match[1]);
    link.href = await nextLessonHref(slug);
    link.setAttribute(MARKER, 'ready');
  }
}

function routeEnrolledCourseOverviewAction() {
  const match = window.location.pathname.match(/^\/lms\/course\/([^/]+)$/);
  if (!match || window.location.search.includes('lesson=') || window.location.search.includes('assessment=')) return;

  const link = [...document.querySelectorAll<HTMLAnchorElement>('.plms-course-information-grid > aside a.plms-primary-action')]
    .find((item) => item.textContent?.toLowerCase().includes('open course'));
  if (!link || link.hasAttribute(MARKER)) return;

  const slug = decodeURIComponent(match[1]);
  link.setAttribute(MARKER, 'loading');
  void nextLessonHref(slug).then((href) => {
    link.href = href;
    link.textContent = 'Continue in course →';
    link.setAttribute(MARKER, 'ready');
  });
}

function apply() {
  void routeDashboardActions();
  routeEnrolledCourseOverviewAction();
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    apply();
  });
}

schedule();
const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', schedule);
