import {
  ArrowLeft, ArrowRight, Award, BookOpen, Check, CheckCircle2, CircleUserRound,
  Clock3, Filter, GraduationCap, Infinity as InfinityIcon, LayoutDashboard,
  Library, LockKeyhole, PlayCircle, Search, ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { findLibraryCourse, libraryCategories, libraryCourses } from './libraryCatalogue';
import './lms.css';

type LmsState = {
  learnerName: string;
  enrolled: string[];
  progress: Record<string, boolean>;
  certificates: { courseSlug: string; number: string; issued: string }[];
};

const STORAGE_KEY = 'sousa-murray-lms-preview';

function initialState(): LmsState {
  return {
    learnerName: 'Example Learner',
    enrolled: libraryCourses.slice(0, 3).map((course) => course.slug),
    progress: {},
    certificates: [],
  };
}

function loadState(): LmsState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...initialState(), ...JSON.parse(stored) } as LmsState : initialState();
  } catch {
    return initialState();
  }
}

function saveState(state: LmsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function usePreviewState() {
  const [state, setStateValue] = useState<LmsState>(loadState);
  const setState = (next: LmsState | ((current: LmsState) => LmsState)) => {
    setStateValue((current) => {
      const value = typeof next === 'function' ? next(current) : next;
      saveState(value);
      return value;
    });
  };
  return [state, setState] as const;
}

function LmsNotice() {
  return <div className="lms-preview-notice"><ShieldCheck size={20} /><div><strong>Preview learner environment</strong><span>Authentication and paid plan enforcement are not active yet. Progress on this device is stored locally for demonstration.</span></div></div>;
}

function CourseProgress({ courseSlug, progress }: { courseSlug: string; progress: Record<string, boolean> }) {
  const course = findLibraryCourse(courseSlug);
  if (!course) return null;
  const completed = course.lessons.filter((_, index) => progress[`${courseSlug}:${index}`]).length;
  const percentage = Math.round((completed / course.lessons.length) * 100);
  return <div className="lms-progress"><div><span style={{ width: `${percentage}%` }} /></div><small>{percentage}% complete · {completed} of {course.lessons.length} lessons</small></div>;
}

function SignInPage() {
  return <main className="lms-signin-page"><section className="lms-signin-shell"><div className="lms-signin-intro"><div className="lms-product-mark"><GraduationCap /> Sousa Murray LMS</div><h1>Sign in to continue learning.</h1><p>Your future JA Group Services ID sign-in will open your courses, progress, quiz results and completion certificates from one secure learner account.</p><ul><li><Check /> Access courses included in your active plan</li><li><Check /> Continue from your last completed lesson</li><li><Check /> View progress and certificates</li></ul></div><div className="lms-signin-card"><LockKeyhole size={34} /><span className="lms-status-pill">Sign-in integration in development</span><h2>Learner sign in</h2><p>The dedicated LMS sign-in page is ready, but live authentication has not been connected.</p><label>Email address<input type="email" placeholder="name@example.com" disabled /></label><label>Password<input type="password" placeholder="Password" disabled /></label><button type="button" disabled>Sign in with JA Group Services ID</button><div className="lms-signin-divider"><span>Preview</span></div><Link className="lms-preview-button" to="/lms/dashboard">Open learner LMS preview <ArrowRight size={17} /></Link><small>No real account is created and no credentials are accepted on this preview page.</small></div></section></main>;
}

function CataloguePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All subjects');
  const filtered = useMemo(() => {
    const normalised = query.trim().toLowerCase();
    return libraryCourses.filter((course) => {
      const matchesCategory = category === 'All subjects' || course.category === category;
      const text = `${course.title} ${course.description} ${course.category} ${course.level}`.toLowerCase();
      return matchesCategory && (!normalised || text.includes(normalised));
    });
  }, [query, category]);

  return <main><section className="lms-page-hero"><div className="lp-container"><div className="lp-eyebrow"><Library size={16} /> Sousa Murray course catalogue</div><h1>Choose what you would like to learn next.</h1><p>Explore practical self-paced courses included within eligible Sousa Murray Learning Library plans.</p><div className="lp-actions"><Link className="lp-button light" to="/plans">Compare plans <ArrowRight /></Link><Link className="lp-button ghost" to="/lms/sign-in">LMS sign in</Link></div></div></section><section className="lms-catalogue-section"><div className="lp-container"><LmsNotice /><div className="lms-catalogue-toolbar"><label><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the learning library" /></label><label><Filter size={18} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All subjects</option>{libraryCategories.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="lms-result-count"><strong>{filtered.length} courses</strong><span>Completion certificates confirm completion only unless expressly stated otherwise.</span></div><div className="lms-course-grid">{filtered.map((course) => <article className="lms-course-card" key={course.slug}><div className="lms-course-card-top"><span>{course.category}</span><span>{course.level}</span></div><BookOpen size={28} /><h2>{course.title}</h2><p>{course.description}</p><div className="lms-course-meta"><span><Clock3 size={16} /> {course.minutes} minutes</span><span><PlayCircle size={16} /> {course.lessons.length} lessons</span></div><div className="lms-plan-tags">{course.includedPlans.map((plan) => <small key={plan}>{plan}</small>)}</div><Link to={`/lms/course/${course.slug}`}>View course <ArrowRight size={16} /></Link></article>)}</div></div></section></main>;
}

