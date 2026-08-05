export type PriceTier = {
  minQuantity: number;
  maxQuantity: number | null;
  providerRetailPence: number;
  aptenvoNetPence: number;
  vatPence: number;
  aptenvoGrossPence: number;
};

export type CourseType =
  | 'full-course'
  | 'short-course'
  | 'first-aid'
  | 'specialist'
  | 'care-standard'
  | 'module';

export type Course = {
  id: string;
  slug: string;
  title: string;
  provider: 'Highfield e-learning';
  providerCourseId: null;
  stripeProductId: null;
  category: string;
  level: string;
  courseType: CourseType;
  shortDescription: string;
  overview: string;
  audience: string;
  learningOutcomes: string[];
  delivery: string;
  certificate: string;
  qualificationNotice: string;
  pricingTiers: PriceTier[];
  featured: boolean;
  priceSource: string;
  priceVerified: false;
  status: 'published';
};

type CourseSeed = {
  title: string;
  category: string;
  level: string;
  courseType: CourseType;
  focus: string;
  audience?: string;
  outcomes?: string[];
  tiers: PriceTier[];
  featured?: boolean;
  qualificationNotice?: string;
  certificate?: string;
};

const VAT_RATE = 0.2;
const MARKUP_RATE = 0.3;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function makeTiers(rows: Array<[number, number | null, number]>): PriceTier[] {
  return rows.map(([minQuantity, maxQuantity, providerRetailPence]) => {
    const aptenvoNetPence = Math.round(providerRetailPence * (1 + MARKUP_RATE));
    const vatPence = Math.round(aptenvoNetPence * VAT_RATE);
    return {
      minQuantity,
      maxQuantity,
      providerRetailPence,
      aptenvoNetPence,
      vatPence,
      aptenvoGrossPence: aptenvoNetPence + vatPence,
    };
  });
}

const PRICE_SCALE_1 = makeTiers([
  [1, 19, 1500],
  [20, 99, 1250],
  [100, null, 1000],
]);

const PRICE_SCALE_2 = makeTiers([
  [1, 9, 2500],
  [10, 19, 2000],
  [20, 99, 1750],
  [100, null, 1500],
]);

const PRICE_SCALE_3 = makeTiers([
  [1, 9, 17500],
  [10, 19, 15500],
  [20, 49, 13500],
  [50, 99, 11500],
  [100, null, 9500],
]);

const SHORT_COURSE = makeTiers([
  [1, 99, 500],
  [100, null, 400],
]);

const CARE_STANDARD = makeTiers([[1, null, 250]]);
const LEVEL_2_MODULE = makeTiers([[1, null, 450]]);
const LEVEL_3_MODULE = makeTiers([[1, null, 2000]]);

const GENERAL_COMPLETION_CERTIFICATE =
  "A Highfield completion certificate is normally available when the provider's completion requirements are met. Final certificate wording will be confirmed during product setup.";

const TRAINING_NOT_QUALIFICATION =
  'This is online training and does not itself award a regulated qualification. Where a regulated qualification is required, a separate assessment through an approved training provider may be necessary.';

const AWARENESS_NOTICE =
  'This awareness course is designed to build knowledge and understanding. It does not replace role-specific practical training, workplace procedures or competent professional advice.';

function createCourse(seed: CourseSeed): Course {
  const slug = slugify(seed.title);
  const defaultOutcomes = [
    `Understand the key principles connected with ${seed.focus}.`,
    'Recognise relevant responsibilities, risks and examples of good practice.',
    'Apply the learning to common workplace or service situations.',
  ];

  return {
    id: `hf-${slug}`,
    slug,
    title: seed.title,
    provider: 'Highfield e-learning',
    providerCourseId: null,
    stripeProductId: null,
    category: seed.category,
    level: seed.level,
    courseType: seed.courseType,
    shortDescription: `Online training covering ${seed.focus}.`,
    overview: `This online course covers ${seed.focus}. It is designed to give learners clear, practical knowledge that can be applied in relevant workplace and service settings. Learning is completed online at the learner's own pace through the course provider's platform.`,
    audience:
      seed.audience ??
      'Suitable for individuals, employees, volunteers, supervisors and organisations requiring structured awareness or compliance training in this subject area.',
    learningOutcomes: seed.outcomes ?? defaultOutcomes,
    delivery: 'Online, self-paced learning delivered through Highfield e-learning.',
    certificate: seed.certificate ?? GENERAL_COMPLETION_CERTIFICATE,
    qualificationNotice:
      seed.qualificationNotice ??
      (seed.courseType === 'short-course' || seed.courseType === 'care-standard' || seed.courseType === 'module'
        ? AWARENESS_NOTICE
        : TRAINING_NOT_QUALIFICATION),
    pricingTiers: seed.tiers,
    featured: seed.featured ?? false,
    priceSource: 'Highfield E-learning Reseller Scheme, prices effective August 2025, plus Sousa Murray eLearning 30% markup and VAT.',
    priceVerified: false,
    status: 'published',
  };
}

