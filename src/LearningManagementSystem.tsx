import {
  ArrowLeft, ArrowRight, Award, BookOpen, Check, CheckCircle2, ChevronRight,
  ClipboardCheck, Clock3, Filter, GraduationCap, Infinity as InfinityIcon,
  Library, ListChecks, LockKeyhole, PlayCircle, RotateCcw, Search, ShieldCheck,
  Target, Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  courseDuration,
  coursesForPlan,
  findLibraryCourse,
  flattenCourseLessons,
  isCourseIncluded,
  libraryCategories,
  libraryCourses,
  type CoursePlan,
  type LibraryCourse,
} from './libraryCatalogue';
import './lms.css';
import './lms-professional.css';

type AssessmentAttempt = {
  score: number;
  passed: boolean;
  completedAt: string;
};

type CertificateRecord = {
  courseSlug: string;
  number: string;
  issued: string;
  courseVersion: string;
  score: number;
};

type LmsState = {
  learnerName: string;
  activePlan: CoursePlan;
  enrolled: string[];
  progress: Record<string, boolean>;
  attempts: Record<string, AssessmentAttempt[]>;
  certificates: CertificateRecord[];
};

const STORAGE_KEY = 'sousa-murray-lms-v2';
const plans: CoursePlan[] = ['Learner', 'Learner Plus', 'Team 5', 'Team 15'];

function defaultState(): LmsState {
  return {
    learnerName: 'Example Learner',
    activePlan: 'Learner Plus',
    enrolled: ['starting-a-small-business', 'ai-literacy-for-everyday-work'],
    progress: {},
    attempts: {},
    certificates: [],
  };
}

function loadState(): LmsState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState();
    const parsed = JSON.parse(stored) as Partial<LmsState>;
    return {
      ...defaultState(),
      ...parsed,
      progress: parsed.progress ?? {},
      attempts: parsed.attempts ?? {},
      certificates: parsed.certificates ?? [],
    };
  } catch {
    return defaultState();
  }
}

