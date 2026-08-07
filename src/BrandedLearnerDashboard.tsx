import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  GraduationCap,
  Home,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { findLibraryCourse, libraryCourses } from './libraryCatalogue';
import './branded-learner-dashboard.css';

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
    ownedByUser: boolean;
    accessSource: 'direct' | 'organisation' | 'none';
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
  courseAccess?: {
    activeStandaloneCount: number;
    hasAnyAccess: boolean;
    standalone: Array<{
      id: string;
      courseSlug: string;
      courseCode: string;
      courseVersion: string;
      source: 'free_trial' | 'individual_purchase' | 'manual';
      startsAt: string;
      expiresAt: string | null;
      enrolled: boolean;
    }>;
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
    accessSource?: 'subscription' | 'free_trial' | 'individual_purchase' | 'manual';
    accessExpiresAt?: string | null;
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
    updated_at: string;
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

type Enrolment = MeResponse['enrolments'][number];
type AvailableCourse = MeResponse['courses'][number];

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
    Object.assign(error, { status: response.status });
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
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function statusText(value: string) {
  if (value === 'assessment_ready') return 'Assessment ready';
  if (value === 'in_progress') return 'In progress';
  if (value === 'completed') return 'Completed';
  if (value === 'enrolled') return 'Not started';
  return value.replaceAll('_', ' ');
}

function accessLabel(course: AvailableCourse) {
  if (course.accessSource === 'free_trial') return course.accessExpiresAt ? `Free trial · access until ${dateText(course.accessExpiresAt)}` : 'Free trial';
  if (course.accessSource === 'individual_purchase') return 'Individually purchased course';
  if (course.accessSource === 'manual') return 'Course access assigned by Sousa Murray eLearning';
  return 'Included with Learning Library plan';
}

function LearnerChrome({ name, children }: { name: string; children: React.ReactNode }) {
  return <div className="smlms-shell">
    <header className="smlms-topbar">
      <Link className="smlms-wordmark" to="/lms/dashboard" aria-label="Sousa Murray eLearning learner dashboard">
        <strong>Sousa Murray</strong>
        <span>eLearning</span>
      </Link>
      <div className="smlms-user-tools">
        <span className="smlms-welcome">Welcome, {name} <a href="/api/auth/logout?returnTo=/lms/sign-in">(Not you?)</a></span>
        <span className="smlms-tool-icon" title="No new learning notifications" aria-label="No new learning notifications"><Bell size={18} /></span>
        <Link className="smlms-tool-icon" to="/" title="Sousa Murray eLearning home" aria-label="Sousa Murray eLearning home"><Home size={19} /></Link>
        <a className="smlms-tool-icon" href="/api/auth/logout?returnTo=/lms/sign-in" title="Sign out" aria-label="Sign out"><LogOut size={19} /></a>
      </div>
    </header>

    <div className="smlms-body">{children}</div>

    <footer className="smlms-footer">
      <div>
        <strong>Sousa Murray eLearning</strong>
        <span>Operated by JA Group Services Ltd · Company number 16314179 · ICO registration ZB877370</span>
        <nav><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms of Use</Link><Link to="/complaints">Complaints</Link><Link to="/accessibility">Accessibility</Link></nav>
      </div>
      <div className="smlms-help"><strong>Can we help?</strong><Link to="/support">Help Centre</Link><Link to="/contact">Contact Sousa Murray eLearning</Link></div>
    </footer>
    <Link className="smlms-support-button" to="/support"><CircleAlert size={19} /> Support</Link>
  </div>;
}

function EmptyCoursePanel({ previous = false }: { previous?: boolean }) {
  return <div className="smlms-empty-courses">
    <BookOpen size={48} strokeWidth={1.5} />
    <span>{previous ? 'No previous courses' : 'No active courses'}</span>
  </div>;
}

function CourseRow({ enrolment, available }: { enrolment: Enrolment; available: boolean }) {
  const course = findLibraryCourse(enrolment.course_slug);
  const title = course?.title ?? enrolment.course_code;
  const certificate = enrolment.status === 'completed';

  return <article className="smlms-course-row">
    <div className="smlms-course-mark"><GraduationCap size={24} /></div>
    <div className="smlms-course-details">
      <small>{enrolment.course_code}{course ? ` · ${course.category}` : ''}</small>
      <h3>{title}</h3>
      <div className="smlms-progress-line"><i><b style={{ width: `${Math.max(0, Math.min(100, enrolment.progress_percent))}%` }} /></i><span>{enrolment.progress_percent}% · {statusText(enrolment.status)}</span></div>
    </div>
    {available
      ? <Link className="smlms-row-action" to={`/lms/course/${enrolment.course_slug}`}>{certificate ? 'Review course' : enrolment.progress_percent > 0 ? 'Continue' : 'Start course'}</Link>
      : <span className="smlms-history-label">Historical record</span>}
  </article>;
}

function PendingCourseRow({ course }: { course: AvailableCourse }) {
  return <article className="smlms-course-row smlms-course-pending">
    <div className="smlms-course-mark"><BookOpen size={24} /></div>
    <div className="smlms-course-details">
      <small>{course.code} · {course.category}</small>
      <h3>{course.title}</h3>
      <span>{accessLabel(course)} · learner details are required before enrolment.</span>
    </div>
    <Link className="smlms-row-action" to={`/lms/course/${course.slug}`}>Complete enrolment</Link>
  </article>;
}

export default function BrandedLearnerDashboard() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [organisation, setOrganisation] = useState<OrganisationResponse | null>(null);
  const [error, setError] = useState('');
  const [courseTab, setCourseTab] = useState<'active' | 'previous'>('active');
  const [busy, setBusy] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  const load = async () => {
    try {
      const account = await jsonRequest<MeResponse>('/api/lms/me');
      setMe(account);
      setError('');
      if (account.entitlement.ownedByUser && (account.entitlement.plan?.seatLimit ?? 0) > 1) {
        jsonRequest<OrganisationResponse>('/api/lms/organisation').then(setOrganisation).catch(() => setOrganisation(null));
      } else {
        setOrganisation(null);
      }
    } catch (reason) {
      if (errorStatus(reason) === 401) setError('authentication_required');
      else setError(reason instanceof Error ? reason.message : 'The learner account could not be loaded.');
    }
  };

  useEffect(() => { void load(); }, []);

  const availableSlugs = useMemo(() => new Set(me?.courses.map((course) => course.slug) ?? []), [me]);
  const sortedEnrolments = useMemo(() => [...(me?.enrolments ?? [])].sort((a, b) => {
    const bTime = Date.parse(b.updated_at || b.completed_at || b.enrolled_at);
    const aTime = Date.parse(a.updated_at || a.completed_at || a.enrolled_at);
    return bTime - aTime;
  }), [me]);
  const enrolledSlugs = useMemo(() => new Set(sortedEnrolments.map((item) => item.course_slug)), [sortedEnrolments]);
  const pendingCourses = useMemo(() => (me?.courses ?? []).filter((course) => !enrolledSlugs.has(course.slug)), [me, enrolledSlugs]);
  const activeCourses = useMemo(() => sortedEnrolments.filter((item) => item.status !== 'completed' && availableSlugs.has(item.course_slug)), [availableSlugs, sortedEnrolments]);
  const previousCourses = useMemo(() => sortedEnrolments.filter((item) => item.status === 'completed'), [sortedEnrolments]);
  const recentCourses = useMemo(() => sortedEnrolments.filter((item) => availableSlugs.has(item.course_slug)).slice(0, 4), [availableSlugs, sortedEnrolments]);

  if (error === 'authentication_required') return <div className="smlms-auth-page"><div><GraduationCap size={44} /><strong>Sousa Murray eLearning</strong><h1>Sign in to open your learning dashboard</h1><p>Your courses, progress, assessments and certificates are linked to your JA Group Services ID.</p><a href="/api/auth/login?returnTo=/lms/dashboard">Sign in with JA Group Services ID</a></div></div>;
  if (error) return <div className="smlms-auth-page"><div><CircleAlert size={44} /><h1>Your dashboard could not be loaded</h1><p>{error}</p><button onClick={() => void load()}>Try again</button></div></div>;
  if (!me) return <div className="smlms-auth-page"><div className="smlms-loading"><LoaderCircle /><strong>Loading your Sousa Murray eLearning account…</strong></div></div>;

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
    setBusy('invite');
    setInviteMessage('');
    try {
      const result = await jsonRequest<{ invitationUrl: string }>('/api/lms/organisation', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: 'learner' }),
      });
      setInviteMessage(`Invitation created: ${result.invitationUrl}`);
      setInviteEmail('');
      const refreshed = await jsonRequest<OrganisationResponse>('/api/lms/organisation');
      setOrganisation(refreshed);
    } catch (reason) {
      setInviteMessage(reason instanceof Error ? reason.message : 'Invitation could not be created.');
    } finally {
      setBusy('');
    }
  };

  const displayedCourses = courseTab === 'active' ? activeCourses : previousCourses;
  const hasAnyCurrentCourseAccess = me.courses.length > 0;
  const accessDescription = me.entitlement.active
    ? `${me.courses.length} courses available with your ${me.entitlement.plan?.name} access`
    : `${me.courses.length} individually assigned, purchased or trial course${me.courses.length === 1 ? '' : 's'} available`;

  return <LearnerChrome name={me.user.name}>
    <section className="smlms-account-strip">
      <div><span>My Sousa Murray eLearning</span><strong>{me.entitlement.active ? me.entitlement.plan?.name : 'No active Learning Library plan'}</strong><small>JA Group Services UCN: {me.user.headOfficeCustomerNumber}</small></div>
      <div className="smlms-account-actions">
        <Link to="/learning-library/courses"><BookOpen size={17} /> Browse {libraryCourses.length} courses</Link>
        {me.entitlement.ownedByUser && me.entitlement.subscription && <button onClick={manageBilling} disabled={busy === 'billing'}><CreditCard size={17} /> {busy === 'billing' ? 'Opening…' : 'Manage billing'}</button>}
      </div>
    </section>

    {!me.entitlement.active && <section className="smlms-plan-required"><ShieldCheck /><div><h2>No active Learning Library plan</h2><p>You can still use any course you have bought individually, received as a trial or been assigned. A plan gives broader catalogue access.</p></div><Link to="/plans">Buy a plan</Link></section>}

    {pendingCourses.length > 0 && <section className="smlms-panel">
      <div className="smlms-panel-heading"><h2>Ready for enrolment</h2><span>{pendingCourses.length} course access {pendingCourses.length === 1 ? 'is' : 'are'} waiting for learner details</span></div>
      <div className="smlms-course-list">{pendingCourses.map((course) => <PendingCourseRow key={course.slug} course={course} />)}</div>
    </section>}

    {(hasAnyCurrentCourseAccess || sortedEnrolments.length > 0 || me.certificates.length > 0) && <>
      <section className="smlms-panel smlms-recent-panel">
        <h2>Recently accessed courses</h2>
        {recentCourses.length ? <div className="smlms-course-list">{recentCourses.map((enrolment) => <CourseRow key={enrolment.id} enrolment={enrolment} available />)}</div> : <div className="smlms-empty-courses recent"><BookOpen size={54} strokeWidth={1.4} /><span>No recent courses</span><Link to="/learning-library/courses">Browse the course catalogue</Link></div>}
      </section>

      <section className="smlms-panel">
        <div className="smlms-panel-heading"><h2>Your courses</h2><span>{accessDescription}</span></div>
        <div className="smlms-course-tabs" role="tablist" aria-label="Course status">
          <button className={courseTab === 'active' ? 'active' : ''} onClick={() => setCourseTab('active')} role="tab" aria-selected={courseTab === 'active'}>Active courses <span>{activeCourses.length}</span></button>
          <button className={courseTab === 'previous' ? 'active' : ''} onClick={() => setCourseTab('previous')} role="tab" aria-selected={courseTab === 'previous'}>Previous courses <span>{previousCourses.length}</span></button>
          <Link to="/learning-library/courses">Browse full catalogue</Link>
        </div>
        {displayedCourses.length ? <div className="smlms-course-list">{displayedCourses.map((enrolment) => <CourseRow key={enrolment.id} enrolment={enrolment} available={availableSlugs.has(enrolment.course_slug)} />)}</div> : <EmptyCoursePanel previous={courseTab === 'previous'} />}
      </section>

      <section className="smlms-panel">
        <div className="smlms-panel-heading"><h2>Certificates</h2><span>{me.certificates.length} completion {me.certificates.length === 1 ? 'certificate' : 'certificates'}</span></div>
        {me.certificates.length ? <div className="smlms-certificate-list">{me.certificates.map((certificate) => <article key={certificate.id}><Award size={24} /><div><strong>{certificate.course_title}</strong><span>{certificate.certificate_number} · {certificate.score_percent}% · {dateText(certificate.issued_at)}</span></div><Link to={`/lms/certificate/${certificate.verification_token}`}>View certificate</Link></article>)}</div> : <div className="smlms-empty-courses compact"><Award size={42} strokeWidth={1.5} /><span>No certificates yet</span></div>}
      </section>

      {me.entitlement.ownedByUser && (me.entitlement.plan?.seatLimit ?? 0) > 1 && <section className="smlms-panel">
        <div className="smlms-panel-heading"><h2>Organisation learners</h2><span>{organisation?.members.length ?? 0} of {me.entitlement.plan?.seatLimit} named learner seats</span></div>
        <div className="smlms-invite"><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="learner@example.com" aria-label="Learner email address" /><button onClick={invite} disabled={!inviteEmail || busy === 'invite'}><Users size={17} /> {busy === 'invite' ? 'Creating…' : 'Create invitation'}</button></div>
        {inviteMessage && <p className="smlms-invite-message">{inviteMessage}</p>}
        <div className="smlms-member-list">{organisation?.members.map((member) => <article key={member.id}><Users size={20} /><div><strong>{member.invited_email ?? 'Connected JA Group Services ID'}</strong><span>{member.role} · {member.status}</span></div></article>)}</div>
      </section>}

      <section className="smlms-account-note"><CheckCircle2 /><p><strong>Your learning record is stored centrally.</strong> Learner enrolment, lesson progress, assessment attempts and certificates are recorded in the Sousa Murray eLearning LMS rather than only in this browser.</p></section>
    </>}

    {!hasAnyCurrentCourseAccess && sortedEnrolments.length === 0 && me.certificates.length === 0 && <section className="smlms-panel"><EmptyCoursePanel /></section>}
  </LearnerChrome>;
}