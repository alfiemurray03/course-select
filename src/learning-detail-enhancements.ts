import {
  courseDuration,
  findLibraryCourse,
  libraryCatalogueStats,
} from './libraryCatalogue';

const DETAIL_MARKER = 'data-learning-detail-enhancement';

function elementFromHtml(html: string) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild as HTMLElement | null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function enhancePlansPage() {
  const path = window.location.pathname;
  if (!(path === '/plans' || path === '/pricing')) return;
  if (document.querySelector(`[${DETAIL_MARKER}="plans"]`)) return;

  const grid = document.querySelector('.lp-plan-grid');
  if (!grid?.parentElement) return;

  const section = elementFromHtml(`
    <section class="learning-detail-panel learning-plan-detail-panel" ${DETAIL_MARKER}="plans" aria-label="How Sousa Murray eLearning plans work">
      <header class="learning-detail-heading">
        <span>Understanding your access</span>
        <h2>What each plan gives you and what happens after you join</h2>
        <p>Each Sousa Murray eLearning plan is linked to a named learning account. Your plan determines how many learners can use the service and which part of the Sousa Murray course catalogue is included.</p>
      </header>

      <div class="learning-detail-grid four-up">
        <article>
          <strong>Core collection</strong>
          <h3>${libraryCatalogueStats.coreCourses} included courses</h3>
          <p>Learner and Team 5 include the selected Core collection. These courses cover a broad range of practical workplace, business, digital and personal-development subjects.</p>
        </article>
        <article>
          <strong>Complete catalogue</strong>
          <h3>${libraryCatalogueStats.completeCourses} included courses</h3>
          <p>Learner Plus and Team 15 include the complete Sousa Murray eLearning catalogue, including the Core collection and the wider advanced and specialist course range.</p>
        </article>
        <article>
          <strong>Personal plans</strong>
          <h3>One named learner</h3>
          <p>Learner and Learner Plus are designed for an individual learning account. Progress, assessment attempts and certificates stay attached to that named learner.</p>
        </article>
        <article>
          <strong>Business plans</strong>
          <h3>Managed learner seats</h3>
          <p>Team 5 and Team 15 provide organisation-managed named learner seats. The account owner can invite learners and oversee team access and completion information.</p>
        </article>
      </div>

      <div class="learning-process-block">
        <div>
          <span>How access is set up</span>
          <h3>From checkout to the LMS</h3>
        </div>
        <ol>
          <li><b>Choose your plan.</b><span>Select the learner capacity and catalogue level that suits the account.</span></li>
          <li><b>Sign in securely.</b><span>Your purchase is linked to your JA Group Services ID and JA Group Services Unique Customer Number so access is assigned to the correct customer record.</span></li>
          <li><b>Complete secure payment.</b><span>Payment is handled through JA Group Services Central Payments. Once payment is confirmed, the learning entitlement is activated against the account.</span></li>
          <li><b>Open My Sousa Murray eLearning.</b><span>The LMS reads the active entitlement and shows the courses included for that learner or organisation seat.</span></li>
          <li><b>Enrol on a course.</b><span>When a learner starts an included course, the LMS creates the enrolment, lesson-progress records and assessment record for that learner.</span></li>
          <li><b>Complete and certify.</b><span>Progress is recorded server-side. After all required learning and a successful final assessment, the LMS issues a verifiable completion certificate.</span></li>
        </ol>
      </div>

      <div class="learning-detail-grid two-up compact">
        <article>
          <strong>Named learners</strong>
          <h3>Seats are assigned to people, not shared logins</h3>
          <p>Every learner uses their own learning identity. This keeps progress, assessment history and certificates attributable to the correct individual and prevents learner records being mixed together.</p>
        </article>
        <article>
          <strong>Separate Highfield service</strong>
          <h3>Highfield Online Training is handled separately</h3>
          <p>Highfield courses use the Highfield LMS and their own course-purchase and enrolment process. They are not counted as Sousa Murray Learning Library courses within these plans.</p>
        </article>
      </div>
    </section>
  `);

  if (section) grid.parentElement.insertBefore(section, grid.nextSibling);
}