function saveState(state: LmsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function useLmsState() {
  const [state, setValue] = useState<LmsState>(loadState);
  const setState = (next: LmsState | ((current: LmsState) => LmsState)) => {
    setValue((current) => {
      const value = typeof next === 'function' ? next(current) : next;
      saveState(value);
      return value;
    });
  };
  return [state, setState] as const;
}

function lessonKey(courseSlug: string, lessonId: string) {
  return `${courseSlug}:${lessonId}`;
}

function courseStats(course: LibraryCourse, state: LmsState) {
  const lessons = flattenCourseLessons(course);
  const completedLessons = lessons.filter((item) => state.progress[lessonKey(course.slug, item.id)]).length;
  const latestAttempt = state.attempts[course.slug]?.at(-1);
  const lessonPercentage = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0;
  return {
    lessons,
    completedLessons,
    lessonsComplete: completedLessons === lessons.length,
    assessmentPassed: Boolean(latestAttempt?.passed),
    latestAttempt,
    lessonPercentage,
    complete: completedLessons === lessons.length && Boolean(latestAttempt?.passed),
  };
}

function ProgressBar({ course, state }: { course: LibraryCourse; state: LmsState }) {
  const stats = courseStats(course, state);
  const percentage = stats.assessmentPassed ? 100 : Math.min(95, stats.lessonPercentage);
  return <div className="lms-progress"><div><span style={{ width: `${percentage}%` }} /></div><small>{stats.assessmentPassed ? 'Course complete' : `${stats.completedLessons} of ${stats.lessons.length} lessons complete`}</small></div>;
}

function PreviewNotice() {
  return <div className="lms-preview-notice"><ShieldCheck size={20} /><div><strong>Development learner environment</strong><span>Course content and learning rules are active. Live authentication, payment webhooks and central learner records are still to be connected, so this preview stores progress on this device.</span></div></div>;
}

function PlanBadge({ plan }: { plan: CoursePlan }) {
  return <span className="lms-plan-badge">{plan}</span>;
}

function SignInPage() {
  const [state, setState] = useLmsState();
  const [params] = useSearchParams();
  const requestedPlan = params.get('plan');
  const selectedPlan = plans.includes(requestedPlan as CoursePlan) ? requestedPlan as CoursePlan : state.activePlan;

  return <main className="lms-signin-page"><section className="lms-signin-shell"><div className="lms-signin-intro"><div className="lms-product-mark"><GraduationCap /> Sousa Murray LMS</div><h1>Your learning, progress and certificates in one place.</h1><p>The live JA Group Services ID connection is still being prepared. The complete learner environment can be previewed now using a selected Learning Library plan.</p><ul><li><Check /> Plan-based course access</li><li><Check /> Structured modules and lessons</li><li><Check /> Knowledge checks and final assessments</li><li><Check /> Completion records and certificates</li></ul></div><div className="lms-signin-card"><LockKeyhole size={34} /><span className="lms-status-pill">Authentication integration pending</span><h2>LMS sign in</h2><p>Credential entry is disabled until JA Group Services ID is connected.</p><label>Email address<input type="email" placeholder="name@example.com" disabled /></label><label>Password<input type="password" placeholder="Password" disabled /></label><button type="button" disabled>Sign in with JA Group Services ID</button><div className="lms-preview-plan"><label>Preview plan<select value={selectedPlan} onChange={(event) => setState({ ...state, activePlan: event.target.value as CoursePlan })}>{plans.map((plan) => <option key={plan}>{plan}</option>)}</select></label><span>{coursesForPlan(selectedPlan).length} courses included</span></div><Link className="lms-preview-button" to="/lms/dashboard" onClick={() => setState({ ...state, activePlan: selectedPlan })}>Open learner LMS preview <ArrowRight size={17} /></Link><small>No credentials are accepted and no paid subscription is created.</small></div></section></main>;
}

function CataloguePage() {
  const [state] = useLmsState();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All subjects');
  const [access, setAccess] = useState<'All courses' | 'Included in my plan'>('All courses');
  const filtered = useMemo(() => {
    const normalised = query.trim().toLowerCase();
    return libraryCourses.filter((course) => {
      const text = `${course.title} ${course.shortDescription} ${course.overview} ${course.category} ${course.code} ${course.learningOutcomes.join(' ')}`.toLowerCase();
      const categoryMatch = category === 'All subjects' || course.category === category;
      const accessMatch = access === 'All courses' || isCourseIncluded(course, state.activePlan);
      return categoryMatch && accessMatch && (!normalised || text.includes(normalised));
    });
  }, [query, category, access, state.activePlan]);

  return <main><section className="lms-page-hero"><div className="lp-container"><div className="lp-eyebrow"><Library size={16} /> Sousa Murray Learning Library</div><h1>Structured courses built for practical progress.</h1><p>Review full course information, outcomes, modules, assessment rules and certificate status before starting.</p><div className="lp-actions"><Link className="lp-button light" to="/lms/dashboard">Learner dashboard <ArrowRight /></Link><Link className="lp-button ghost" to="/plans">Compare plans</Link></div></div></section><section className="lms-catalogue-section"><div className="lp-container"><PreviewNotice /><div className="lms-library-summary"><div><strong>{libraryCourses.length}</strong><span>authored courses</span></div><div><strong>{libraryCourses.reduce((total, course) => total + course.modules.length, 0)}</strong><span>course modules</span></div><div><strong>{libraryCourses.reduce((total, course) => total + flattenCourseLessons(course).length, 0)}</strong><span>structured lessons</span></div><div><strong>80%</strong><span>standard pass mark</span></div></div><div className="lms-catalogue-toolbar lms-catalogue-toolbar-expanded"><label><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search course, outcome or course code" /></label><label><Filter size={18} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All subjects</option>{libraryCategories.map((item) => <option key={item}>{item}</option>)}</select></label><label><ShieldCheck size={18} /><select value={access} onChange={(event) => setAccess(event.target.value as typeof access)}><option>All courses</option><option>Included in my plan</option></select></label></div><div className="lms-result-count"><strong>{filtered.length} courses</strong><span>Preview plan: <PlanBadge plan={state.activePlan} /></span></div><div className="lms-course-grid">{filtered.map((course) => { const included = isCourseIncluded(course, state.activePlan); const lessons = flattenCourseLessons(course); return <article className="lms-course-card lms-course-card-detailed" key={course.slug}><div className="lms-course-card-top"><span>{course.category}</span><span>{course.code}</span></div><BookOpen size={30} /><h2>{course.title}</h2><p>{course.shortDescription}</p><div className="lms-course-meta"><span><Clock3 size={16} /> {courseDuration(course)} minutes</span><span><ListChecks size={16} /> {course.modules.length} modules</span><span><PlayCircle size={16} /> {lessons.length} lessons</span></div><div className="lms-card-outcomes"><strong>You will learn to:</strong><ul>{course.learningOutcomes.slice(0, 3).map((outcome) => <li key={outcome}><Check size={14} /> {outcome}</li>)}</ul></div><div className="lms-course-access"><span className={included ? 'included' : 'upgrade'}>{included ? `Included in ${state.activePlan}` : 'Plan upgrade required'}</span><span>{course.level}</span></div><Link to={`/learning-library/courses/${course.slug}`}>View full course <ArrowRight size={16} /></Link></article>; })}</div></div></section></main>;
}

function PublicCoursePage({ slug }: { slug: string }) {
  const [state, setState] = useLmsState();
  const course = findLibraryCourse(slug);
  if (!course) return <NotFound title="Course not found" back="/learning-library/courses" />;
  const included = isCourseIncluded(course, state.activePlan);
  const lessons = flattenCourseLessons(course);
  const enrolled = state.enrolled.includes(course.slug);
  const startCourse = () => {
    if (!included) return;
    if (!enrolled) setState({ ...state, enrolled: [...state.enrolled, course.slug] });
  };

  return <main><section className="lms-course-information-hero"><div className="lp-container lms-course-information-grid"><div><Link className="lms-public-back" to="/learning-library/courses"><ArrowLeft size={16} /> Learning Library</Link><div className="lms-course-kicker"><span>{course.category}</span><span>{course.code}</span><span>Version {course.version}</span></div><h1>{course.title}</h1><p>{course.overview}</p><div className="lms-course-info-meta"><span><Clock3 /> {courseDuration(course)} minutes</span><span><ListChecks /> {course.modules.length} modules</span><span><PlayCircle /> {lessons.length} lessons</span><span><ClipboardCheck /> {course.finalAssessment.passMark}% pass mark</span></div></div><aside><span className={included ? 'lms-access-status included' : 'lms-access-status upgrade'}>{included ? `Included in your ${state.activePlan} preview` : `Not included in ${state.activePlan}`}</span><h2>Start this course</h2><p>Complete every lesson knowledge check, then pass the final assessment to receive the completion certificate.</p>{included ? <Link to={`/lms/course/${course.slug}`} onClick={startCourse}>{enrolled ? 'Continue in LMS' : 'Enrol and start'} <ArrowRight /></Link> : <Link to="/plans">Compare plans <ArrowRight /></Link>}<small>{course.certificateStatement}</small></aside></div></section><section className="lms-course-information"><div className="lp-container lms-course-information-layout"><div className="lms-course-main"><article><h2>Learning outcomes</h2><ul className="lms-outcome-list">{course.learningOutcomes.map((outcome) => <li key={outcome}><Target size={18} /><span>{outcome}</span></li>)}</ul></article><article><h2>Course syllabus</h2><div className="lms-syllabus">{course.modules.map((module, moduleIndex) => <section key={module.id}><header><span>Module {moduleIndex + 1}</span><h3>{module.title.replace(/^Module \d+: /, '')}</h3><p>{module.description}</p></header>{module.lessons.map((item, lessonIndex) => <div key={item.id}><i>{moduleIndex + 1}.{lessonIndex + 1}</i><span><strong>{item.title}</strong><small>{item.summary} · {item.minutes} minutes</small></span></div>)}</section>)}</div></article><article><h2>Assessment and certificate</h2><p>{course.finalAssessment.instructions}</p><dl className="lms-course-definitions"><div><dt>Assessment</dt><dd>{course.finalAssessment.questions.length} questions</dd></div><div><dt>Pass mark</dt><dd>{course.finalAssessment.passMark}%</dd></div><div><dt>Attempts</dt><dd>Retakes permitted after reviewing the course</dd></div><div><dt>Certificate</dt><dd>{course.certificateStatement}</dd></div></dl><div className="lms-important-notice"><ShieldCheck /><p>{course.importantNotice}</p></div></article>{course.sources?.length ? <article><h2>Content reference sources</h2><p>Regulated and safety-related awareness content is informed by the following official guidance. Organisation-specific procedures take priority for operational action.</p><ul className="lms-source-list">{course.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} <ArrowRight size={14} /></a></li>)}</ul></article> : null}</div><aside className="lms-course-side"><article><h3>Who this course is for</h3><ul>{course.audience.map((item) => <li key={item}><Users size={16} /> {item}</li>)}</ul></article><article><h3>Prerequisites</h3><p>{course.prerequisites}</p></article><article><h3>Included plans</h3><div>{course.includedPlans.map((plan) => <PlanBadge key={plan} plan={plan} />)}</div></article><article><h3>Content governance</h3><dl><div><dt>Course code</dt><dd>{course.code}</dd></div><div><dt>Version</dt><dd>{course.version}</dd></div><div><dt>Review date</dt><dd>{course.reviewDate}</dd></div><div><dt>Level</dt><dd>{course.level}</dd></div></dl></article></aside></div></section></main>;
}

