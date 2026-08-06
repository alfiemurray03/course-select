import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  CreditCard,
  GraduationCap,
  Infinity as InfinityIcon,
  Library,
  LoaderCircle,
  LockKeyhole,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  courseDuration,
  findLibraryCourse,
  flattenCourseLessons,
  libraryCategories,
  libraryCourses,
  type CoursePlan,
  type LibraryCourse,
} from './libraryCatalogue';
import './production-lms.css';

type SessionResponse = {
  configured: boolean;
  authenticated: boolean;
  user: { accountId: string; email: string; name: string } | null;
};

type MeResponse = {
  configured: boolean;
  authenticated: boolean;
  user: {
    accountId: string;
    name: string;
    email: string;
    headOfficeCustomerNumber: string;
  };
  entitlement: {
    active: boolean;
    plan: {
      id: string;
      name: string;
      amountPence: number;
      seatLimit: number;
      libraryTier: 'core' | 'complete';
    } | null;
    subscription: {
      id: string;
      status: string;
      currentPeriodEnd: string | null;
      cancelAtPeriodEnd: boolean;
      graceExpiresAt: string | null;
    } | null;
  };
  courses: Array<{
    code: string;
    slug: string;
    title: string;
    category: string;
    shortDescription: string;
    level: string;
    version: string;
    durationMinutes: number;
    modules: number;
    lessons: number;
  }>;
  enrolments: Array<{
    id: string;
    course_slug: string;
    course_code: string;
    course_version: string;
    status: string;
    progress_percent: number;
    assessment_score: number | null;
    enrolled_at: string;
    completed_at: string | null;
  }>;
  certificates: Array<{
    id: string;
    certificate_number: string;
    verification_token: string;
    course_slug: string;
    course_code: string;
    course_title: string;
    course_version: string;
    score_percent: number;
    status: string;
    issued_at: string;
  }>;
};

type CourseState = {
  course: { slug: string; code: string; title: string; version: string };
  entitlementActive: boolean;
  enrolment: {
    id: string;
    status: string;
    progress_percent: number;
    assessment_score: number | null;
    enrolled_at: string;
    started_at: string | null;
    completed_at: string | null;
  } | null;
  lessons: Array<{
    moduleId: string;
    lessonId: string;
    status: string;
    attempts: number;
    selectedAnswer?: number | null;
    knowledgeCheckPassed: boolean;
    startedAt?: string | null;
    completedAt?: string | null;
  }>;
  attempts: Array<{
    attemptNumber: number;
    scorePercent: number;
    passMark: number;
    passed: boolean;
    completedAt: string;
  }>;
  certificate: {
    number: string;
    verificationToken: string;
    status: string;
    issuedAt: string;
  } | null;
};

type OrganisationResponse = {
  organisation: {
    id: string;
    name: string;
    seatLimit: number;
    subscriptionStatus: string;
  } | null;
  members: Array<{
    id: string;
    account_id: string | null;
    invited_email: string | null;
    role: string;
    status: string;
    invited_at: string;
    joined_at: string | null;
  }>;
};

type CertificateResponse = {
  valid: boolean;
  certificate?: {
    number: string;
    learnerName: string;
    courseCode: string;
    courseTitle: string;
    courseVersion: string;
    scorePercent: number;
    statement: string;
    status: string;
    issuedAt: string;
    withdrawnAt: string | null;
  };
};

type PlanDefinition = {
  id: 'learner' | 'learner-plus' | 'team-5' | 'team-15';
  name: string;
  price: string;
  seats: number;
  tier: 'Core library' | 'Complete library';
  description: string;
};

const plans: PlanDefinition[] = [
  { id: 'learner', name: 'Learner', price: '£9.99', seats: 1, tier: 'Core library', description: 'Unlimited core-course access for one named learner.' },
  { id: 'learner-plus', name: 'Learner Plus', price: '£16.99', seats: 1, tier: 'Complete library', description: 'Unlimited complete-library access for one named learner.' },
  { id: 'team-5', name: 'Team 5', price: '£39.99', seats: 5, tier: 'Complete library', description: 'Complete-library access for up to five named learners.' },
  { id: 'team-15', name: 'Team 15', price: '£89.99', seats: 15, tier: 'Complete library', description: 'Complete-library access for up to fifteen named learners.' },
];

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
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
  if (!response.ok) {
    const error = new Error(body.message ?? body.error ?? `Request failed (${response.status}).`);
    Object.assign(error, { status: response.status, body });
    throw error;
  }
  return body;
}

