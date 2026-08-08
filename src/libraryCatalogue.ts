import { programmeLibraryCourses } from './libraryCoursesProgrammes';
import { legacyProgrammeAliases } from './legacyProgrammeAliases';
import {
  flattenCourseLessons,
  lessonKnowledgeChecks,
  type CoursePlan,
  type LibraryCourse,
} from './libraryCourseTypes';

export type {
  AssessmentQuestion,
  CourseLevel,
  CoursePlan,
  CourseSource,
  CourseStudyPlan,
  FlatLesson,
  KnowledgeCheck,
  LearningAssignment,
  LessonSection,
  LibraryCourse,
  LibraryLesson,
  LibraryModule,
} from './libraryCourseTypes';

export {
  courseDuration,
  courseStudyHours,
  flattenCourseLessons,
  isCourseIncluded,
  lessonKnowledgeChecks,
} from './libraryCourseTypes';

export const LIBRARY_PROVIDER_NAME = 'Sousa Murray eLearning';
export const LIBRARY_LMS_NAME = 'Sousa Murray LMS';
export const LIBRARY_COURSE_SOURCE = 'Sousa Murray Learning Library';

export const CORE_LIBRARY_PLANS: readonly CoursePlan[] = ['Learner', 'Learner Plus', 'Team 5', 'Team 15'];
export const COMPLETE_LIBRARY_PLANS: readonly CoursePlan[] = ['Learner Plus', 'Team 15'];

function rotateAnswer(options: string[], answer: number, shift: number) {
  if (options.length < 2) return { options: [...options], answer };
  const amount = ((shift % options.length) + options.length) % options.length;
  if (!amount) return { options: [...options], answer };
  const rotated = [...options.slice(amount), ...options.slice(0, amount)];
  return { options: rotated, answer: (answer - amount + options.length) % options.length };
}

export const libraryCourses: LibraryCourse[] = programmeLibraryCourses.map((course, courseIndex) => ({
  ...course,
  finalAssessment: {
    ...course.finalAssessment,
    questions: course.finalAssessment.questions.map((question, questionIndex) => {
      const rotated = rotateAnswer(question.options, question.answer, (courseIndex + questionIndex) % question.options.length);
      return { ...question, options: rotated.options, answer: rotated.answer };
    }),
  },
}));