function DashboardPage() {
  const [state, setState] = useLmsState();
  const available = coursesForPlan(state.activePlan);
  const enrolledCourses = state.enrolled.map(findLibraryCourse).filter((course): course is LibraryCourse => Boolean(course && isCourseIncluded(course, state.activePlan)));
  const certificates = state.certificates.filter((certificate) => isCourseIncluded(findLibraryCourse(certificate.courseSlug) ?? libraryCourses[0], state.activePlan));

  return <main className="lms-app-background"><div className="lp-container lms-dashboard"><PreviewNotice /><header className="lms-dashboard-header"><div><span>Learner dashboard</span><h1>Hello, {state.learnerName.split(' ')[0]}</h1><p>Continue your enrolled courses, review assessments and access completion records.</p></div><div className="lms-dashboard-actions"><label>Preview plan<select value={state.activePlan} onChange={(event) => setState({ ...state, activePlan: event.target.value as CoursePlan })}>{plans.map((plan) => <option key={plan}>{plan}</option>)}</select></label><Link to="/learning-library/courses">Browse catalogue <ArrowRight /></Link></div></header><div className="lms-metric-grid"><article><BookOpen /><span>Courses included</span><strong>{available.length}</strong></article><article><PlayCircle /><span>Courses enrolled</span><strong>{enrolledCourses.length}</strong></article><article><ClipboardCheck /><span>Assessments passed</span><strong>{Object.values(state.attempts).filter((attempts) => attempts.some((attempt) => attempt.passed)).length}</strong></article><article><Award /><span>Certificates</span><strong>{certificates.length}</strong></article></div><section className="lms-dashboard-section"><div className="lms-dashboard-section-head"><div><span>My learning</span><h2>Enrolled courses</h2></div><Link to="/learning-library/courses">Explore all included courses</Link></div>{enrolledCourses.length ? <div className="lms-enrolled-list">{enrolledCourses.map((course) => { const stats = courseStats(course, state); return <article key={course.slug}><div className="lms-enrolled-icon">{stats.complete ? <CheckCircle2 /> : <BookOpen />}</div><div className="lms-enrolled-copy"><span>{course.code} · {course.category}</span><h3>{course.title}</h3><ProgressBar course={course} state={state} /></div><Link to={stats.lessonsComplete && !stats.assessmentPassed ? `/lms/course/${course.slug}/assessment` : `/lms/course/${course.slug}`}>{stats.complete ? 'Review course' : stats.lessonsComplete ? 'Take assessment' : 'Continue'} <ArrowRight /></Link></article>; })}</div> : <div className="lms-empty-state"><BookOpen /><h3>No courses enrolled</h3><p>Choose an included course from the Learning Library catalogue.</p><Link to="/learning-library/courses">Browse courses</Link></div>}</section><section className="lms-dashboard-section"><div className="lms-dashboard-section-head"><div><span>Completion records</span><h2>Certificates</h2></div></div>{certificates.length ? <div className="lms-certificate-list">{certificates.map((certificate) => { const course = findLibraryCourse(certificate.courseSlug); return <article key={certificate.number}><Award /><div><strong>{course?.title}</strong><span>{certificate.number} · Score {certificate.score}% · Issued {certificate.issued}</span></div><Link to={`/lms/certificate/${certificate.courseSlug}`}>View certificate</Link></article>; })}</div> : <div className="lms-empty-state"><Award /><h3>No certificates yet</h3><p>Complete all lessons and pass a final assessment to receive a certificate.</p></div>}</section></div></main>;
}