function errorStatus(error: unknown) {
  return typeof error === 'object' && error && 'status' in error ? Number((error as { status: unknown }).status) : 0;
}

function dateText(value: string | null | undefined) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function LoadingPanel({ label = 'Loading your learning account' }: { label?: string }) {
  return <div className="plms-loading"><LoaderCircle className="plms-spin" /><strong>{label}</strong></div>;
}

function ErrorPanel({ message }: { message: string }) {
  return <div className="plms-error"><CircleAlert /><div><strong>Something needs attention</strong><span>{message}</span></div></div>;
}

function SignInPage() {
  const [searchParams] = useSearchParams();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [error, setError] = useState('');
  const planId = searchParams.get('plan');
  const plan = plans.find((item) => item.id === planId);
  const returnTo = plan ? `/lms/subscribe/${plan.id}` : '/lms/dashboard';

  useEffect(() => {
    jsonRequest<SessionResponse>('/api/auth/session').then(setSession).catch((reason: Error) => setError(reason.message));
  }, []);

  return <main className="plms-signin-page"><section className="plms-signin-shell">
    <div className="plms-signin-intro">
      <div className="plms-product-mark"><GraduationCap /> Sousa Murray LMS</div>
      <h1>Your learning, progress and certificates in one secure account.</h1>
      <p>Sign in through JA Group Services ID to access courses included in your active Learning Library subscription.</p>
      <ul><li><Check /> Server-recorded course progress</li><li><Check /> Assessed course completion</li><li><Check /> Verifiable certificates</li><li><Check /> Subscription and team access</li></ul>
    </div>
    <div className="plms-signin-card">
      <LockKeyhole size={36} />
      <span className="plms-status-pill">JA Group Services ID</span>
      <h2>LMS sign in</h2>
      {error && <ErrorPanel message={error} />}
      {!session && !error && <LoadingPanel label="Checking sign-in availability" />}
      {session?.authenticated && <>
        <p>You are already signed in. Continue to your learner dashboard.</p>
        <Link className="plms-primary-action" to={returnTo}>Continue <ArrowRight size={17} /></Link>
      </>}
      {session && !session.authenticated && session.configured && <>
        <p>Use your JA Group Services ID. Your password is handled by Microsoft and is never entered into Sousa Murray eLearning.</p>
        <a className="plms-primary-action" href={`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`}>Sign in securely <ArrowRight size={17} /></a>
      </>}
      {session && !session.authenticated && !session.configured && <ErrorPanel message="JA Group Services ID has not yet been configured on the production website." />}
      <small>Accounts and subscriptions are linked using a stable Entra identity and JA Group Services Unique Customer Number—not an email address alone.</small>
    </div>
  </section></main>;
}

function SubscribePage({ planId }: { planId: string }) {
  const plan = plans.find((item) => item.id === planId);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    jsonRequest<SessionResponse>('/api/auth/session').then(setSession).catch((reason: Error) => setError(reason.message));
  }, []);

  if (!plan) return <main className="plms-page"><div className="plms-centred"><h1>Plan not found</h1><Link to="/plans">Return to plans</Link></div></main>;

  const checkout = async () => {
    setBusy(true); setError('');
    try {
      const result = await jsonRequest<{ url: string }>('/api/lms/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId: plan.id }),
      });
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Checkout could not be started.');
      setBusy(false);
    }
  };

  return <main className="plms-page"><div className="plms-subscribe-shell">
    <section><span>Learning Library subscription</span><h1>{plan.name}</h1><p>{plan.description}</p>
      <div className="plms-price">{plan.price}<small>per month<br />VAT included</small></div>
      <ul><li><Check /> {plan.tier}</li><li><Check /> {plan.seats === 1 ? 'One named learner' : `Up to ${plan.seats} named learners`}</li><li><Check /> Progress and final assessments</li><li><Check /> Verifiable completion certificates</li></ul>
    </section>
    <aside><ShieldCheck size={34} /><h2>Secure subscription checkout</h2>
      {!session && !error && <LoadingPanel label="Checking your account" />}
      {error && <ErrorPanel message={error} />}
      {session && !session.authenticated && <><p>Sign in before purchasing so the subscription can be assigned to the correct learning account.</p><a className="plms-primary-action" href={`/api/auth/login?returnTo=${encodeURIComponent(`/lms/subscribe/${plan.id}`)}`}>Sign in to continue <ArrowRight /></a></>}
      {session?.authenticated && <><p>You will be redirected to Stripe Checkout. The subscription renews monthly until cancelled.</p><button className="plms-primary-action" onClick={checkout} disabled={busy}>{busy ? <><LoaderCircle className="plms-spin" /> Opening checkout</> : <>Continue to Stripe Checkout <ArrowRight /></>}</button></>}
      <small>Highfield Professional Training courses are separate individual purchases and are not included in this plan.</small>
    </aside>
  </div></main>;
}

function CheckoutSuccessPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [message, setMessage] = useState('Confirming your subscription with Stripe…');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const result = await jsonRequest<MeResponse>('/api/lms/me');
        if (cancelled) return;
        setMe(result);
        if (result.entitlement.active) return;
      } catch {
        // Stripe webhooks can take a few seconds after the browser returns.
      }
      if (attempts < 12 && !cancelled) window.setTimeout(poll, 2000);
      else if (!cancelled) setMessage('Payment was received, but access is still being confirmed. Open the dashboard again shortly.');
    };
    void poll();
    return () => { cancelled = true; };
  }, []);

  return <main className="plms-page"><div className="plms-success-card">
    {me?.entitlement.active ? <><CheckCircle2 size={54} /><span>Subscription active</span><h1>Welcome to the Learning Library.</h1><p>Your {me.entitlement.plan?.name} plan is active and your courses are ready.</p><Link className="plms-primary-action" to="/lms/dashboard">Open learner dashboard <ArrowRight /></Link></> : <><LoaderCircle className="plms-spin" size={48} /><h1>Setting up your access</h1><p>{message}</p><Link to="/lms/dashboard">Open dashboard</Link></>}
  </div></main>;
}

function CataloguePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All subjects');
  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return libraryCourses.filter((course) => {
      const categoryMatch = category === 'All subjects' || course.category === category;
      const searchText = `${course.title} ${course.shortDescription} ${course.code} ${course.category}`.toLowerCase();
      return categoryMatch && (!text || searchText.includes(text));
    });
  }, [category, query]);

  return <main><section className="plms-catalogue-hero"><div className="lp-container"><span><Library /> Sousa Murray Learning Library</span><h1>Structured learning built for real progress.</h1><p>Every course contains modules, detailed lessons, knowledge checks, a final assessment and a verifiable completion certificate.</p></div></section>
    <section className="plms-catalogue"><div className="lp-container">
      <div className="plms-toolbar"><label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses or course codes" /></label><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All subjects</option>{libraryCategories.map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="plms-result-line"><strong>{filtered.length} courses</strong><span>Subscription access · Final assessment · Certificate verification</span></div>
      <div className="plms-course-grid">{filtered.map((course) => <article key={course.slug}><div className="plms-course-labels"><span>{course.code}</span><span>{course.level}</span></div><BookOpen /><h2>{course.title}</h2><p>{course.shortDescription}</p><div className="plms-course-meta"><span><Clock3 /> {courseDuration(course)} minutes</span><span><Library /> {course.modules.length} modules</span></div><div className="plms-plan-pills">{course.includedPlans.map((plan) => <small key={plan}>{plan}</small>)}</div><Link to={`/lms/course/${course.slug}`}>View course <ArrowRight /></Link></article>)}</div>
    </div></section></main>;
}

function DashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [organisation, setOrganisation] = useState<OrganisationResponse | null>(null);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    try {
      const account = await jsonRequest<MeResponse>('/api/lms/me');
      setMe(account); setError('');
      if ((account.entitlement.plan?.seatLimit ?? 0) > 1) {
        jsonRequest<OrganisationResponse>('/api/lms/organisation').then(setOrganisation).catch(() => setOrganisation(null));
      }
    } catch (reason) {
      if (errorStatus(reason) === 401) setError('authentication_required');
      else setError(reason instanceof Error ? reason.message : 'The learner account could not be loaded.');
    }
  };

  useEffect(() => { void load(); }, []);

  if (error === 'authentication_required') return <main className="plms-page"><div className="plms-centred"><LockKeyhole /><h1>Sign in to open your LMS</h1><a className="plms-primary-action" href="/api/auth/login?returnTo=/lms/dashboard">Sign in with JA Group Services ID <ArrowRight /></a></div></main>;
  if (error) return <main className="plms-page"><div className="lp-container"><ErrorPanel message={error} /></div></main>;
  if (!me) return <main className="plms-page"><LoadingPanel /></main>;

  const enrolmentBySlug = new Map(me.enrolments.map((item) => [item.course_slug, item]));
  const manageBilling = async () => {
    setBusy('billing');
    try {
      const result = await jsonRequest<{ url: string }>('/api/lms/portal', { method: 'POST' });
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Billing could not be opened.');
      setBusy('');
    }
  };
  const invite = async () => {
    setBusy('invite'); setInviteMessage('');
    try {
      const result = await jsonRequest<{ invitationUrl: string }>('/api/lms/organisation', {
        method: 'POST', body: JSON.stringify({ email: inviteEmail, role: 'learner' }),
      });
      setInviteMessage(`Invitation created: ${result.invitationUrl}`); setInviteEmail('');
      const refreshed = await jsonRequest<OrganisationResponse>('/api/lms/organisation'); setOrganisation(refreshed);
    } catch (reason) {
      setInviteMessage(reason instanceof Error ? reason.message : 'Invitation could not be created.');
    } finally { setBusy(''); }
  };

  return <main className="plms-dashboard-page"><div className="lp-container plms-dashboard">
    <header><div><span>Learner dashboard</span><h1>Hello, {me.user.name.split(' ')[0]}</h1><p>JA Group Services UCN: <strong>{me.user.headOfficeCustomerNumber}</strong></p></div><div className="plms-dashboard-actions"><Link to="/learning-library/courses">Browse courses</Link>{me.entitlement.subscription && <button onClick={manageBilling} disabled={busy === 'billing'}><CreditCard /> Manage billing</button>}</div></header>
    {!me.entitlement.active && <section className="plms-no-plan"><InfinityIcon /><div><h2>Choose a Learning Library plan</h2><p>Purchase a monthly plan to unlock courses, server-recorded progress and certificates.</p></div><Link to="/plans">View plans <ArrowRight /></Link></section>}
    {me.entitlement.active && <>
      <div className="plms-metrics"><article><ShieldCheck /><span>Current plan</span><strong>{me.entitlement.plan?.name}</strong></article><article><Users /><span>Learner capacity</span><strong>{me.entitlement.plan?.seatLimit}</strong></article><article><BookOpen /><span>Available courses</span><strong>{me.courses.length}</strong></article><article><Award /><span>Certificates</span><strong>{me.certificates.length}</strong></article></div>
      <section className="plms-dashboard-section"><div className="plms-section-title"><div><span>Your learning</span><h2>Courses included in your plan</h2></div><Link to="/learning-library/courses">Complete catalogue</Link></div><div className="plms-dashboard-courses">{me.courses.map((course) => { const enrolment = enrolmentBySlug.get(course.slug); return <article key={course.slug}><div><span>{course.code} · {course.category}</span><h3>{course.title}</h3><p>{course.shortDescription}</p>{enrolment && <div className="plms-progress"><i><b style={{ width: `${enrolment.progress_percent}%` }} /></i><small>{enrolment.progress_percent}% · {enrolment.status.replaceAll('_', ' ')}</small></div>}</div><Link to={`/lms/course/${course.slug}`}>{enrolment ? 'Continue course' : 'View and enrol'} <ArrowRight /></Link></article>; })}</div></section>
      <section className="plms-dashboard-section"><div className="plms-section-title"><div><span>Completion records</span><h2>Certificates</h2></div></div>{me.certificates.length ? <div className="plms-certificate-list">{me.certificates.map((certificate) => <article key={certificate.id}><Award /><div><strong>{certificate.course_title}</strong><span>{certificate.certificate_number} · {certificate.score_percent}% · {dateText(certificate.issued_at)}</span></div><Link to={`/lms/certificate/${certificate.verification_token}`}>View and verify</Link></article>)}</div> : <div className="plms-empty"><Award /><h3>No certificates yet</h3><p>Certificates are issued after all lessons and the final assessment are completed successfully.</p></div>}</section>
      {(me.entitlement.plan?.seatLimit ?? 0) > 1 && <section className="plms-dashboard-section"><div className="plms-section-title"><div><span>Organisation learning</span><h2>Named learner seats</h2></div><strong>{organisation?.members.length ?? 0} of {me.entitlement.plan?.seatLimit} seats</strong></div><div className="plms-invite"><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="learner@example.com" /><button onClick={invite} disabled={!inviteEmail || busy === 'invite'}>Create invitation</button></div>{inviteMessage && <p className="plms-invite-message">{inviteMessage}</p>}<div className="plms-member-list">{organisation?.members.map((member) => <article key={member.id}><Users /><div><strong>{member.invited_email ?? 'Connected JA Group Services ID'}</strong><span>{member.role} · {member.status}</span></div></article>)}</div></section>}
    </>}
  </div></main>;
}