const scale1Seeds: CourseSeed[] = [
  {
    title: 'An Awareness of Mental Health and Wellbeing',
    category: 'Mental Health and Wellbeing',
    level: 'Awareness',
    courseType: 'full-course',
    focus: 'mental health, wellbeing, common warning signs and supportive workplace responses',
    audience: 'Suitable for employees, volunteers, supervisors and organisations seeking a broad introduction to mental health and wellbeing.',
    tiers: PRICE_SCALE_1,
    featured: true,
  },
  {
    title: 'Asbestos Awareness',
    category: 'Health and Safety',
    level: 'Awareness',
    courseType: 'full-course',
    focus: 'asbestos-related risks, common locations, legal responsibilities and safe action when asbestos may be present',
    audience: 'Suitable for people whose work may bring them into contact with buildings or materials that could contain asbestos. It does not train learners to remove asbestos.',
    tiers: PRICE_SCALE_1,
    featured: true,
  },
  {
    title: 'Food Safety Level 1',
    category: 'Food Safety and Hygiene',
    level: 'Level 1',
    courseType: 'full-course',
    focus: 'the basic principles of food hygiene, contamination control, personal hygiene and safe food handling',
    audience: 'Suitable for new starters and people working in or around food where an introductory level of food-safety knowledge is required.',
    tiers: PRICE_SCALE_1,
  },
  {
    title: 'Health and Safety Level 1',
    category: 'Health and Safety',
    level: 'Level 1',
    courseType: 'full-course',
    focus: 'basic workplace health and safety responsibilities, hazards, controls and reporting',
    audience: 'Suitable for induction training and learners who need an introductory understanding of workplace health and safety.',
    tiers: PRICE_SCALE_1,
  },
  {
    title: 'Health and Safety within a Construction Environment Level 1',
    category: 'Construction Safety',
    level: 'Level 1',
    courseType: 'full-course',
    focus: 'health and safety responsibilities, hazards and safe working practices within construction environments',
    audience: 'Suitable for people preparing to work in construction or requiring introductory construction health-and-safety knowledge.',
    tiers: PRICE_SCALE_1,
  },
  {
    title: 'Introduction to Allergens',
    category: 'Food Safety and Hygiene',
    level: 'Awareness',
    courseType: 'full-course',
    focus: 'food allergens, allergic reactions, communication, contamination controls and allergen-management responsibilities',
    audience: 'Suitable for people who prepare, serve, sell or supervise food and need an introduction to allergen awareness.',
    tiers: PRICE_SCALE_1,
  },
  {
    title: 'Information and Data Security',
    category: 'Business Compliance',
    level: 'Awareness',
    courseType: 'full-course',
    focus: 'protecting information, recognising security risks, secure handling and responsible workplace behaviour',
    audience: 'Suitable for employees and organisations that handle personal, confidential or business information.',
    tiers: PRICE_SCALE_1,
    featured: true,
  },
  {
    title: 'Introduction to Environmental Awareness',
    category: 'Environmental Awareness',
    level: 'Awareness',
    courseType: 'full-course',
    focus: 'environmental impacts, resource use, waste reduction and practical workplace sustainability',
    audience: 'Suitable for staff and organisations seeking an introductory understanding of environmental responsibilities and good practice.',
    tiers: PRICE_SCALE_1,
  },
  {
    title: 'Introduction to Working at Height',
    category: 'Health and Safety',
    level: 'Awareness',
    courseType: 'full-course',
    focus: 'working-at-height hazards, planning, equipment, controls and safe workplace behaviour',
    audience: 'Suitable for people who work at height or supervise work-at-height activities. Practical and equipment-specific training may also be required.',
    tiers: PRICE_SCALE_1,
  },
  {
    title: 'Manual Handling',
    category: 'Health and Safety',
    level: 'Awareness',
    courseType: 'full-course',
    focus: 'manual-handling risks, safer movement principles, task assessment and reducing injury',
    audience: 'Suitable for people who lift, carry, push, pull or otherwise handle loads as part of their work.',
    tiers: PRICE_SCALE_1,
    featured: true,
  },
];