function DashboardPage() {
  const [state] = usePreviewState();
  const enrolledCourses = state.enrolled.map(findLibraryCourse).filter(Boolean);
  const completedLessons = Object.values(state.progress).filter(Boolean).length;
  return <main className="lms-app-background"><div className="lp-container lms-dashboard"><LmsNotice /><header className="lms-dashboard-header"><div><span>Learner dashboard</span><h1>Hello, {state.learnerName.split(' ')[0]}</h1><p>Continue your learning, explore the library and view your completion records.</p></div><Link to="/learning-library/courses">Browse catalogue <ArrowRight /></Link></header><div className="lms-metric-grid"><article><BookOpen /><span>Enrolled courses</span><strong>{enrolledCourses.length}</strong></article><article><CheckCircle2 /><span>Lessons completed</span><strong>{completedLessons}</strong></article><article><Award /><span>Certificates</span><strong>{state.certificates.length}</strong></article><article><InfinityIcon /><span>Preview plan</span><strong>Learning Library</strong></article></div><section className="lms-dashboard-section"><div className="lms-dashboard-section-head"><div><span>Continue learning</span><h2>Your courses</h2></div><Link to="/learning-library/courses">View complete catalogue</Link></div><div className="lms-enrolled-list">{enrolledCourses.map((course) => course && <article key={course.slug}><div className="lms-enrolled-icon"><BookOpen /></div><div className="lms-enrolled-copy"><span>{course.category}</span><h3>{course.title}</h3><CourseProgress courseSlug={course.slug} progress={state.progress} /></div><Link to={`/lms/course/${course.slug}`}>Open course <ArrowRight /></Link></article>)}</div></section><section className="lms-dashboard-section"><div className="lms-dashboard-section-head"><div><span>Completion records</span><h2>Your certificates</h2></div></div>{state.certificates.length ? <div className="lms-certificate-list">{state.certificates.map((certificate) => { const course = findLibraryCourse(certificate.courseSlug); return <article key={certificate.number}><Award /><div><strong>{course?.title}</strong><span>{certificate.number} · Issued {certificate.issued}</span></div><Link to={`/lms/certificate/${certificate.courseSlug}`}>View certificate</Link></article>; })}</div> : <div className="lms-empty-state"><Award /><h3>No certificates yet</h3><p>Complete every lesson in a course to generate its preview completion certificate.</p></div>}</section></div></main>;
}

