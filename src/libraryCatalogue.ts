import { coreLibraryCourses } from './libraryCoursesCore';
import { plusLibraryCourses } from './libraryCoursesPlus';

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

export const libraryCourses = [...coreLibraryCourses, ...plusLibraryCourses];

export const libraryCategories = [...new Set(libraryCourses.map((course) => course.category))].sort();

export function findLibraryCourse(slug: string) {
  return libraryCourses.find((course) => course.slug === slug);
}

export function coursesForPlan(plan: import('./libraryCourseTypes').CoursePlan) {
  return libraryCourses.filter((course) => course.includedPlans.includes(plan));
}