function enhanceCourseOverview() {
  const match = window.location.pathname.match(/^\/lms\/course\/([^/]+)$/);
  if (!match) return;
  if (document.querySelector(`[${DETAIL_MARKER}="course"]`)) return;

  const grid = document.querySelector('.plms-course-information-grid');
  if (!grid?.parentElement) return;

  const slug = decodeURIComponent(match[1]);
  const course = findLibraryCourse(slug);
  if (!course) return;

  const audience = course.audience.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const includedPlans = course.includedPlans.map((plan) => `<span>${escapeHtml(plan)}</span>`).join('');
  const lessons = course.modules.reduce((total, module) => total + module.lessons.length, 0);

  const section = elementFromHtml(`
    <section class="learning-detail-panel learning-course-detail-panel" ${DETAIL_MARKER}="course" aria-label="Detailed course information">
      <header class="learning-detail-heading">
        <span>Course information</span>
        <h2>Everything you need to know before you start</h2>
        <p>This course is delivered through the Sousa Murray LMS. The information below explains who the course is designed for, how the learning is structured, how assessment works and how your completion is recorded.</p>
      </header>

      <div class="learning-course-facts">
        <div><strong>${courseDuration(course)} minutes</strong><span>Estimated total learning time</span></div>
        <div><strong>${course.modules.length} modules</strong><span>Structured course sections</span></div>
        <div><strong>${lessons} lessons</strong><span>Detailed lessons and knowledge checks</span></div>
        <div><strong>${course.finalAssessment.passMark}%</strong><span>Final assessment pass mark</span></div>
      </div>

      <div class="learning-detail-grid two-up">
        <article>
          <strong>Who this course is for</strong>
          <h3>Intended learners</h3>
          <ul class="learning-detail-list">${audience}</ul>
        </article>
        <article>
          <strong>Before you begin</strong>
          <h3>Prerequisites</h3>
          <p>${escapeHtml(course.prerequisites)}</p>
          <div class="learning-plan-chip-row" aria-label="Plans containing this course">${includedPlans}</div>
        </article>
      </div>

      <div class="learning-process-block">
        <div>
          <span>How the course works</span>
          <h3>Your learning journey</h3>
        </div>
        <ol>
          <li><b>Enrolment is linked to your account.</b><span>The LMS creates a course enrolment against your signed-in JA Group Services ID learning account.</span></li>
          <li><b>Work through each lesson.</b><span>Lessons are organised into modules and include explanations, examples, activities and knowledge checks.</span></li>
          <li><b>Your progress is saved.</b><span>Lesson completion, knowledge-check attempts and progress are recorded by the LMS so you can return later and continue.</span></li>
          <li><b>Complete the final assessment.</b><span>After the required lessons are complete, the final assessment becomes available. This course requires ${course.finalAssessment.passMark}% to pass.</span></li>
          <li><b>Receive your completion certificate.</b><span>When the assessment is passed, a completion certificate is issued with a verification reference that can be checked through the Sousa Murray LMS.</span></li>
        </ol>
      </div>

      <div class="learning-detail-grid two-up compact">
        <article>
          <strong>Assessment</strong>
          <h3>${escapeHtml(course.finalAssessment.title)}</h3>
          <p>${escapeHtml(course.finalAssessment.instructions)}</p>
        </article>
        <article>
          <strong>Certificate</strong>
          <h3>Recorded completion evidence</h3>
          <p>${escapeHtml(course.certificateStatement)}</p>
        </article>
      </div>

      <aside class="learning-important-note">
        <strong>Important information</strong>
        <p>${escapeHtml(course.importantNotice)}</p>
      </aside>
    </section>
  `);

  if (section) grid.parentElement.appendChild(section);
}

function applyEnhancements() {
  enhancePlansPage();
  enhanceCourseOverview();
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    applyEnhancements();
  });
}

schedule();
const observer = new MutationObserver(schedule);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', schedule);