function CoursePage({ slug }: { slug: string }) {
  const course = findLibraryCourse(slug);
  const [state, setState] = usePreviewState();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedLesson = Number(searchParams.get('lesson') ?? 0);
  const lessonIndex = Number.isFinite(requestedLesson) ? Math.min(Math.max(requestedLesson, 0), Math.max((course?.lessons.length ?? 1) - 1, 0)) : 0;
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  if (!course) return <main className="lms-app-background"><div className="lp-container lms-not-found"><h1>Course not found</h1><Link to="/learning-library/courses">Return to the catalogue</Link></div></main>;
  const lesson = course.lessons[lessonIndex];
  const lessonKey = `${course.slug}:${lessonIndex}`;
  const completed = Boolean(state.progress[lessonKey]);

  const markComplete = () => {
    if (lesson.quiz && selectedAnswer !== lesson.quiz.answer) {
      setMessage(selectedAnswer === null ? 'Choose an answer before submitting the knowledge check.' : 'That answer is not correct yet. Review the lesson and try again.');
      return;
    }
    const nextProgress = { ...state.progress, [lessonKey]: true };
    const allComplete = course.lessons.every((_, index) => nextProgress[`${course.slug}:${index}`]);
    const alreadyCertified = state.certificates.some((certificate) => certificate.courseSlug === course.slug);
    const nextCertificates = allComplete && !alreadyCertified ? [...state.certificates, { courseSlug: course.slug, number: `SME-${Date.now().toString().slice(-8)}`, issued: new Date().toLocaleDateString('en-GB') }] : state.certificates;
    setState({ ...state, enrolled: state.enrolled.includes(course.slug) ? state.enrolled : [...state.enrolled, course.slug], progress: nextProgress, certificates: nextCertificates });
    setMessage(allComplete ? 'Course completed. Your certificate is ready.' : 'Lesson completed.');
    if (!allComplete && lessonIndex < course.lessons.length - 1) setSearchParams({ lesson: String(lessonIndex + 1) });
  };

  return <main className="lms-course-player"><aside className="lms-course-sidebar"><Link className="lms-sidebar-brand" to="/lms/dashboard"><GraduationCap /> Sousa Murray LMS</Link><Link className="lms-back-dashboard" to="/lms/dashboard"><ArrowLeft size={16} /> Learner dashboard</Link><div className="lms-sidebar-course"><span>{course.category}</span><strong>{course.title}</strong><CourseProgress courseSlug={course.slug} progress={state.progress} /></div><nav>{course.lessons.map((item, index) => <button className={index === lessonIndex ? 'active' : ''} key={item.title} onClick={() => { setSearchParams({ lesson: String(index) }); setSelectedAnswer(null); setMessage(''); }}><i>{state.progress[`${course.slug}:${index}`] ? <Check size={14} /> : index + 1}</i><span>{item.title}</span></button>)}</nav></aside><section className="lms-lesson-area"><div className="lms-lesson-topbar"><Link to="/learning-library/courses">Course catalogue</Link><span>Lesson {lessonIndex + 1} of {course.lessons.length}</span></div><article className="lms-lesson-card"><div className="lms-lesson-heading"><span>{completed ? <><CheckCircle2 size={17} /> Completed</> : 'Current lesson'}</span><h1>{lesson.title}</h1><p>{lesson.summary}</p></div><div className="lms-lesson-content">{lesson.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>{lesson.quiz && <div className="lms-quiz"><span>Knowledge check</span><h2>{lesson.quiz.question}</h2>{lesson.quiz.options.map((option, index) => <label key={option}><input type="radio" name="lesson-quiz" checked={selectedAnswer === index} onChange={() => setSelectedAnswer(index)} /><span>{option}</span></label>)}</div>}{message && <div className={message.includes('not correct') || message.includes('Choose') ? 'lms-message error' : 'lms-message'}>{message}</div>}<div className="lms-lesson-actions"><button onClick={markComplete}>{completed ? 'Continue' : lesson.quiz ? 'Submit and complete' : 'Mark lesson complete'} <ArrowRight size={17} /></button>{state.certificates.some((certificate) => certificate.courseSlug === course.slug) && <Link to={`/lms/certificate/${course.slug}`}>View certificate <Award size={17} /></Link>}</div></article></section></main>;
}

function CertificatePage({ slug }: { slug: string }) {
  const [state] = usePreviewState();
  const course = findLibraryCourse(slug);
  const certificate = state.certificates.find((item) => item.courseSlug === slug);
  if (!course || !certificate) return <main className="lms-app-background"><div className="lp-container lms-not-found"><h1>Certificate is not available</h1><p>Complete every lesson in the course before opening its certificate.</p><Link to={`/lms/course/${slug}`}>Return to the course</Link></div></main>;
  return <main className="lms-certificate-page"><div className="lms-certificate-actions"><Link to="/lms/dashboard"><ArrowLeft /> Dashboard</Link><button onClick={() => window.print()}>Print certificate</button></div><article className="lms-certificate"><div className="lms-certificate-brand"><GraduationCap /> Sousa Murray eLearning</div><span>Certificate of completion</span><h1>{course.title}</h1><p>This confirms that</p><h2>{state.learnerName}</h2><p>completed the Sousa Murray Learning Library course named above.</p><dl><div><dt>Certificate number</dt><dd>{certificate.number}</dd></div><div><dt>Date issued</dt><dd>{certificate.issued}</dd></div><div><dt>Course duration</dt><dd>{course.minutes} minutes</dd></div></dl><small>This certificate confirms completion of a Sousa Murray Learning Library course only. It is not an accredited or regulated qualification unless expressly stated otherwise.</small><strong className="lms-certificate-operator">Issued by JA Group Services Ltd through Sousa Murray eLearning</strong></article></main>;
}

export default function LearningManagementSystem() {
  const path = useLocation().pathname;
  if (path === '/lms/sign-in' || path === '/lms/login') return <SignInPage />;
  if (path === '/learning-library/courses' || path === '/lms/catalogue') return <CataloguePage />;
  if (path === '/lms' || path === '/lms/dashboard') return <DashboardPage />;
  const courseMatch = path.match(/^\/lms\/course\/([^/]+)$/);
  if (courseMatch) return <CoursePage slug={decodeURIComponent(courseMatch[1])} />;
  const certificateMatch = path.match(/^\/lms\/certificate\/([^/]+)$/);
  if (certificateMatch) return <CertificatePage slug={decodeURIComponent(certificateMatch[1])} />;
  return null;
}