function CourseOverview({ course, state, onEnrol, busy }: { course: LibraryCourse; state: CourseState | null; onEnrol: () => void; busy: boolean }) {
  return <main><section className="plms-course-hero"><div className="lp-container"><Link to="/learning-library/courses"><ArrowLeft /> Course catalogue</Link><span>{course.code} · Version {course.version}</span><h1>{course.title}</h1><p>{course.overview}</p><div><span><Clock3 /> {courseDuration(course)} minutes</span><span><Library /> {course.modules.length} modules</span><span><GraduationCap /> {course.level}</span></div></div></section><section className="plms-course-information"><div className="lp-container plms-course-information-grid"><article><h2>What you will learn</h2><ul>{course.learningOutcomes.map((outcome) => <li key={outcome}><Check /> {outcome}</li>)}</ul><h2>Course syllabus</h2>{course.modules.map((module, index) => <div className="plms-syllabus-module" key={module.id}><span>Module {index + 1}</span><h3>{module.title}</h3><p>{module.description}</p><ol>{module.lessons.map((lesson) => <li key={lesson.id}>{lesson.title} <small>{lesson.minutes} min</small></li>)}</ol></div>)}</article><aside><ShieldCheck /><h2>Course access</h2><p>{course.prerequisites}</p><dl><div><dt>Final assessment</dt><dd>{course.finalAssessment.passMark}% pass mark</dd></div><div><dt>Certificate</dt><dd>Issued after a successful assessment</dd></div><div><dt>Included plans</dt><dd>{course.includedPlans.join(', ')}</dd></div></dl>{state && !state.entitlementActive && <><p>An active plan containing this course is required.</p><Link className="plms-primary-action" to="/plans">Compare plans <ArrowRight /></Link></>}{state?.entitlementActive && !state.enrolment && <button className="plms-primary-action" onClick={onEnrol} disabled={busy}>{busy ? 'Enrolling…' : 'Enrol and start course'} <ArrowRight /></button>}{state?.enrolment && <Link className="plms-primary-action" to={`/lms/course/${course.slug}?lesson=${flattenCourseLessons(course)[0]?.id}`}>Open course <ArrowRight /></Link>}<small>{course.importantNotice}</small></aside></div></section></main>;
}