const scale2Seeds: CourseSeed[] = [
  {
    title: 'Customer Service Level 2',
    category: 'Customer Service',
    level: 'Level 2',
    courseType: 'full-course',
    focus: 'customer expectations, communication, service standards, complaints and effective customer interactions',
    audience: 'Suitable for customer-facing employees, advisers, reception teams, retail staff and supervisors.',
    tiers: PRICE_SCALE_2,
    featured: true,
  },
  {
    title: 'Food Safety Level 2',
    category: 'Food Safety and Hygiene',
    level: 'Level 2',
    courseType: 'full-course',
    focus: 'food hygiene regulations, foodborne illness prevention, contamination controls and safe food handling',
    audience: 'Suitable for people who prepare, cook, handle or serve food in catering, hospitality and related settings.',
    outcomes: [
      'Understand food-safety responsibilities and the importance of effective hygiene controls.',
      'Recognise microbiological, chemical, physical and allergenic hazards.',
      'Apply safe practices for handling, preparing, storing and serving food.',
    ],
    tiers: PRICE_SCALE_2,
    featured: true,
  },
  {
    title: 'Food Safety for Manufacturing Level 2',
    category: 'Food Safety and Hygiene',
    level: 'Level 2',
    courseType: 'full-course',
    focus: 'food-safety controls, contamination prevention and hygiene responsibilities in food-manufacturing environments',
    audience: 'Suitable for production, packing, warehouse and supervisory staff working in food manufacturing.',
    tiers: PRICE_SCALE_2,
  },
  {
    title: 'Introduction to HACCP',
    category: 'Food Safety and Hygiene',
    level: 'Level 2',
    courseType: 'full-course',
    focus: 'the principles of Hazard Analysis and Critical Control Point systems and their role in controlling food-safety hazards',
    audience: 'Suitable for food handlers, supervisors and employees who need an introduction to HACCP-based food-safety systems.',
    tiers: PRICE_SCALE_2,
  },
  {
    title: 'Health and Safety Level 2',
    category: 'Health and Safety',
    level: 'Level 2',
    courseType: 'full-course',
    focus: 'workplace hazards, risk assessment, legal responsibilities, incident prevention and safe systems of work',
    audience: 'Suitable for employees across sectors who need a practical working knowledge of health and safety.',
    tiers: PRICE_SCALE_2,
    featured: true,
  },
  {
    title: 'Principles of the Role of a Fire Marshal Level 2',
    category: 'Fire Safety',
    level: 'Level 2',
    courseType: 'full-course',
    focus: 'fire prevention, evacuation, fire-marshal responsibilities and workplace emergency arrangements',
    audience: 'Suitable for employees appointed as fire marshals or wardens and those supporting workplace fire-safety arrangements.',
    tiers: PRICE_SCALE_2,
  },
  {
    title: 'Personal Licence Holders Level 2',
    category: 'Licensing and Hospitality',
    level: 'Level 2',
    courseType: 'full-course',
    focus: 'licensing law, responsible alcohol retailing, personal-licence responsibilities and protecting customers and communities',
    audience: 'Suitable for people preparing for a personal-licence qualification or working in licensed premises in England and Wales.',
    qualificationNotice: 'This course supports learning for personal licensing but does not itself award the regulated qualification or personal licence. A separate approved assessment and licensing application are required.',
    tiers: PRICE_SCALE_2,
  },
  {
    title: 'Scottish Certificate for Personal Licence Holders Level 6',
    category: 'Licensing and Hospitality',
    level: 'Level 6 (Scotland)',
    courseType: 'full-course',
    focus: 'Scottish alcohol-licensing law, responsible retailing and the responsibilities of personal licence holders',
    audience: 'Suitable for learners in Scotland preparing for the relevant personal-licence-holder qualification.',
    qualificationNotice: 'This online learning supports preparation for the Scottish personal-licence-holder qualification but does not itself award the qualification or personal licence. A separate approved assessment is required.',
    tiers: PRICE_SCALE_2,
  },
];

