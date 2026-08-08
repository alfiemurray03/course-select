import { coreLibraryCourses } from './libraryCoursesCore';
import { expandedLibraryCourses } from './libraryCoursesExpanded';
import { plusLibraryCourses } from './libraryCoursesPlus';

const CATEGORY_PROGRAMME: Record<string, string> = {
  'Business and enterprise': 'business-and-enterprise',
  'Customer service and sales': 'customer-service-and-sales',
  'Digital skills and AI': 'digital-skills-and-ai-at-work',
  'Microsoft 365 and office skills': 'microsoft-365-productivity',
  'Workplace essentials': 'workplace-professional-practice',
  'Leadership and management': 'leadership-and-people-management',
  'Project and operational skills': 'project-and-operations-management',
  'Communication and collaboration': 'communication-and-collaboration',
  'Personal development': 'personal-effectiveness-and-professional-development',
  'Cybersecurity and information management': 'cybersecurity-and-information-management',
  'Compliance and governance awareness': 'governance-compliance-and-data-protection',
  'Compliance awareness': 'governance-compliance-and-data-protection',
  'Safety and wellbeing awareness': 'workplace-safety-and-wellbeing',
  'Employability and career skills': 'employability-and-career-development',
};

function inferProgramme(title: string, slug: string, category: string) {
  if (CATEGORY_PROGRAMME[category]) return CATEGORY_PROGRAMME[category];
  const text = `${title} ${slug} ${category}`.toLowerCase();
  if (/cyber|phish|password|security|authentication/.test(text)) return 'cybersecurity-and-information-management';
  if (/data protection|privacy|governance|compliance|bribery|fraud|whistle/.test(text)) return 'governance-compliance-and-data-protection';
  if (/safety|hazard|fire|manual handling|wellbeing|fatigue|first aid/.test(text)) return 'workplace-safety-and-wellbeing';
  if (/microsoft|excel|word|powerpoint|outlook|teams|sharepoint|onedrive/.test(text)) return 'microsoft-365-productivity';
  if (/ai|digital|automation|online research/.test(text)) return 'digital-skills-and-ai-at-work';
  if (/customer|sales|complaint|service/.test(text)) return 'customer-service-and-sales';
  if (/manager|leadership|delegat|coaching|team performance/.test(text)) return 'leadership-and-people-management';
  if (/project|operational|process|workflow|root cause/.test(text)) return 'project-and-operations-management';
  if (/communication|writing|meeting|present|negotiat|listening/.test(text)) return 'communication-and-collaboration';
  if (/career|cv|interview|job|promotion|freelanc/.test(text)) return 'employability-and-career-development';
  if (/time management|productivity|habit|focus|resilience|goal/.test(text)) return 'personal-effectiveness-and-professional-development';
  if (/business|market|pricing|cash|supplier|sole trader|company/.test(text)) return 'business-and-enterprise';
  return 'workplace-professional-practice';
}

export const legacyProgrammeAliases = new Map<string, string>();
for (const course of [...coreLibraryCourses, ...plusLibraryCourses, ...expandedLibraryCourses]) {
  legacyProgrammeAliases.set(course.slug, inferProgramme(course.title, course.slug, course.category));
}

// Keep the established free-trial slug stable even though AI Literacy is now
// one part of the substantial Digital Skills & AI at Work programme.
legacyProgrammeAliases.set('ai-literacy-for-everyday-work', 'digital-skills-and-ai-at-work');
