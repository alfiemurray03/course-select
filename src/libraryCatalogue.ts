import { coreLibraryCourses } from './libraryCoursesCore';
import { expandedLibraryCourses } from './libraryCoursesExpanded';
import { plusLibraryCourses } from './libraryCoursesPlus';
import { flattenCourseLessons, type LibraryCourse } from './libraryCourseTypes';

export type {
  AssessmentQuestion,
  CourseLevel,
  CoursePlan,
  CourseSource,
  FlatLesson,
  KnowledgeCheck,
  LessonSection,
  LibraryCourse,
  LibraryLesson,
  LibraryModule,
} from './libraryCourseTypes';

export {
  courseDuration,
  flattenCourseLessons,
  isCourseIncluded,
} from './libraryCourseTypes';

function rotateAnswer(options: string[], answer: number, shift: number) {
  if (!options.length) return { options, answer };
  const normalisedShift = ((shift % options.length) + options.length) % options.length;
  if (!normalisedShift) return { options: [...options], answer };
  const rotated = [...options.slice(-normalisedShift), ...options.slice(0, -normalisedShift)];
  return { options: rotated, answer: (answer + normalisedShift) % options.length };
}

expandedLibraryCourses.forEach((course, courseIndex) => {
  let lessonIndex = 0;
  for (const module of course.modules) {
    for (const item of module.lessons) {
      const rotated = rotateAnswer(item.knowledgeCheck.options, item.knowledgeCheck.answer, (courseIndex + lessonIndex) % 3);
      item.knowledgeCheck.options = rotated.options;
      item.knowledgeCheck.answer = rotated.answer;
      lessonIndex += 1;
    }
  }

  course.finalAssessment.questions.forEach((question, questionIndex) => {
    const rotated = rotateAnswer(question.options, question.answer, (courseIndex + questionIndex + 1) % 3);
    question.options = rotated.options;
    question.answer = rotated.answer;
  });
});

export const libraryCourses = [...coreLibraryCourses, ...plusLibraryCourses, ...expandedLibraryCourses];

function validateCourse(course: LibraryCourse) {
  const errors: string[] = [];
  const lessons = flattenCourseLessons(course);
  const lessonIds = new Set<string>();
  const assessmentIds = new Set<string>();

  if (!/^SME-[A-Z0-9]{2,4}-\d{3}$/.test(course.code)) errors.push(`${course.code}: invalid course code.`);
  if (!course.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(course.slug)) errors.push(`${course.code}: invalid slug.`);
  if (!course.title.trim() || !course.category.trim()) errors.push(`${course.code}: title and category are required.`);
  if (course.modules.length < 3) errors.push(`${course.code}: a complete course requires at least three modules.`);
  if (lessons.length < 6) errors.push(`${course.code}: a complete course requires at least six lessons.`);
  if (!course.includedPlans.length) errors.push(`${course.code}: at least one plan entitlement is required.`);
  if (course.learningOutcomes.length < 4) errors.push(`${course.code}: at least four learning outcomes are required.`);
  if (course.finalAssessment.questions.length < 6) errors.push(`${course.code}: final assessment requires at least six questions.`);
  if (course.finalAssessment.passMark < 50 || course.finalAssessment.passMark > 100) errors.push(`${course.code}: invalid pass mark.`);

  for (const lesson of lessons) {
    if (lessonIds.has(lesson.id)) errors.push(`${course.code}: duplicate lesson id ${lesson.id}.`);
    lessonIds.add(lesson.id);
    if (lesson.minutes < 5) errors.push(`${course.code}/${lesson.id}: lesson is too short.`);
    if (lesson.objectives.length < 2) errors.push(`${course.code}/${lesson.id}: at least two lesson objectives are required.`);
    if (!lesson.sections.length) errors.push(`${course.code}/${lesson.id}: lesson content is missing.`);
    if (lesson.knowledgeCheck.options.length < 3) errors.push(`${course.code}/${lesson.id}: knowledge check requires at least three options.`);
    if (lesson.knowledgeCheck.answer < 0 || lesson.knowledgeCheck.answer >= lesson.knowledgeCheck.options.length) errors.push(`${course.code}/${lesson.id}: knowledge-check answer is invalid.`);
  }

  for (const question of course.finalAssessment.questions) {
    if (assessmentIds.has(question.id)) errors.push(`${course.code}: duplicate final-assessment id ${question.id}.`);
    assessmentIds.add(question.id);
    if (question.options.length < 3) errors.push(`${course.code}/${question.id}: final-assessment question requires at least three options.`);
    if (question.answer < 0 || question.answer >= question.options.length) errors.push(`${course.code}/${question.id}: final-assessment answer is invalid.`);
  }

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

  if (courses.length < 250) errors.push(`Learning Library contains only ${courses.length} courses; at least 250 are required.`);
  return errors;
}

const catalogueErrors = validateLibraryCatalogue();
if (catalogueErrors.length) {
  throw new Error(`Invalid Sousa Murray Learning Library catalogue:\n${catalogueErrors.join('\n')}`);
}

export const libraryCatalogueStats = {
  courses: libraryCourses.length,
  modules: libraryCourses.reduce((total, course) => total + course.modules.length, 0),
  lessons: libraryCourses.reduce((total, course) => total + flattenCourseLessons(course).length, 0),
  assessmentQuestions: libraryCourses.reduce((total, course) => total + course.finalAssessment.questions.length, 0),
};

export const libraryCategories = [...new Set(libraryCourses.map((course) => course.category))].sort();

export function findLibraryCourse(slug: string) {
  return libraryCourses.find((course) => course.slug === slug);
}

export function coursesForPlan(plan: import('./libraryCourseTypes').CoursePlan) {
  return libraryCourses.filter((course) => course.includedPlans.includes(plan));
}