const scale3Seeds: CourseSeed[] = [
  {
    title: 'Food Safety Level 3',
    category: 'Food Safety and Hygiene',
    level: 'Level 3',
    courseType: 'full-course',
    focus: 'supervising food safety, implementing controls, managing hazards and supporting effective food-safety systems',
    audience: 'Suitable for supervisors, managers, chefs and people responsible for food-safety controls and staff performance.',
    tiers: PRICE_SCALE_3,
    featured: true,
  },
  {
    title: 'HACCP Level 3 Catering',
    category: 'Food Safety and Hygiene',
    level: 'Level 3',
    courseType: 'full-course',
    focus: 'developing, applying and monitoring HACCP-based food-safety systems in catering environments',
    audience: 'Suitable for catering supervisors, managers and people responsible for HACCP plans or food-safety management.',
    tiers: PRICE_SCALE_3,
  },
  {
    title: 'HACCP Level 3 Manufacturing',
    category: 'Food Safety and Hygiene',
    level: 'Level 3',
    courseType: 'full-course',
    focus: 'developing, applying and monitoring HACCP-based food-safety systems in food-manufacturing environments',
    audience: 'Suitable for manufacturing supervisors, quality teams and managers responsible for HACCP systems.',
    tiers: PRICE_SCALE_3,
  },
  {
    title: 'Health and Safety Level 3',
    category: 'Health and Safety',
    level: 'Level 3',
    courseType: 'full-course',
    focus: 'managing workplace health and safety, risk controls, performance monitoring and supervisory responsibilities',
    audience: 'Suitable for managers, supervisors and team leaders with responsibility for workplace health and safety.',
    tiers: PRICE_SCALE_3,
  },
  {
    title: 'Health and Safety Management in Health Care Level 3',
    category: 'Health and Social Care',
    level: 'Level 3',
    courseType: 'full-course',
    focus: 'health-and-safety management, risk control and supervisory responsibilities in health and care settings',
    audience: 'Suitable for managers and supervisors working in healthcare, social care and related support services.',
    tiers: PRICE_SCALE_3,
  },
];