function AccessDenied({ course, plan }: { course: LibraryCourse; plan: CoursePlan }) {
  return <main className="lms-app-background"><div className="lp-container lms-access-denied"><LockKeyhole /><h1>This course is not included in {plan}</h1><p>{course.title} is available through {course.includedPlans.join(', ')}.</p><div><Link to="/plans">Compare plans</Link><Link to={`/learning-library/courses/${course.slug}`}>View course information</Link></div></div></main>;
}

function CoursePlayer({ slug }: { slug: string }) {
  const course = findLibraryCourse(slug);
  const [state, setState] = useLmsState();
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('lesson') ?? 0);
  const lessons = course ? flattenCourseLessons(course) : [];
  const lessonIndex = Number.isFinite(requested) ? Math.min(Math.max(requested, 0), Math.max(lessons.length - 1, 0)) : 0;
  const current = lessons[lessonIndex];
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (course && isCourseIncluded(course, state.activePlan) && !state.enrolled.includes(course.slug)) {
      setState((currentState) => ({ ...currentState, enrolled: [...currentState.enrolled, course.slug] }));
    }
  }, [course?.slug, state.activePlan]);

  if (!course || !current) return <NotFound title="Course not found" back="/learning-library/courses" />;
  if (!isCourseIncluded(course, state.activePlan)) return <AccessDenied course={course} plan={state.activePlan} />;
  const completed = Boolean(state.progress[lessonKey(course.slug, current.id)]);
  const stats = courseStats(course, state);

  const goTo = (index: number) => {
    setParams({ lesson: String(index) });
    setSelectedAnswer(null);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const completeLesson = () => {
    if (completed) {
      if (lessonIndex < lessons.length - 1) goTo(lessonIndex + 1);
      return;
    }
    if (selectedAnswer === null) {
      setMessage('Choose an answer before completing this lesson.');
      return;
    }
    if (selectedAnswer !== current.knowledgeCheck.answer) {
      setMessage(current.knowledgeCheck.explanation);
      return;
    }
    const nextProgress = { ...state.progress, [lessonKey(course.slug, current.id)]: true };
    setState({ ...state, progress: nextProgress });
    setMessage('Correct. This lesson is complete.');
    if (lessonIndex < lessons.length - 1) window.setTimeout(() => goTo(lessonIndex + 1), 550);
  };

  return <main className="lms-course-player"><aside className="lms-course-sidebar"><Link className="lms-sidebar-brand" to="/lms/dashboard"><GraduationCap /> Sousa Murray LMS</Link><Link className="lms-back-dashboard" to="/lms/dashboard"><ArrowLeft size={16} /> Learner dashboard</Link><div className="lms-sidebar-course"><span>{course.code}</span><strong>{course.title}</strong><ProgressBar course={course} state={state} /></div><nav>{course.modules.map((module) => <section key={module.id}><h3>{module.title}</h3>{module.lessons.map((item) => { const index = lessons.findIndex((lessonItem) => lessonItem.id === item.id); const isComplete = Boolean(state.progress[lessonKey(course.slug, item.id)]); return <button className={index === lessonIndex ? 'active' : ''} key={item.id} onClick={() => goTo(index)}><i>{isComplete ? <Check size={14} /> : index + 1}</i><span>{item.title}</span></button>; })}</section>)}<section><h3>Final assessment</h3><Link className={stats.lessonsComplete ? 'lms-assessment-nav ready' : 'lms-assessment-nav'} to={stats.lessonsComplete ? `/lms/course/${course.slug}/assessment` : '#'} onClick={(event) => { if (!stats.lessonsComplete) event.preventDefault(); }}><i><ClipboardCheck size={14} /></i><span>{stats.assessmentPassed ? 'Assessment passed' : stats.lessonsComplete ? 'Take final assessment' : 'Complete all lessons first'}</span></Link></section></nav></aside><section className="lms-lesson-area"><div className="lms-lesson-topbar"><Link to={`/learning-library/courses/${course.slug}`}>Course information</Link><span>Lesson {lessonIndex + 1} of {lessons.length} · {current.moduleTitle}</span></div><article className="lms-lesson-card lms-lesson-card-rich"><div className="lms-lesson-heading"><span>{completed ? <><CheckCircle2 size={17} /> Completed</> : `${current.minutes} minute lesson`}</span><h1>{current.title}</h1><p>{current.summary}</p></div><div className="lms-objectives"><strong>By the end of this lesson, you should be able to:</strong><ul>{current.objectives.map((objective) => <li key={objective}><Target size={16} /> {objective}</li>)}</ul></div><div className="lms-lesson-content">{current.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets?.length ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}{section.callout ? <aside><ShieldCheck size={18} /><p>{section.callout}</p></aside> : null}</section>)}</div>{current.activity ? <section className="lms-activity"><span>Practical activity</span><h2>{current.activity.title}</h2><ol>{current.activity.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></section> : null}<section className="lms-quiz"><span>Lesson knowledge check</span><h2>{current.knowledgeCheck.question}</h2>{current.knowledgeCheck.options.map((option, index) => <label key={option}><input type="radio" name="lesson-check" checked={selectedAnswer === index} disabled={completed} onChange={() => { setSelectedAnswer(index); setMessage(''); }} /><span>{option}</span></label>)}{completed ? <div className="lms-answer-explanation"><CheckCircle2 /> {current.knowledgeCheck.explanation}</div> : null}</section>{message ? <div className={message.startsWith('Correct') ? 'lms-message' : 'lms-message error'}>{message}</div> : null}<div className="lms-lesson-actions"><button onClick={completeLesson}>{completed ? lessonIndex < lessons.length - 1 ? 'Next lesson' : 'Lessons complete' : 'Check answer and complete'} <ArrowRight size={17} /></button>{lessonIndex > 0 ? <button className="secondary" onClick={() => goTo(lessonIndex - 1)}><ArrowLeft size={17} /> Previous lesson</button> : null}{stats.lessonsComplete ? <Link to={`/lms/course/${course.slug}/assessment`}>Final assessment <ClipboardCheck size={17} /></Link> : null}</div></article></section></main>;
}