function validateCourse(course: LibraryCourse) {
  const errors: string[] = [];
  const lessons = flattenCourseLessons(course);
  const lessonIds = new Set<string>();
  const assessmentIds = new Set<string>();

  if (!/^SME-[A-Z0-9]{2,4}-\d{3}$/.test(course.code)) errors.push(`${course.code}: invalid course code.`);
  if (!course.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(course.slug)) errors.push(`${course.code}: invalid slug.`);
  if (!course.title.trim() || !course.category.trim()) errors.push(`${course.code}: title and category are required.`);
  if (course.modules.length !== 12) errors.push(`${course.code}: a proper Sousa Murray programme must contain exactly twelve weekly modules.`);
  if (lessons.length < 24) errors.push(`${course.code}: a proper Sousa Murray programme requires at least twenty-four substantial lessons.`);
  if (!course.studyPlan || course.studyPlan.durationWeeks !== 12) errors.push(`${course.code}: a twelve-week study plan is required.`);
  if ((course.studyPlan?.totalQualificationTimeHours ?? 0) < 36) errors.push(`${course.code}: programme study time must be at least 36 hours.`);
  if (!course.capstoneProject || course.capstoneProject.estimatedHours < 4) errors.push(`${course.code}: a substantial capstone project is required.`);
  if (!course.includedPlans.length) errors.push(`${course.code}: at least one plan entitlement is required.`);
  if (course.includedPlans.includes('Team 5') && !course.includedPlans.includes('Learner')) errors.push(`${course.code}: Team 5 must not receive Complete-only courses.`);
  if (course.includedPlans.includes('Learner') && !course.includedPlans.includes('Team 5')) errors.push(`${course.code}: Core courses must be available to both Learner and Team 5.`);
  if (!course.includedPlans.includes('Learner Plus') || !course.includedPlans.includes('Team 15')) errors.push(`${course.code}: every programme must be included in both Complete plans.`);
  if (course.learningOutcomes.length < 6) errors.push(`${course.code}: at least six programme learning outcomes are required.`);
  if (course.finalAssessment.questions.length < 30) errors.push(`${course.code}: final assessment requires at least thirty questions.`);
  if (course.finalAssessment.passMark < 50 || course.finalAssessment.passMark > 100) errors.push(`${course.code}: invalid pass mark.`);

  for (const module of course.modules) {
    if (!module.week || module.week < 1 || module.week > 12) errors.push(`${course.code}/${module.id}: weekly module number is required.`);
    if (module.lessons.length < 2) errors.push(`${course.code}/${module.id}: each week requires at least two substantial lessons.`);
  }

  for (const lesson of lessons) {
    if (lessonIds.has(lesson.id)) errors.push(`${course.code}: duplicate lesson id ${lesson.id}.`);
    lessonIds.add(lesson.id);
    if (lesson.minutes < 45) errors.push(`${course.code}/${lesson.id}: taught lesson time must be at least 45 minutes.`);
    if (lesson.objectives.length < 3) errors.push(`${course.code}/${lesson.id}: at least three lesson objectives are required.`);
    if (lesson.sections.length < 4) errors.push(`${course.code}/${lesson.id}: lesson requires detailed multi-section teaching content.`);
    const checks = lessonKnowledgeChecks(lesson);
    if (checks.length < 5) errors.push(`${course.code}/${lesson.id}: each programme lesson requires at least five formative questions.`);
    for (const check of checks) {
      if (check.options.length < 3) errors.push(`${course.code}/${lesson.id}: formative question requires at least three options.`);
      if (check.answer < 0 || check.answer >= check.options.length) errors.push(`${course.code}/${lesson.id}: formative answer is invalid.`);
    }
    if (lesson.id.endsWith('-workshop') && !lesson.assignment) errors.push(`${course.code}/${lesson.id}: applied workshop requires a learning-journal assignment.`);
    if (lesson.assignment && lesson.assignment.minimumWords < 150) errors.push(`${course.code}/${lesson.id}: assignment reflection is too short.`);
  }

  const answerPositions = new Set<number>();
  for (const question of course.finalAssessment.questions) {
    if (assessmentIds.has(question.id)) errors.push(`${course.code}: duplicate final-assessment id ${question.id}.`);
    assessmentIds.add(question.id);
    if (question.options.length < 3) errors.push(`${course.code}/${question.id}: final-assessment question requires at least three options.`);
    if (question.answer < 0 || question.answer >= question.options.length) errors.push(`${course.code}/${question.id}: final-assessment answer is invalid.`);
    answerPositions.add(question.answer);
  }
  if (answerPositions.size < 3) errors.push(`${course.code}: final-assessment correct answers are not sufficiently distributed across option positions.`);
  return errors;
}

export function validateLibraryCatalogue(courses: readonly LibraryCourse[] = libraryCourses) {
  const errors = courses.flatMap(validateCourse);
  const codes = new Set<string>();
  const slugs = new Set<string>();
  for (const course of courses) {
    if (codes.has(course.code)) errors.push(`Duplicate course code: ${course.code}.`);
    if (slugs.has(course.slug)) errors.push(`Duplicate course slug: ${course.slug}.`);
    codes.add(course.code);
    slugs.add(course.slug);
  }
  if (courses.length < 13) errors.push(`Learning Library contains only ${courses.length} programmes; at least 13 substantial programmes are required.`);
  return errors;
}

const catalogueErrors = validateLibraryCatalogue();
if (catalogueErrors.length) throw new Error(`Invalid Sousa Murray Learning Library catalogue:\n${catalogueErrors.join('\n')}`);

export const libraryCatalogueStats = {
  courses: libraryCourses.length,
  coreCourses: libraryCourses.filter((course) => course.includedPlans.includes('Learner')).length,
  completeCourses: libraryCourses.length,
  modules: libraryCourses.reduce((total, course) => total + course.modules.length, 0),
  lessons: libraryCourses.reduce((total, course) => total + flattenCourseLessons(course).length, 0),
  assessmentQuestions: libraryCourses.reduce((total, course) => total + course.finalAssessment.questions.length, 0),
  totalStudyHours: libraryCourses.reduce((total, course) => total + (course.studyPlan?.totalQualificationTimeHours ?? 0), 0),
};

export const libraryCategories = [...new Set(libraryCourses.map((course) => course.category))].sort();

export function findLibraryCourse(slug: string) {
  const direct = libraryCourses.find((course) => course.slug === slug);
  if (direct) return direct;
  const programmeSlug = legacyProgrammeAliases.get(slug);
  return programmeSlug ? libraryCourses.find((course) => course.slug === programmeSlug) : undefined;
}

export function coursesForPlan(plan: CoursePlan) {
  return libraryCourses.filter((course) => course.includedPlans.includes(plan));
}