const shortCourseRows: Array<[string, string, string, string?]> = [
  ['Anaphylaxis and Autoinjectors', 'First Aid and Wellbeing', 'recognising severe allergic reactions and understanding the role and use of adrenaline autoinjectors', 'Suitable for employees, carers, education staff and anyone who may need to respond to anaphylaxis. Practical first-aid instruction may also be required.'],
  ['Awareness of Home Working', 'Health and Safety', 'health, safety, wellbeing and practical risk controls when working from home'],
  ['Awareness of Lone Working', 'Health and Safety', 'lone-working risks, communication, personal safety and organisational controls'],
  ['Awareness of Menopause in the Workplace', 'Workplace Culture and Conduct', 'menopause awareness, workplace impact, respectful communication and supportive management'],
  ['Awareness of Modern Slavery', 'Business Compliance', 'modern-slavery risks, warning signs, organisational responsibilities and reporting concerns'],
  ['Awareness of Sexual Harassment in the Workplace for Employees', 'Workplace Culture and Conduct', 'recognising sexual harassment, appropriate workplace conduct, reporting routes and individual responsibilities'],
  ['Awareness of Sexual Harassment in the Workplace for Managers', 'Workplace Culture and Conduct', 'preventing and responding to sexual harassment, management responsibilities, reporting and workplace culture'],
  ['Communication', 'Workplace Skills', 'effective verbal and non-verbal communication, listening and reducing misunderstandings'],
  ['Challenge - Responsible Sales in Hospitality and Retail', 'Licensing and Hospitality', 'responsible sales, age-restricted products, challenge procedures and refusing sales appropriately'],
  ['Display Screen Equipment', 'Health and Safety', 'display-screen equipment risks, workstation setup, posture, breaks and user responsibilities'],
  ['Effective Writing in the Workplace', 'Workplace Skills', 'clear, accurate and professional workplace writing for common business communications'],
  ['Equality and Diversity', 'Workplace Culture and Conduct', 'equality, diversity, inclusion, respectful behaviour and preventing unfair treatment'],
  ['General Data Protection Regulation (GDPR)', 'Business Compliance', 'data-protection principles, individual rights, lawful handling and workplace responsibilities'],
  ['Infection Prevention and Control', 'Health and Social Care', 'how infections spread, hygiene measures, prevention controls and workplace responsibilities'],
  ['Introduction to the Bribery Act 2010', 'Business Compliance', 'bribery risks, offences, gifts and hospitality, prevention and reporting concerns'],
  ['Introduction to Fire Safety in the Workplace', 'Fire Safety', 'fire hazards, prevention, alarms, evacuation and individual workplace responsibilities'],
  ['Introduction to Fraud and Fraud Prevention', 'Business Compliance', 'common fraud risks, warning signs, prevention controls and reporting suspected fraud'],
  ['Introduction to the Prevention of Money Laundering', 'Business Compliance', 'money-laundering risks, warning signs, due diligence and reporting responsibilities'],
  ['Introduction to Neurodiversity Awareness', 'Workplace Culture and Conduct', 'neurodiversity, inclusive working practices, communication and reducing barriers'],
  ['Managing Conflict', 'Workplace Skills', 'understanding conflict, communication, de-escalation and constructive workplace responses'],
  ['Mental Health Awareness for Managers', 'Mental Health and Wellbeing', 'supportive management, recognising concerns, communication, boundaries and signposting'],
  ['Safeguarding Children', 'Safeguarding', 'recognising possible abuse or neglect, safeguarding responsibilities, responding and reporting concerns'],
  ['Self-awareness and Personal Development', 'Workplace Skills', 'self-awareness, feedback, goal setting and planning personal development'],
  ['STARS (Scottish Training for Alcohol Retailers and Servers)', 'Licensing and Hospitality', 'responsible alcohol retailing in Scotland, legal duties, age verification and refusing sales'],
  ['Stress Management', 'Mental Health and Wellbeing', 'workplace stress, common causes and signs, coping strategies and organisational support'],
  ['Team Working', 'Workplace Skills', 'effective team roles, communication, cooperation, shared goals and resolving difficulties'],
];

const shortCourseSeeds: CourseSeed[] = shortCourseRows.map(([title, category, focus, audience]) => ({
  title,
  category,
  level: 'Short course',
  courseType: 'short-course',
  focus,
  audience,
  tiers: SHORT_COURSE,
  featured: title === 'General Data Protection Regulation (GDPR)' || title === 'Safeguarding Children',
}));

const firstAidSeeds: CourseSeed[] = [
  {
    title: 'First Aid at Work',
    category: 'First Aid',
    level: 'Awareness',
    courseType: 'first-aid',
    focus: 'the principles, priorities and responsibilities associated with first aid at work',
    audience: 'Suitable as supporting online learning for workplace first-aid training. It does not replace required practical training and assessment.',
    qualificationNotice: 'This online course does not by itself make a learner a qualified workplace first aider. Practical training and assessment through an approved provider may be required.',
    tiers: makeTiers([[1, 9, 1000], [10, null, 750]]),
  },
  {
    title: 'Emergency First Aid at Work',
    category: 'First Aid',
    level: 'Awareness',
    courseType: 'first-aid',
    focus: 'initial emergency response, incident priorities and core emergency first-aid awareness',
    audience: 'Suitable as supporting learning for people undertaking emergency first-aid training. It does not replace practical training and assessment.',
    qualificationNotice: 'This online course does not by itself award an Emergency First Aid at Work qualification. Practical training and assessment through an approved provider may be required.',
    tiers: makeTiers([[1, 9, 750], [10, null, 500]]),
  },
  {
    title: 'Paediatric First Aid',
    category: 'First Aid',
    level: 'Awareness',
    courseType: 'first-aid',
    focus: 'first-aid awareness for emergencies involving babies and children',
    audience: 'Suitable as supporting online learning for childcare workers, parents and others responsible for babies or children. It does not replace practical training and assessment.',
    qualificationNotice: 'This online course does not by itself award a paediatric first-aid qualification. Practical training and assessment through an approved provider may be required.',
    tiers: makeTiers([[1, 9, 750], [10, null, 500]]),
  },
];