function AssessmentPage({ slug }: { slug: string }) {
  const course = findLibraryCourse(slug);
  const [state, setState] = useLmsState();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  if (!course) return <NotFound title="Assessment not found" back="/learning-library/courses" />;
  if (!isCourseIncluded(course, state.activePlan)) return <AccessDenied course={course} plan={state.activePlan} />;
  const stats = courseStats(course, state);
  if (!stats.lessonsComplete) return <main className="lms-app-background"><div className="lp-container lms-assessment-locked"><LockKeyhole /><h1>Complete all lessons first</h1><p>You have completed {stats.completedLessons} of {stats.lessons.length} lessons.</p><Link to={`/lms/course/${course.slug}`}>Return to course</Link></div></main>;

  const submit = () => {
    if (Object.keys(answers).length !== course.finalAssessment.questions.length) return;
    const correct = course.finalAssessment.questions.filter((question, index) => answers[index] === question.answer).length;
    const score = Math.round((correct / course.finalAssessment.questions.length) * 100);
    const passed = score >= course.finalAssessment.passMark;
    const completedAt = new Date().toLocaleString('en-GB');
    const attempts = [...(state.attempts[course.slug] ?? []), { score, passed, completedAt }];
    let certificates = state.certificates;
    if (passed && !certificates.some((certificate) => certificate.courseSlug === course.slug)) {
      certificates = [...certificates, {
        courseSlug: course.slug,
        number: `SME-${course.code.replace(/\D/g, '')}-${Date.now().toString().slice(-8)}`,
        issued: new Date().toLocaleDateString('en-GB'),
        courseVersion: course.version,
        score,
      }];
    }
    setState({ ...state, attempts: { ...state.attempts, [course.slug]: attempts }, certificates });
    setResult({ score, passed });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <main className="lms-app-background"><div className="lp-container lms-assessment-page"><header><Link to={`/lms/course/${course.slug}`}><ArrowLeft /> Return to course</Link><span>{course.code}</span><h1>{course.finalAssessment.title}</h1><p>{course.finalAssessment.instructions}</p></header>{result ? <section className={result.passed ? 'lms-assessment-result passed' : 'lms-assessment-result failed'}>{result.passed ? <Award /> : <RotateCcw />}<div><span>{result.passed ? 'Assessment passed' : 'Assessment not yet passed'}</span><h2>{result.score}%</h2><p>{result.passed ? 'Your completion certificate has been issued.' : `The required pass mark is ${course.finalAssessment.passMark}%. Review the feedback and course content before trying again.`}</p></div><div>{result.passed ? <Link to={`/lms/certificate/${course.slug}`}>View certificate <ArrowRight /></Link> : <button onClick={reset}>Try again <RotateCcw /></button>}</div></section> : null}<div className="lms-assessment-questions">{course.finalAssessment.questions.map((question, questionIndex) => { const answered = answers[questionIndex]; const showFeedback = Boolean(result); const correct = answered === question.answer; return <article key={question.id} className={showFeedback ? correct ? 'correct' : 'incorrect' : ''}><span>Question {questionIndex + 1} of {course.finalAssessment.questions.length}</span><h2>{question.question}</h2>{question.options.map((option, optionIndex) => <label key={option}><input type="radio" name={question.id} checked={answered === optionIndex} disabled={showFeedback} onChange={() => setAnswers({ ...answers, [questionIndex]: optionIndex })} /><span>{option}</span></label>)}{showFeedback ? <div className="lms-assessment-feedback">{correct ? <CheckCircle2 /> : <ShieldCheck />}<p>{question.explanation}</p></div> : null}</article>; })}</div>{!result ? <div className="lms-assessment-submit"><span>{Object.keys(answers).length} of {course.finalAssessment.questions.length} answered</span><button disabled={Object.keys(answers).length !== course.finalAssessment.questions.length} onClick={submit}>Submit assessment <ChevronRight /></button></div> : null}</div></main>;
}

function CertificatePage({ slug }: { slug: string }) {
  const [state] = useLmsState();
  const course = findLibraryCourse(slug);
  const certificate = state.certificates.find((item) => item.courseSlug === slug);
  if (!course || !certificate) return <NotFound title="Certificate is not available" back={`/lms/course/${slug}`} />;
  return <main className="lms-certificate-page"><div className="lms-certificate-actions"><Link to="/lms/dashboard"><ArrowLeft /> Dashboard</Link><button onClick={() => window.print()}>Print certificate</button></div><article className="lms-certificate"><div className="lms-certificate-brand"><GraduationCap /> Sousa Murray eLearning</div><span>Certificate of completion</span><h1>{course.title}</h1><p>This confirms that</p><h2>{state.learnerName}</h2><p>completed all required lessons and passed the final assessment.</p><dl><div><dt>Certificate number</dt><dd>{certificate.number}</dd></div><div><dt>Date issued</dt><dd>{certificate.issued}</dd></div><div><dt>Assessment score</dt><dd>{certificate.score}%</dd></div><div><dt>Course version</dt><dd>{certificate.courseVersion}</dd></div></dl><small>{course.importantNotice}</small><strong className="lms-certificate-operator">Issued by JA Group Services Ltd through Sousa Murray eLearning</strong></article></main>;
}

function NotFound({ title, back }: { title: string; back: string }) {
  return <main className="lms-app-background"><div className="lp-container lms-not-found"><BookOpen /><h1>{title}</h1><Link to={back}>Go back</Link></div></main>;
}

export default function LearningManagementSystem() {
  const path = useLocation().pathname;
  if (path === '/lms/sign-in' || path === '/lms/login') return <SignInPage />;
  if (path === '/learning-library/courses' || path === '/lms/catalogue') return <CataloguePage />;
  const publicCourse = path.match(/^\/learning-library\/courses\/([^/]+)$/);
  if (publicCourse) return <PublicCoursePage slug={decodeURIComponent(publicCourse[1])} />;
  if (path === '/lms' || path === '/lms/dashboard') return <DashboardPage />;
  const assessment = path.match(/^\/lms\/course\/([^/]+)\/assessment$/);
  if (assessment) return <AssessmentPage slug={decodeURIComponent(assessment[1])} />;
  const course = path.match(/^\/lms\/course\/([^/]+)$/);
  if (course) return <CoursePlayer slug={decodeURIComponent(course[1])} />;
  const certificate = path.match(/^\/lms\/certificate\/([^/]+)$/);
  if (certificate) return <CertificatePage slug={decodeURIComponent(certificate[1])} />;
  return <NotFound title="LMS page not found" back="/lms/dashboard" />;
}
