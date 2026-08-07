export {};

const MARKER = 'data-lms-enrolment-details';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({})) as T & { message?: string; error?: string };
  if (!response.ok) throw new Error(body.message ?? body.error ?? `Request failed (${response.status}).`);
  return body;
}

function courseSlug() {
  const match = window.location.pathname.match(/^\/lms\/course\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function buildForm(button: HTMLButtonElement, slug: string) {
  if (button.closest(`[${MARKER}]`)) return;

  const wrapper = document.createElement('section');
  wrapper.className = 'lms-enrolment-details-card';
  wrapper.setAttribute(MARKER, 'true');
  wrapper.innerHTML = `
    <div class="lms-enrolment-details-heading">
      <span>Required before enrolment</span>
      <h3>Learner details</h3>
      <p>Provide the named learner's legal name and the email address that should be attached to this Sousa Murray LMS enrolment.</p>
    </div>
    <div class="lms-enrolment-details-fields">
      <label>Legal first name<input name="legalFirstName" type="text" maxlength="80" autocomplete="given-name" required></label>
      <label>Legal last name<input name="legalLastName" type="text" maxlength="80" autocomplete="family-name" required></label>
      <label class="wide">Enrolment email<input name="enrolmentEmail" type="email" maxlength="254" autocomplete="email" required></label>
    </div>
    <p class="lms-enrolment-details-note">These details are used to create and maintain the learner's course record, progress, assessment history and completion certificate.</p>
    <p class="lms-enrolment-details-message" role="status" hidden></p>
  `;

  button.insertAdjacentElement('beforebegin', wrapper);
  wrapper.append(button);
  button.textContent = 'Submit details and enrol';

  const email = wrapper.querySelector<HTMLInputElement>('input[name="enrolmentEmail"]');
  requestJson<{ user?: { email?: string } }>('/api/auth/session')
    .then((session) => {
      if (email && !email.value && session.user?.email) email.value = session.user.email;
    })
    .catch(() => undefined);

  button.onclick = async (event) => {
    event.preventDefault();
    const first = wrapper.querySelector<HTMLInputElement>('input[name="legalFirstName"]');
    const last = wrapper.querySelector<HTMLInputElement>('input[name="legalLastName"]');
    const learnerEmail = wrapper.querySelector<HTMLInputElement>('input[name="enrolmentEmail"]');
    const message = wrapper.querySelector<HTMLElement>('.lms-enrolment-details-message');
    if (!first?.value.trim() || !last?.value.trim() || !learnerEmail?.value.trim()) {
      if (message) {
        message.hidden = false;
        message.textContent = 'Complete all learner details before enrolment.';
      }
      return;
    }

    button.disabled = true;
    button.textContent = 'Creating enrolment…';
    if (message) message.hidden = true;
    try {
      await requestJson('/api/lms/enrolments', {
        method: 'POST',
        body: JSON.stringify({
          courseSlug: slug,
          learner: {
            legalFirstName: first.value.trim(),
            legalLastName: last.value.trim(),
            enrolmentEmail: learnerEmail.value.trim(),
          },
        }),
      });
      window.location.reload();
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Submit details and enrol';
      if (message) {
        message.hidden = false;
        message.textContent = error instanceof Error ? error.message : 'The learner could not be enrolled.';
      }
    }
  };
}

function apply() {
  const slug = courseSlug();
  if (!slug) return;
  const aside = document.querySelector<HTMLElement>('.plms-course-information-grid > aside');
  if (!aside || aside.querySelector(`[${MARKER}]`)) return;
  const button = [...aside.querySelectorAll<HTMLButtonElement>('button.plms-primary-action')]
    .find((item) => item.textContent?.toLowerCase().includes('enrol and start course'));
  if (!button) return;
  buildForm(button, slug);
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
const enrolmentDetailsObserver = new MutationObserver(schedule);
enrolmentDetailsObserver.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('popstate', schedule);