const specialistSeeds: CourseSeed[] = [
  {
    title: 'An Awareness of Spectator Safety',
    category: 'Crowd and Event Safety',
    level: 'Awareness',
    courseType: 'specialist',
    focus: 'the principles of spectator safety, event preparation, crowd risks, communication and stewarding responsibilities',
    audience: 'Suitable for people preparing to work as stewards or support safety at sporting, entertainment and public events.',
    qualificationNotice: 'This course supports the knowledge requirements connected with spectator-safety work but does not itself provide a regulated qualification. Separate training and assessment are required for the relevant qualification.',
    tiers: makeTiers([[1, 9, 11500], [10, 49, 10500], [50, 99, 9500], [100, null, 8500]]),
  },
  {
    title: 'An Awareness of Understanding Stewarding at Spectator Events',
    category: 'Crowd and Event Safety',
    level: 'Awareness',
    courseType: 'specialist',
    focus: 'the role of stewards, event preparation, customer care, incident response and safe spectator management',
    audience: 'Suitable for new or existing stewards and organisations delivering spectator-event services.',
    qualificationNotice: 'This online learning does not itself award a stewarding or spectator-safety qualification. Workplace training and formal assessment may also be required.',
    tiers: makeTiers([[1, 9, 11500], [10, 49, 10500], [50, 99, 9500], [100, null, 8500]]),
  },
  {
    title: 'An Awareness of Warehousing and Storage',
    category: 'Warehousing and Storage',
    level: 'Awareness',
    courseType: 'specialist',
    focus: 'warehouse operations, storage practices, workplace hazards, equipment awareness and safe working responsibilities',
    audience: 'Suitable for new starters, warehouse operatives and organisations requiring introductory warehousing and storage knowledge.',
    tiers: makeTiers([[1, 9, 8000], [10, 49, 7500], [50, 99, 7000], [100, null, 6500]]),
  },
  {
    title: 'Care Certificate',
    category: 'Health and Social Care',
    level: 'Care Certificate',
    courseType: 'specialist',
    focus: 'the knowledge elements of the Care Certificate standards for people working in health and social care',
    audience: 'Suitable for new starters and existing staff in health and social care who need structured knowledge across the Care Certificate standards.',
    outcomes: [
      'Understand the core responsibilities and values expected in health and social care roles.',
      'Build knowledge across person-centred care, communication, safeguarding, safety and information handling.',
      'Prepare for workplace competency sign-off and any further assessment required by an employer or training provider.',
    ],
    qualificationNotice: 'The online course provides knowledge learning. Employers or approved training providers remain responsible for workplace competency sign-off and any regulated qualification assessment.',
    tiers: makeTiers([[1, 9, 3500], [10, 99, 3000], [100, null, 2500]]),
    featured: true,
  },
];

const careStandards = [
  'Understand Your Role',
  'Your Personal Development',
  'Duty of Care',
  'Equality and Diversity',
  'Working in a Person-Centred Way',
  'Communication',
  'Privacy and Dignity',
  'Fluids and Nutrition',
  'Mental Health, Dementia and Learning Disability',
  'Safeguarding Adults',
  'Safeguarding Children',
  'Basic Life Support',
  'Health and Safety',
  'Handling Information',
  'Infection Prevention and Control',
];

const careStandardSeeds: CourseSeed[] = careStandards.map((title) => ({
  title: `Care Certificate Standard: ${title}`,
  category: 'Care Certificate Standards',
  level: 'Individual standard',
  courseType: 'care-standard',
  focus: `${title.toLowerCase()} within health and social care practice`,
  audience: 'Suitable for care workers, support workers, new starters and organisations requiring a focused Care Certificate knowledge module.',
  tiers: CARE_STANDARD,
  certificate: 'Completion evidence is provided in line with the provider’s arrangements for the individual standard. Workplace competency sign-off may still be required.',
  qualificationNotice: 'This individual knowledge standard does not by itself complete the full Care Certificate or award a regulated qualification.',
}));