function CoursePage({ slug }: { slug: string }) {
  const course = findLibraryCourse(slug);
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<CourseState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, number>>({});
  const [assessmentResult, setAssessmentResult] = useState<{ passed: boolean; score: number; passMark: number } | null>(null);

  const load = async () => {
    if (!course) return;
    try {
      const result = await jsonRequest<CourseState>(`/api/lms/courses/${encodeURIComponent(course.slug)}`);
      setState(result); setError('');
    } catch (reason) {
      if (errorStatus(reason) === 401) setError('authentication_required');
      else if (errorStatus(reason) === 403) {
        const body = (reason as { body?: CourseState }).body;
        setState(body ?? { course: { slug: course.slug, code: course.code, title: course.title, version: course.version }, entitlementActive: false, enrolment: null, lessons: [], attempts: [], certificate: null });
      } else setError(reason instanceof Error ? reason.message : 'Course access could not be loaded.');
    }
  };
  useEffect(() => { void load(); }, [slug]);

  if (!course) return <main className="plms-page"><div className="plms-centred"><h1>Course not found</h1><Link to="/learning-library/courses">Return to catalogue</Link></div></main>;
  if (error === 'authentication_required') return <main className="plms-page"><div className="plms-centred"><LockKeyhole /><h1>Sign in to view this course</h1><a className="plms-primary-action" href={`/api/auth/login?returnTo=${encodeURIComponent(`/lms/course/${course.slug}`)}`}>Sign in securely <ArrowRight /></a></div></main>;
  if (error) return <main className="plms-page"><div className="lp-container"><ErrorPanel message={error} /></div></main>;
  if (!state) return <main className="plms-page"><LoadingPanel label="Loading course" /></main>;

  const enrol = async () => {
    setBusy(true); setFeedback('');
    try {
      await jsonRequest('/api/lms/enrolments', { method: 'POST', body: JSON.stringify({ courseSlug: course.slug }) });
      await load();
      const first = flattenCourseLessons(course)[0];
      if (first) setSearchParams({ lesson: first.id });
    } catch (reason) { setFeedback(reason instanceof Error ? reason.message : 'Course enrolment failed.'); }
    finally { setBusy(false); }
  };

  const lessonId = searchParams.get('lesson');
  const assessmentMode = searchParams.get('assessment') === '1';
  if (!state.enrolment || (!lessonId && !assessmentMode)) return <><CourseOverview course={course} state={state} onEnrol={enrol} busy={busy} />{feedback && <div className="lp-container"><ErrorPanel message={feedback} /></div>}</>;

  const lessons = flattenCourseLessons(course);
  const lesson = lessonId ? lessons.find((item) => item.id === lessonId) : null;
  const progressByLesson = new Map(state.lessons.map((item) => [item.lessonId, item]));
  const completedLessons = state.lessons.filter((item) => item.status === 'completed').length;
  const allLessonsComplete = completedLessons === lessons.length;

  const submitKnowledgeCheck = async () => {
    if (!lesson || selectedAnswer === null) return;
    setBusy(true); setFeedback('');
    try {
      const result = await jsonRequest<{ passed: boolean; explanation: string; assessmentUnlocked: boolean }>('/api/lms/progress', {
        method: 'POST',
        body: JSON.stringify({ courseSlug: course.slug, lessonId: lesson.id, selectedAnswer }),
      });
      setFeedback(result.explanation);
      await load();
      if (result.passed) {
        const index = lessons.findIndex((item) => item.id === lesson.id);
        const next = lessons[index + 1];
        if (next) window.setTimeout(() => { setSelectedAnswer(null); setFeedback(''); setSearchParams({ lesson: next.id }); }, 700);
      }
    } catch (reason) {
      const body = (reason as { body?: { explanation?: string } }).body;
      setFeedback(body?.explanation ?? (reason instanceof Error ? reason.message : 'Answer could not be submitted.'));
      await load();
    } finally { setBusy(false); }
  };

  const submitAssessment = async () => {
    setBusy(true); setFeedback('');
    try {
      const result = await jsonRequest<{ passed: boolean; score: number; passMark: number }>('/api/lms/assessment', {
        method: 'POST', body: JSON.stringify({ courseSlug: course.slug, answers: assessmentAnswers }),
      });
      setAssessmentResult(result); await load();
    } catch (reason) { setFeedback(reason instanceof Error ? reason.message : 'Assessment could not be submitted.'); }
    finally { setBusy(false); }
  };

  if (assessmentMode) return <main className="plms-player"><aside className="plms-player-sidebar"><Link to="/lms/dashboard"><GraduationCap /> Sousa Murray LMS</Link><Link to={`/lms/course/${course.slug}?lesson=${lessons[0]?.id}`}><ArrowLeft /> Return to lessons</Link><h2>{course.title}</h2><div className="plms-progress"><i><b style={{ width: `${state.enrolment.progress_percent}%` }} /></i><small>{state.enrolment.progress_percent}% complete</small></div></aside><section className="plms-player-content"><article className="plms-assessment-card"><span>Final assessment</span><h1>{course.finalAssessment.title}</h1><p>{course.finalAssessment.instructions}</p>{!allLessonsComplete && <ErrorPanel message="Complete every lesson before taking the final assessment." />}{assessmentResult && <div className={assessmentResult.passed ? 'plms-assessment-result passed' : 'plms-assessment-result'}><strong>{assessmentResult.passed ? 'Assessment passed' : 'Assessment not yet passed'}</strong><span>{assessmentResult.score}% · Required {assessmentResult.passMark}%</span>{assessmentResult.passed && state.certificate && <Link to={`/lms/certificate/${state.certificate.verificationToken}`}>View certificate <Award /></Link>}</div>}{allLessonsComplete && !assessmentResult && <div className="plms-assessment-questions">{course.finalAssessment.questions.map((question, questionIndex) => <fieldset key={question.id}><legend>{questionIndex + 1}. {question.question}</legend>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={question.id} checked={assessmentAnswers[question.id] === optionIndex} onChange={() => setAssessmentAnswers((current) => ({ ...current, [question.id]: optionIndex }))} /><span>{option}</span></label>)}</fieldset>)}</div>}{feedback && <ErrorPanel message={feedback} />}{allLessonsComplete && !assessmentResult && <button className="plms-primary-action" onClick={submitAssessment} disabled={busy || Object.keys(assessmentAnswers).length !== course.finalAssessment.questions.length}>{busy ? 'Marking assessment…' : 'Submit final assessment'} <ArrowRight /></button>}</article></section></main>;

  if (!lesson) return <CourseOverview course={course} state={state} onEnrol={enrol} busy={busy} />;
  const lessonProgress = progressByLesson.get(lesson.id);
  return <main className="plms-player"><aside className="plms-player-sidebar"><Link to="/lms/dashboard"><GraduationCap /> Sousa Murray LMS</Link><Link to="/lms/dashboard"><ArrowLeft /> Learner dashboard</Link><h2>{course.title}</h2><div className="plms-progress"><i><b style={{ width: `${state.enrolment.progress_percent}%` }} /></i><small>{completedLessons} of {lessons.length} lessons complete</small></div><nav>{course.modules.map((module) => <section key={module.id}><span>{module.title}</span>{module.lessons.map((item) => { const progress = progressByLesson.get(item.id); return <button className={item.id === lesson.id ? 'active' : ''} key={item.id} onClick={() => { setSelectedAnswer(null); setFeedback(''); setSearchParams({ lesson: item.id }); }}><i>{progress?.status === 'completed' ? <Check /> : lessons.findIndex((entry) => entry.id === item.id) + 1}</i><b>{item.title}</b></button>; })}</section>)}</nav><button className="plms-assessment-link" disabled={!allLessonsComplete} onClick={() => setSearchParams({ assessment: '1' })}><Award /> Final assessment {allLessonsComplete ? '' : '(locked)'}</button></aside><section className="plms-player-content"><div className="plms-player-top"><Link to={`/lms/course/${course.slug}`}>Course information</Link><span>{lesson.moduleTitle} · Lesson {lesson.sequence + 1} of {lessons.length}</span></div><article className="plms-lesson-card"><header><span>{lessonProgress?.status === 'completed' ? <><CheckCircle2 /> Completed</> : 'Current lesson'}</span><h1>{lesson.title}</h1><p>{lesson.summary}</p><ul>{lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul></header>{lesson.sections.map((section) => <section className="plms-lesson-section" key={section.heading}><h2>{section.heading}</h2>{section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}{section.callout && <aside>{section.callout}</aside>}</section>)}{lesson.activity && <section className="plms-activity"><span>Practical activity</span><h2>{lesson.activity.title}</h2><ol>{lesson.activity.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></section>}<section className="plms-knowledge-check"><span>Knowledge check</span><h2>{lesson.knowledgeCheck.question}</h2>{lesson.knowledgeCheck.options.map((option, index) => <label key={option}><input type="radio" name="knowledge-check" checked={selectedAnswer === index || (lessonProgress?.status === 'completed' && lessonProgress.selectedAnswer === index)} onChange={() => setSelectedAnswer(index)} disabled={lessonProgress?.status === 'completed'} /><b>{option}</b></label>)}{feedback && <p>{feedback}</p>}{lessonProgress?.status !== 'completed' ? <button className="plms-primary-action" onClick={submitKnowledgeCheck} disabled={selectedAnswer === null || busy}>{busy ? 'Checking answer…' : 'Submit answer'} <ArrowRight /></button> : <div className="plms-passed"><CheckCircle2 /> Knowledge check completed</div>}</section></article></section></main>;
}

function CertificatePage({ token }: { token: string }) {
  const [data, setData] = useState<CertificateResponse | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    jsonRequest<CertificateResponse>(`/api/lms/certificates/${encodeURIComponent(token)}`).then(setData).catch((reason: Error) => setError(reason.message));
  }, [token]);
  if (error) return <main className="plms-page"><div className="plms-centred"><CircleAlert /><h1>Certificate could not be verified</h1><p>{error}</p></div></main>;
  if (!data) return <main className="plms-page"><LoadingPanel label="Verifying certificate" /></main>;
  const certificate = data.certificate;
  if (!certificate) return <main className="plms-page"><div className="plms-centred"><CircleAlert /><h1>Certificate not found</h1></div></main>;
  return <main className="plms-certificate-page"><div className="plms-certificate-actions"><Link to="/lms/dashboard"><ArrowLeft /> Dashboard</Link><button onClick={() => window.print()}>Print certificate</button></div><article className="plms-certificate"><div><GraduationCap /> Sousa Murray eLearning</div><span>Certificate of completion</span><h1>{certificate.courseTitle}</h1><p>This confirms that</p><h2>{certificate.learnerName}</h2><p>{certificate.statement}</p><dl><div><dt>Certificate number</dt><dd>{certificate.number}</dd></div><div><dt>Course code</dt><dd>{certificate.courseCode}</dd></div><div><dt>Course version</dt><dd>{certificate.courseVersion}</dd></div><div><dt>Assessment score</dt><dd>{certificate.scorePercent}%</dd></div><div><dt>Date issued</dt><dd>{dateText(certificate.issuedAt)}</dd></div><div><dt>Verification status</dt><dd>{data.valid ? 'Valid' : certificate.status}</dd></div></dl><small>This certificate confirms completion of a Sousa Murray Learning Library course. It is not an accredited or regulated qualification unless expressly stated otherwise.</small><strong>Issued by JA Group Services Ltd through Sousa Murray eLearning</strong></article></main>;
}

