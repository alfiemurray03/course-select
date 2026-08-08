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

export type LearningAssignment = {
  title: string;
  brief: string;
  deliverables: string[];
  reflectionPrompt: string;
  minimumWords: number;
  estimatedMinutes: number;
};

export type CourseStudyPlan = {
  durationWeeks: number;
  expectedHoursPerWeek: string;
  guidedLearningHours: number;
  independentStudyHours: number;
  totalQualificationTimeHours: number;
  deliveryPattern: string;
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
  assignment?: LearningAssignment;
  /** Legacy single-check shape retained so historic course source files compile. */
  knowledgeCheck: KnowledgeCheck;
  /** Proper programme lessons use multiple formative questions. */
  knowledgeChecks?: KnowledgeCheck[];
};

export type LibraryModule = {
  id: string;
  title: string;
  description: string;
  week?: number;
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
  studyPlan?: CourseStudyPlan;
  finalAssessment: {
    title: string;
    instructions: string;
    passMark: number;
    questions: AssessmentQuestion[];
    estimatedMinutes?: number;
  };
  capstoneProject?: {
    title: string;
    brief: string;
    deliverables: string[];
    estimatedHours: number;
  };
  certificateStatement: string;
  importantNotice: string;
  sources?: CourseSource[];
};

export type FlatLesson = LibraryLesson & {
  moduleId: string;
  moduleTitle: string;
  moduleWeek?: number;
  sequence: number;
};

export function flattenCourseLessons(course: LibraryCourse): FlatLesson[] {
  let sequence = 0;
  return course.modules.flatMap((module) => module.lessons.map((lesson) => ({
    ...lesson,
    moduleId: module.id,
    moduleTitle: module.title,
    moduleWeek: module.week,
    sequence: sequence++,
  })));
}

export function lessonKnowledgeChecks(lesson: LibraryLesson): KnowledgeCheck[] {
  return lesson.knowledgeChecks?.length ? lesson.knowledgeChecks : [lesson.knowledgeCheck];
}

export function courseDuration(course: LibraryCourse): number {
  const lessonMinutes = flattenCourseLessons(course).reduce((total, lesson) => (
    total + lesson.minutes + (lesson.assignment?.estimatedMinutes ?? 0)
  ), 0);
  const assessmentMinutes = course.finalAssessment.estimatedMinutes ?? 15;
  const capstoneMinutes = (course.capstoneProject?.estimatedHours ?? 0) * 60;
  return lessonMinutes + assessmentMinutes + capstoneMinutes;
}

export function courseStudyHours(course: LibraryCourse): number {
  if (course.studyPlan) return course.studyPlan.totalQualificationTimeHours;
  return Math.ceil(courseDuration(course) / 60);
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