const level2FoodModules = [
  'Cleaning and Disinfection',
  'Contamination Hazards and Controls',
  'Food Pests and Control',
  'Food Poisoning and Its Control',
  'Food Premises and Equipment',
  'Food Safety Enforcement',
  'HACCP from Delivery to Service',
  'Introduction to Food Safety',
  'Microbiological Hazards',
  'Personal Hygiene',
];

const level2HealthSafetyModules = [
  'Accidents Including Slips, Trips and Falls',
  'Fire',
  'First Aid',
  'Hazardous Substances (COSHH)',
  'Legal Responsibilities',
  'Risk Assessment',
  'Work Equipment',
  'Workplace Health, Safety and Welfare',
];

const level2ModuleSeeds: CourseSeed[] = [
  ...level2FoodModules.map((title) => ({
    title: `Level 2 Food Safety Module: ${title}`,
    category: 'Food Safety Modules',
    level: 'Level 2 module',
    courseType: 'module' as const,
    focus: `${title.toLowerCase()} as a focused part of Level 2 food-safety learning`,
    audience: 'Suitable for food handlers and organisations requiring focused learning on one part of Level 2 food safety.',
    tiers: LEVEL_2_MODULE,
    qualificationNotice: 'This is an individual module and does not by itself complete the full Level 2 Food Safety course or award a regulated qualification.',
  })),
  ...level2HealthSafetyModules.map((title) => ({
    title: `Level 2 Health and Safety Module: ${title}`,
    category: 'Health and Safety Modules',
    level: 'Level 2 module',
    courseType: 'module' as const,
    focus: `${title.toLowerCase()} as a focused part of Level 2 workplace health-and-safety learning`,
    audience: 'Suitable for employees and organisations requiring focused learning on one area of Level 2 health and safety.',
    tiers: LEVEL_2_MODULE,
    qualificationNotice: 'This is an individual module and does not by itself complete the full Level 2 Health and Safety course or award a regulated qualification.',
  })),
];

const level3HealthSafetyModules = [
  'Accident, Injuries and Work-Related Health',
  'Ergonomics',
  'Manual Handling and Display Screen Equipment',
  'Fire Safety',
  'Hazardous Substances (COSHH)',
  'Introduction to Health and Safety',
  'Legal Aspects of Health and Safety',
  'Measuring and Monitoring Performance',
  'Risk Assessment',
  'The Role of Line Managers and Supervisors',
  'The Workplace',
  'Using Equipment Safely',
];

const level3ModuleSeeds: CourseSeed[] = level3HealthSafetyModules.map((title) => ({
  title: `Level 3 Health and Safety Module: ${title}`,
  category: 'Health and Safety Modules',
  level: 'Level 3 module',
  courseType: 'module',
  focus: `${title.toLowerCase()} as a focused part of Level 3 health-and-safety management learning`,
  audience: 'Suitable for supervisors, line managers and organisations requiring focused Level 3 health-and-safety learning.',
  tiers: LEVEL_3_MODULE,
  qualificationNotice: 'This is an individual module and does not by itself complete the full Level 3 Health and Safety course or award a regulated qualification.',
}));

export const catalogue: Course[] = [
  ...scale1Seeds,
  ...scale2Seeds,
  ...scale3Seeds,
  ...shortCourseSeeds,
  ...firstAidSeeds,
  ...specialistSeeds,
  ...careStandardSeeds,
  ...level2ModuleSeeds,
  ...level3ModuleSeeds,
].map(createCourse);

if (catalogue.length !== 101) {
  throw new Error(`Sousa Murray eLearning catalogue integrity check failed: expected 101 courses, found ${catalogue.length}.`);
}

export const categories = Array.from(new Set(catalogue.map((course) => course.category))).sort();

export function formatMoney(pence: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(pence / 100);
}

export function singleLicenceTier(course: Course) {
  return course.pricingTiers.find((tier) => tier.minQuantity === 1) ?? course.pricingTiers[0];
}

export function tierForQuantity(course: Course, quantity: number) {
  return (
    course.pricingTiers.find(
      (tier) => quantity >= tier.minQuantity && (tier.maxQuantity === null || quantity <= tier.maxQuantity),
    ) ?? course.pricingTiers[course.pricingTiers.length - 1]
  );
}