function TeamJoinPage() {
  const [searchParams] = useSearchParams();
  const invitation = searchParams.get('invitation') ?? '';
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { jsonRequest<SessionResponse>('/api/auth/session').then(setSession).catch((reason: Error) => setMessage(reason.message)); }, []);
  const join = async () => {
    setBusy(true); setMessage('');
    try { await jsonRequest('/api/lms/team/join', { method: 'POST', body: JSON.stringify({ invitationId: invitation }) }); window.location.assign('/lms/dashboard'); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : 'The invitation could not be accepted.'); setBusy(false); }
  };
  return <main className="plms-page"><div className="plms-centred"><Users /><h1>Join an organisation learning plan</h1><p>The invitation must match the email address on your JA Group Services ID.</p>{message && <ErrorPanel message={message} />}{session && !session.authenticated && <a className="plms-primary-action" href={`/api/auth/login?returnTo=${encodeURIComponent(`/lms/team/join?invitation=${invitation}`)}`}>Sign in to accept invitation <ArrowRight /></a>}{session?.authenticated && <button className="plms-primary-action" onClick={join} disabled={busy || !invitation}>{busy ? 'Joining…' : 'Accept learning invitation'} <ArrowRight /></button>}</div></main>;
}

export default function ProductionLearningManagementSystem() {
  const path = useLocation().pathname;
  if (path === '/lms/sign-in' || path === '/lms/login') return <SignInPage />;
  if (path === '/learning-library/courses' || path === '/lms/catalogue') return <CataloguePage />;
  if (path === '/lms' || path === '/lms/dashboard') return <DashboardPage />;
  if (path === '/lms/checkout/success') return <CheckoutSuccessPage />;
  if (path === '/lms/team/join') return <TeamJoinPage />;
  const subscribe = path.match(/^\/lms\/subscribe\/([^/]+)$/);
  if (subscribe) return <SubscribePage planId={decodeURIComponent(subscribe[1])} />;
  const course = path.match(/^\/lms\/course\/([^/]+)$/);
  if (course) return <CoursePage slug={decodeURIComponent(course[1])} />;
  const certificate = path.match(/^\/lms\/certificate\/([a-f0-9]{64})$/i);
  if (certificate) return <CertificatePage token={certificate[1]} />;
  return <main className="plms-page"><div className="plms-centred"><h1>LMS page not found</h1><Link to="/lms/dashboard">Open dashboard</Link></div></main>;
}
