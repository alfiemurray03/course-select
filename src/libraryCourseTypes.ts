export type CoursePlan = 'Learner' | 'Learner Plus' | 'Team 5' | 'Team 15';
export type CourseLevel = 'Foundation' | 'Intermediate';

export type CourseSource = {
  label: string;
  url: string;
};

export type KnowledgeCheck = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

export type LessonSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  callout?: string;
};

export type LibraryLesson = {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  objectives: string[];
  sections: LessonSection[];
  activity?: {
    title: string;
    instructions: string[];
  };
  knowledgeCheck: KnowledgeCheck;
};

export type LibraryModule = {
  id: string;
  title: string;
  description: string;
  lessons: LibraryLesson[];
};

export type AssessmentQuestion = KnowledgeCheck & {
  id: string;
};

export type LibraryCourse = {
  code: string;
  slug: string;
  title: string;
  category: string;
  shortDescription: string;
  overview: string;
  audience: string[];
  prerequisites: string;
  level: CourseLevel;
  featured?: boolean;
  version: string;
  reviewDate: string;
  includedPlans: CoursePlan[];
  learningOutcomes: string[];
  modules: LibraryModule[];
  finalAssessment: {
    title: string;
    instructions: string;
    passMark: number;
    questions: AssessmentQuestion[];
  };
  certificateStatement: string;
  importantNotice: string;
  sources?: CourseSource[];
};

export type FlatLesson = LibraryLesson & {
  moduleId: string;
  moduleTitle: string;
  sequence: number;
};

export function flattenCourseLessons(course: LibraryCourse): FlatLesson[] {
  let sequence = 0;
  return course.modules.flatMap((module) => module.lessons.map((lesson) => ({
    ...lesson,
    moduleId: module.id,
    moduleTitle: module.title,
    sequence: sequence++,
  })));
}

export function courseDuration(course: LibraryCourse): number {
  return flattenCourseLessons(course).reduce((total, lesson) => total + lesson.minutes, 0) + 15;
}

export function isCourseIncluded(course: LibraryCourse, plan: CoursePlan): boolean {
  return course.includedPlans.includes(plan);
}

export function lesson(
  id: string,
  title: string,
  summary: string,
  minutes: number,
  objectives: string[],
  sections: LessonSection[],
  knowledgeCheck: KnowledgeCheck,
  activity?: LibraryLesson['activity'],
): LibraryLesson {
  return { id, title, summary, minutes, objectives, sections, knowledgeCheck, activity };
}

export function assessmentQuestion(
  id: string,
  question: string,
  options: string[],
  answer: number,
  explanation: string,
): AssessmentQuestion {
  return { id, question, options, answer, explanation };
}
