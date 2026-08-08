import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  findLibraryCourse,
  flattenCourseLessons,
  lessonKnowledgeChecks,
} from './libraryCatalogue';
import './programme-course-player.css';

type SessionResponse = {
  configured: boolean;
  authenticated: boolean;
  user: { accountId: string; email: string; name: string } | null;
};

type CourseState = {
  course: { slug: string; code: string; title: string; version: string };
  entitlementActive: boolean;
  accessSource?: string;
  accessExpiresAt?: string | null;
  enrolment: {
    id: string;
    status: string;
    progress_percent: number;
    assessment_score: number | null;
    enrolled_at: string;
  } | null;
  lessons: Array<{
    moduleId: string;
    lessonId: string;
    status: string;
    attempts: number;
    knowledgeCheckPassed: boolean;
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

type CapstoneState = {
  submission: null | {
    status: string;
    response: string;
    wordCount: number;
    submittedAt: string;
  };
};

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
  if (!response.ok) {
    const error = new Error(body.message || body.error || `Request failed (${response.status}).`) as Error & { status?: number; body?: unknown };
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function words(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export default function ProgrammeCoursePlayer({ slug }: { slug: string }) {
  const course = findLibraryCourse(slug);
  const [searchParams, setSearchParams] = useSearchParams();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [state, setState] = useState<CourseState | null>(null);
  const [capstone, setCapstone] = useState<CapstoneState['submission']>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [assignmentResponse, setAssignmentResponse] = useState('');
  const [feedback, setFeedback] = useState('');
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, number>>({});
  const [assessmentResult, setAssessmentResult] = useState<{ passed: boolean; score: number; passMark: number; certificate?: { verificationToken: string } | null } | null>(null);
  const [capstoneResponse, setCapstoneResponse] = useState('');
  const [legalFirstName, setLegalFirstName] = useState('');
  const [legalLastName, setLegalLastName] = useState('');
  const [enrolmentEmail, setEnrolmentEmail] = useState('');

  const lessons = useMemo(() => course ? flattenCourseLessons(course) : [], [course]);

  const load = async () => {
    if (!course) return;
    try {
      const [account, courseState] = await Promise.all([
        requestJson<SessionResponse>('/api/auth/session'),
        requestJson<CourseState>(`/api/lms/courses/${encodeURIComponent(course.slug)}`),
      ]);
      setSession(account);
      if (account.user) setEnrolmentEmail(account.user.email.toLowerCase());
      setState(courseState);
      setError('');
      if (courseState.enrolment && course.capstoneProject) {
        const capstoneState = await requestJson<CapstoneState>(`/api/lms/capstone?courseSlug=${encodeURIComponent(course.slug)}`);
        setCapstone(capstoneState.submission);
        if (capstoneState.submission?.response) setCapstoneResponse(capstoneState.submission.response);
      }
    } catch (reason) {
      const status = Number((reason as { status?: number })?.status || 0);
      if (status === 401) setError('authentication_required');
      else if (status === 403) {
        const body = (reason as { body?: CourseState }).body;
        if (body) setState(body);
        requestJson<SessionResponse>('/api/auth/session').then((account) => {
          setSession(account);
          if (account.user) setEnrolmentEmail(account.user.email.toLowerCase());
        }).catch(() => undefined);
        setError('');
      } else setError(reason instanceof Error ? reason.message : 'The programme could not be loaded.');
    }
  };

  useEffect(() => { void load(); }, [slug]);

  if (!course) return <main className="pcp-centred"><h1>Programme not found</h1><Link to="/learning-library/courses">Return to catalogue</Link></main>;
  if (error === 'authentication_required') return <main className="pcp-centred"><LockKeyhole /><h1>Sign in to open this programme</h1><p>Your progress, assignments, assessment and certificate are recorded against your JA Group Services ID.</p><a className="pcp-primary" href={`/api/auth/login?returnTo=${encodeURIComponent(`/lms/course/${course.slug}`)}`}>Sign in securely <ArrowRight /></a></main>;
  if (error) return <main className="pcp-centred"><CircleAlert /><h1>Something needs attention</h1><p>{error}</p></main>;
  if (!state) return <main className="pcp-centred"><LoaderCircle className="pcp-spin" /><h1>Loading programme</h1></main>;

  const progressByLesson = new Map(state.lessons.map((item) => [item.lessonId, item]));
  const completedLessons = state.lessons.filter((item) => item.status === 'completed').length;
  const allLessonsComplete = completedLessons === lessons.length;
  const lessonId = searchParams.get('lesson');
  const assessmentMode = searchParams.get('assessment') === '1';
  const capstoneMode = searchParams.get('capstone') === '1';
  const lesson = lessonId ? lessons.find((item) => item.id === lessonId) : null;

  const enrol = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setFeedback('');
    try {
      await requestJson('/api/lms/enrolments', {
        method: 'POST',
        body: JSON.stringify({
          courseSlug: course.slug,
          learner: {
            legalFirstName: legalFirstName.trim(),
            legalLastName: legalLastName.trim(),
            enrolmentEmail: enrolmentEmail.trim().toLowerCase(),
          },
        }),
      });
      await load();
      if (lessons[0]) setSearchParams({ lesson: lessons[0].id });
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : 'Enrolment could not be completed.');
    } finally { setBusy(false); }
  };

  if (!state.entitlementActive) return <main className="pcp-overview">
    <section className="pcp-overview-hero"><div><span>{course.code} · 12-week programme</span><h1>{course.title}</h1><p>{course.overview}</p><div className="pcp-overview-meta"><span><Clock3 /> {course.studyPlan?.totalQualificationTimeHours} hours total study</span><span><BookOpen /> 12 weeks · {lessons.length} lessons</span></div></div></section>
    <section className="pcp-access-card"><h2>This programme is not currently in your learning account</h2><p>Purchase the programme individually for 12 months of access, or use a Learning Library plan that includes it.</p><Link className="pcp-primary" to={`/learning-library/courses/${course.slug}`}>View purchase options <ArrowRight /></Link><Link className="pcp-secondary" to="/plans">View Learning Library plans</Link></section>
  </main>;

  if (!state.enrolment) return <main className="pcp-enrol"><section><GraduationCap /><span>Named learner enrolment</span><h1>Enrol on {course.title}</h1><p>This is a 12-week programme. We need the learner's legal details before creating the learning record and future certificate.</p><form onSubmit={enrol}><label>Legal first name<input value={legalFirstName} onChange={(event) => setLegalFirstName(event.target.value)} required /></label><label>Legal last name<input value={legalLastName} onChange={(event) => setLegalLastName(event.target.value)} required /></label><label>Enrolment email<input type="email" value={enrolmentEmail} onChange={(event) => setEnrolmentEmail(event.target.value)} readOnly={Boolean(session?.authenticated)} required /></label>{feedback && <p className="pcp-feedback error">{feedback}</p>}<button className="pcp-primary" disabled={busy}>{busy ? 'Creating learning record…' : 'Enrol and start Week 1'} <ArrowRight /></button></form></section></main>;

  if (!lessonId && !assessmentMode && !capstoneMode) {
    const next = lessons.find((item) => progressByLesson.get(item.id)?.status !== 'completed') ?? lessons[0];
    if (next) queueMicrotask(() => setSearchParams({ lesson: next.id }));
    return <main className="pcp-centred"><LoaderCircle className="pcp-spin" /><h1>Opening your next lesson</h1></main>;
  }

  const submitLesson = async () => {
    if (!lesson) return;
    const checks = lessonKnowledgeChecks(lesson);
    if (Object.keys(selectedAnswers).length !== checks.length) {
      setFeedback(`Answer all ${checks.length} formative questions before submitting.`);
      return;
    }
    if (lesson.assignment && words(assignmentResponse) < lesson.assignment.minimumWords) {
      setFeedback(`Complete the applied learning journal with at least ${lesson.assignment.minimumWords} words. You currently have ${words(assignmentResponse)}.`);
      return;
    }
    setBusy(true); setFeedback('');
    try {
      const result = await requestJson<{ passed: boolean; explanation: string }>('/api/lms/progress', {
        method: 'POST',
        body: JSON.stringify({
          courseSlug: course.slug,
          lessonId: lesson.id,
          selectedAnswers: checks.map((_, index) => selectedAnswers[index]),
          assignmentResponse,
        }),
      });
      setFeedback(result.explanation);
      await load();
      if (result.passed) {
        const index = lessons.findIndex((item) => item.id === lesson.id);
        const next = lessons[index + 1];
        window.setTimeout(() => {
          setSelectedAnswers({});
          setAssignmentResponse('');
          setFeedback('');
          if (next) setSearchParams({ lesson: next.id });
          else setSearchParams({ capstone: '1' });
        }, 900);
      }
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : 'The lesson could not be submitted.');
    } finally { setBusy(false); }
  };

  const submitCapstone = async () => {
    setBusy(true); setFeedback('');
    try {
      await requestJson('/api/lms/capstone', {
        method: 'POST',
        body: JSON.stringify({ courseSlug: course.slug, response: capstoneResponse }),
      });
      await load();
      setFeedback('Capstone project submitted. You can now take the final assessment.');
      setSearchParams({ assessment: '1' });
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : 'The capstone project could not be submitted.');
    } finally { setBusy(false); }
  };

  const submitAssessment = async () => {
    setBusy(true); setFeedback('');
    try {
      const result = await requestJson<{ passed: boolean; score: number; passMark: number; certificate?: { verificationToken: string } | null }>('/api/lms/assessment', {
        method: 'POST', body: JSON.stringify({ courseSlug: course.slug, answers: assessmentAnswers }),
      });
      setAssessmentResult(result);
      await load();
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : 'The final assessment could not be submitted.');
    } finally { setBusy(false); }
  };

  const sidebar = <aside className="pcp-sidebar">
    <Link className="pcp-lms-brand" to="/lms/dashboard"><GraduationCap /> Sousa Murray LMS</Link>
    <Link className="pcp-back" to="/lms/dashboard"><ArrowLeft /> Learner dashboard</Link>
    <h2>{course.title}</h2>
    <p>{course.studyPlan?.durationWeeks} weeks · {course.studyPlan?.expectedHoursPerWeek}</p>
    <div className="pcp-progress"><i><b style={{ width: `${state.enrolment.progress_percent}%` }} /></i><span>{completedLessons} of {lessons.length} lessons complete</span></div>
    <nav>{course.modules.map((module) => <section key={module.id}><span>Week {module.week}: {module.title.replace(/^Week \d+: /, '')}</span>{module.lessons.map((item) => { const progress = progressByLesson.get(item.id); return <button key={item.id} className={item.id === lessonId ? 'active' : ''} onClick={() => { setSelectedAnswers({}); setAssignmentResponse(''); setFeedback(''); setSearchParams({ lesson: item.id }); }}><i>{progress?.status === 'completed' ? <Check /> : lessons.findIndex((entry) => entry.id === item.id) + 1}</i><b>{item.title}</b></button>; })}</section>)}</nav>
    <button className="pcp-stage-button" disabled={!allLessonsComplete} onClick={() => setSearchParams({ capstone: '1' })}><BookOpen /> Capstone project {allLessonsComplete ? '' : '(locked)'}</button>
    <button className="pcp-stage-button" disabled={!allLessonsComplete || !capstone} onClick={() => setSearchParams({ assessment: '1' })}><Award /> Final assessment {!capstone ? '(capstone required)' : ''}</button>
  </aside>;

  if (capstoneMode) return <main className="pcp-player">{sidebar}<section className="pcp-content"><article className="pcp-card pcp-capstone"><span>Programme capstone</span><h1>{course.capstoneProject?.title}</h1><p>{course.capstoneProject?.brief}</p>{!allLessonsComplete && <p className="pcp-feedback error">Complete every weekly lesson before starting the capstone.</p>}<h2>Required deliverables</h2><ul>{course.capstoneProject?.deliverables.map((item) => <li key={item}><Check /> {item}</li>)}</ul><p><strong>Expected effort:</strong> approximately {course.capstoneProject?.estimatedHours} hours.</p><label>Your capstone report<textarea rows={18} value={capstoneResponse} onChange={(event) => setCapstoneResponse(event.target.value)} disabled={!allLessonsComplete} /><small>{words(capstoneResponse)} words · minimum 500 words</small></label>{feedback && <p className="pcp-feedback">{feedback}</p>}<button className="pcp-primary" onClick={submitCapstone} disabled={busy || !allLessonsComplete || words(capstoneResponse) < 500}>{busy ? 'Submitting capstone…' : capstone ? 'Resubmit capstone' : 'Submit capstone project'} <ArrowRight /></button>{capstone && <p className="pcp-passed"><CheckCircle2 /> Capstone submitted · {capstone.wordCount} words</p>}</article></section></main>;

  if (assessmentMode) return <main className="pcp-player">{sidebar}<section className="pcp-content"><article className="pcp-card pcp-assessment"><span>Final programme assessment</span><h1>{course.finalAssessment.title}</h1><p>{course.finalAssessment.instructions}</p>{!capstone && <p className="pcp-feedback error">Submit the capstone project before attempting the final assessment.</p>}{assessmentResult && <div className={assessmentResult.passed ? 'pcp-result passed' : 'pcp-result'}><strong>{assessmentResult.passed ? 'Programme assessment passed' : 'Assessment not yet passed'}</strong><span>{assessmentResult.score}% · Required {assessmentResult.passMark}%</span>{assessmentResult.passed && (assessmentResult.certificate?.verificationToken || state.certificate?.verificationToken) && <Link to={`/lms/certificate/${assessmentResult.certificate?.verificationToken || state.certificate?.verificationToken}`}>View certificate <Award /></Link>}</div>}{capstone && !assessmentResult && <div className="pcp-assessment-questions">{course.finalAssessment.questions.map((question, questionIndex) => <fieldset key={question.id}><legend>{questionIndex + 1}. {question.question}</legend>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={question.id} checked={assessmentAnswers[question.id] === optionIndex} onChange={() => setAssessmentAnswers((current) => ({ ...current, [question.id]: optionIndex }))} /><span>{option}</span></label>)}</fieldset>)}</div>}{feedback && <p className="pcp-feedback">{feedback}</p>}{capstone && !assessmentResult && <button className="pcp-primary" onClick={submitAssessment} disabled={busy || Object.keys(assessmentAnswers).length !== course.finalAssessment.questions.length}>{busy ? 'Marking assessment…' : `Submit ${course.finalAssessment.questions.length}-question assessment`} <ArrowRight /></button>}</article></section></main>;

  if (!lesson) return <main className="pcp-centred"><CircleAlert /><h1>Lesson not found</h1></main>;
  const lessonProgress = progressByLesson.get(lesson.id);
  const checks = lessonKnowledgeChecks(lesson);

  return <main className="pcp-player">{sidebar}<section className="pcp-content"><div className="pcp-top"><span>Week {lesson.moduleWeek} · Lesson {lesson.sequence + 1} of {lessons.length}</span><Link to={`/learning-library/courses/${course.slug}`}>Programme information</Link></div><article className="pcp-card pcp-lesson"><header><span>{lessonProgress?.status === 'completed' ? <><CheckCircle2 /> Completed</> : 'Current lesson'}</span><h1>{lesson.title}</h1><p>{lesson.summary}</p><div className="pcp-time"><Clock3 /> Approximately {lesson.minutes} minutes taught study{lesson.assignment ? ` + ${lesson.assignment.estimatedMinutes} minutes applied work` : ''}</div><h2>Learning objectives</h2><ul>{lesson.objectives.map((objective) => <li key={objective}><Check /> {objective}</li>)}</ul></header>{lesson.sections.map((section) => <section className="pcp-section" key={section.heading}><h2>{section.heading}</h2>{section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}{section.callout && <aside>{section.callout}</aside>}</section>)}{lesson.activity && <section className="pcp-activity"><span>Practical activity</span><h2>{lesson.activity.title}</h2><ol>{lesson.activity.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></section>}{lesson.assignment && <section className="pcp-assignment"><span>Applied learning journal</span><h2>{lesson.assignment.title}</h2><p>{lesson.assignment.brief}</p><ul>{lesson.assignment.deliverables.map((item) => <li key={item}><Check /> {item}</li>)}</ul><strong>Reflection question</strong><p>{lesson.assignment.reflectionPrompt}</p><textarea rows={12} value={assignmentResponse} onChange={(event) => setAssignmentResponse(event.target.value)} disabled={lessonProgress?.status === 'completed'} placeholder="Write your applied learning journal here…" /><small>{words(assignmentResponse)} words · minimum {lesson.assignment.minimumWords}</small></section>}<section className="pcp-formative"><span>Formative assessment</span><h2>Check your understanding</h2><p>You need at least 80% across all {checks.length} questions. For workshop lessons, the written learning journal must also be complete.</p>{checks.map((check, questionIndex) => <fieldset key={`${lesson.id}-${questionIndex}`}><legend>{questionIndex + 1}. {check.question}</legend>{check.options.map((option, optionIndex) => <label key={option}><input type="radio" name={`${lesson.id}-${questionIndex}`} checked={selectedAnswers[questionIndex] === optionIndex} onChange={() => setSelectedAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))} disabled={lessonProgress?.status === 'completed'} /><span>{option}</span></label>)}</fieldset>)}{feedback && <p className="pcp-feedback">{feedback}</p>}{lessonProgress?.status !== 'completed' ? <button className="pcp-primary" onClick={submitLesson} disabled={busy}>{busy ? 'Checking lesson work…' : 'Submit lesson work'} <ArrowRight /></button> : <p className="pcp-passed"><CheckCircle2 /> Lesson requirements completed</p>}</section></article></section></main>;
}
