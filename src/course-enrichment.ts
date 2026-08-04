import { catalogue, type Course } from './catalogue';

type FactSheetDetail = {
  overview: string;
  audience?: string;
  duration?: string;
};

const factSheetDetails: Record<string, FactSheetDetail> = {
  'An Awareness of Mental Health and Wellbeing': {
    overview: 'Explores mental health, mental ill health and wellbeing, including influencing factors, common types of mental ill health, the impact on individuals, diagnosis, recovery, self-care and practical ways to support wellbeing.',
    audience: 'Designed as an introduction for adults who want to understand mental health and wellbeing, including employees, volunteers, supervisors and workplace teams.',
    duration: '20 to 40 minutes',
  },
  'Customer Service Level 2': {
    overview: 'Explains what good customer service means and how it can be delivered consistently. Learners consider customer needs and expectations, service principles, interpersonal behaviour and appropriate responses to problems or complaints.',
    audience: 'Suitable for customer-facing staff, managers, apprentices and organisations that want a consistent standard of customer service.',
    duration: '3 to 4 hours',
  },
  'Introduction to Allergens': {
    overview: 'Introduces food allergens, allergic reactions and the controls needed from purchase through to service. It supports understanding of allergen communication, contamination prevention and the responsibilities of people handling food.',
    audience: 'Suitable for adults responsible for purchasing, receiving, preparing, producing or serving food in catering and hospitality settings.',
    duration: '1 to 2 hours',
  },
  'Emergency First Aid at Work': {
    overview: 'Provides online knowledge learning connected with emergency first aid at work, including initial priorities, incident response and the responsibilities of a workplace first aider. Practical training and assessment remain separate where a qualification is required.',
    audience: 'Suitable for adults preparing to become an emergency first aider at work or refreshing their underpinning knowledge.',
    duration: '3 to 4 hours',
  },
  'Equality and Diversity': {
    overview: 'Builds understanding of equality, diversity and the effects of inequality. It explains how respectful behaviour, equal opportunity and inclusive working practices contribute to a positive workplace culture.',
    audience: 'Suitable for employees at every level and for use during induction, refresher learning or workplace-culture programmes.',
    duration: '20 to 40 minutes',
  },
  'Health and Safety within a Construction Environment Level 1': {
    overview: 'Introduces the legal duties and practical responsibilities of construction operatives, including health, welfare and general site safety. It supports knowledge development for people preparing to work in construction.',
    audience: 'Suitable for adult new starters, employee induction and people preparing to enter the construction industry.',
    duration: '4 to 6 hours',
  },
  'Principles of the Role of a Fire Marshal Level 2': {
    overview: 'Explains fire prevention, risk assessment, evacuation arrangements and the responsibilities of a workplace fire marshal. Learners consider how behaviour, workplace conditions and emergency planning affect fire safety.',
    audience: 'Suitable for managers, supervisors, appointed fire marshals and employees undertaking refresher or introductory fire-marshal learning.',
    duration: '2 to 3 hours',
  },
  'Introduction to Environmental Awareness': {
    overview: 'Explains why environmental protection matters, how different forms of pollution arise and how organisations and individuals can reduce negative environmental impact. It also introduces waste responsibilities and the consequences of poor practice.',
    audience: 'Suitable for employees at all levels, particularly new starters who need a practical introduction to environmental awareness.',
    duration: '20 to 40 minutes',
  },
  'Asbestos Awareness': {
    overview: 'Explains what asbestos is, where it may be found, why exposure is dangerous and what workers should do when asbestos-containing materials may be present. It is awareness training and does not authorise asbestos removal.',
    audience: 'Suitable for adults whose normal work could disturb asbestos, including people working in maintenance, construction, refurbishment and building services.',
    duration: '30 to 40 minutes',
  },
  'Awareness of Sexual Harassment in the Workplace for Employees': {
    overview: 'Helps employees recognise sexual harassment, understand appropriate workplace conduct and use reporting routes. It supports a respectful culture in which dignity, inclusion and prevention responsibilities are understood.',
    audience: 'Suitable for adult employees at all levels who need to recognise, address and help prevent workplace sexual harassment.',
    duration: '30 to 45 minutes',
  },
  'Introduction to Fire Safety in the Workplace': {
    overview: 'Introduces common workplace fire risks, prevention measures, alarms, evacuation and individual responsibilities. It explains how appropriate controls can reduce the risk of injury, loss of life, property damage and business disruption.',
    audience: 'Suitable for adult employees and managers who need a basic understanding of workplace fire safety and associated risks.',
    duration: '30 to 40 minutes',
  },
  'Care Certificate': {
    overview: 'Provides structured knowledge learning across the Care Certificate standards for people beginning or developing work in health and social care. Workplace observation and competency sign-off remain the responsibility of the employer or training provider.',
    audience: 'Suitable for adults starting work in health or social care and existing workers who need structured Care Certificate knowledge learning.',
    duration: 'approximately 15 hours',
  },
  'Anaphylaxis and Autoinjectors': {
    overview: 'Explains severe allergic reactions, common warning signs and the emergency role of adrenaline autoinjectors. Learners consider immediate actions, responsibilities and the importance of obtaining emergency medical assistance.',
    audience: 'Suitable for adult employees, carers and managers working in environments where anaphylaxis awareness may be needed.',
    duration: '20 to 40 minutes',
  },
  'General Data Protection Regulation (GDPR)': {
    overview: 'Introduces the core requirements of the UK data-protection framework, including responsible handling, lawful processing, individual rights and workplace responsibilities when using personal information.',
    audience: 'Suitable for adults who handle personal data and managers responsible for data-handling practices.',
    duration: '20 to 40 minutes',
  },
  'Challenge - Responsible Sales in Hospitality and Retail': {
    overview: 'Explains age-restricted products, the legal responsibilities of sellers, age-verification approaches and how to refuse a sale appropriately. It supports responsible retailing in hospitality and retail environments.',
    audience: 'Suitable for adult employees selling age-restricted products, including new starters and staff completing refresher training.',
    duration: '20 to 40 minutes',
  },
  'HACCP Level 3 Manufacturing': {
    overview: 'Develops understanding of how HACCP principles can be applied and managed in food-manufacturing environments. It covers hazard analysis, control measures, monitoring and the maintenance of an effective food-safety system.',
    audience: 'Suitable for adult manufacturing supervisors, quality staff and managers responsible for HACCP or food-safety management.',
    duration: '8 to 10 hours',
  },
  Communication: {
    overview: 'Explores effective verbal, non-verbal and written communication in the workplace. Learners consider listening, clarity, relationships, engagement and how good communication can prevent misunderstandings and conflict.',
    audience: 'Suitable for adult employees at all levels, including new starters and apprentices developing workplace communication skills.',
    duration: '20 to 40 minutes',
  },
  'Health and Safety Management in Health Care Level 3': {
    overview: 'Covers health-and-safety law, healthcare workplace hazards and the controls needed to manage risk effectively. It supports supervisors and managers in overseeing staff and maintaining safer care environments.',
    audience: 'Suitable for adult supervisors and managers in healthcare or care settings who hold health-and-safety responsibilities.',
    duration: '8 to 10 hours',
  },
  'Food Safety Level 1': {
    overview: 'Provides an introduction to food safety, personal hygiene, contamination controls and the responsibilities of people working around food. It is suitable for low-risk food environments and induction learning.',
    audience: 'Suitable for adult new starters, low-risk food handlers and employees requiring introductory food-safety knowledge.',
    duration: '1 to 2 hours',
  },
  'Awareness of Modern Slavery': {
    overview: 'Explains modern slavery, relevant law, different forms of exploitation, warning signs and appropriate reporting. It helps learners understand how vulnerability may be used to control victims and what responsible action looks like.',
    audience: 'Suitable for adult employees and organisations requiring introductory modern-slavery awareness.',
    duration: '30 to 45 minutes',
  },
  'Health and Safety Level 3': {
    overview: 'Equips managers and supervisors with knowledge to identify hazards, implement controls and manage workplace health-and-safety responsibilities. It covers legal duties, risk management and monitoring performance.',
    audience: 'Suitable for adult managers, supervisors and people preparing for more advanced health-and-safety responsibilities.',
    duration: '8 to 10 hours',
  },
  'Introduction to Fraud and Fraud Prevention': {
    overview: 'Introduces common types of fraud, warning signs, organisational vulnerabilities and preventive controls. It helps learners understand how suspected fraud should be recognised and reported.',
    audience: 'Suitable for adult employees and managers who need awareness of fraud risks and economic-crime responsibilities.',
    duration: '20 to 40 minutes',
  },
  'HACCP Level 3 Catering': {
    overview: 'Develops understanding of how HACCP principles can be applied and managed in catering environments. It covers hazard analysis, control measures, monitoring and maintaining an effective food-safety system.',
    audience: 'Suitable for adult chefs, catering supervisors and managers responsible for HACCP or food-safety management.',
    duration: '8 to 10 hours',
  },
  'Introduction to the Prevention of Money Laundering': {
    overview: 'Introduces money-laundering risks, common warning signs, due-diligence responsibilities and reporting expectations. It helps learners understand how criminal proceeds may be disguised and how organisations can reduce exposure.',
    audience: 'Suitable for adult employees and managers who need introductory anti-money-laundering awareness.',
    duration: '20 to 40 minutes',
  },
  'Food Safety Level 2': {
    overview: 'Provides practical knowledge of food hygiene, foodborne illness, contamination hazards, safe storage, preparation and service. It supports food handlers in understanding their role in maintaining effective food-safety controls.',
    audience: 'Suitable for adult employees who prepare, cook, handle or serve food in catering, hospitality and related settings.',
    duration: '4 to 5 hours',
  },
  'Introduction to the Bribery Act 2010': {
    overview: 'Explains bribery offences, organisational responsibilities, gifts and hospitality risks and the consequences of non-compliance. It helps employees understand how concerns should be prevented and reported.',
    audience: 'Suitable for adult employees and managers who need introductory anti-bribery and economic-crime awareness.',
    duration: '20 to 40 minutes',
  },
  'Awareness of Home Working': {
    overview: 'Explores the health, safety and wellbeing responsibilities associated with home and hybrid working. It covers risk assessment, display-screen equipment, working arrangements, mental health and stress.',
    audience: 'Suitable for adult home workers, hybrid workers, managers and employers responsible for supporting safe home working.',
    duration: '35 to 50 minutes',
  },
  'Paediatric First Aid': {
    overview: 'Provides online knowledge learning connected with first-aid emergencies involving babies and children. It supports the underpinning knowledge used alongside practical paediatric first-aid training and assessment.',
    audience: 'Suitable for adults caring for infants and children, including childcare workers, childminders, education staff and carers.',
    duration: '6 to 8 hours',
  },
  'Information and Data Security': {
    overview: 'Explains how people across an organisation contribute to information security. It covers secure behaviours, organisational rules, policies, ISO 27001 awareness, regulatory expectations and practical steps for protecting information.',
    audience: 'Suitable for adult employees and managers who create, access, store or share organisational and personal information.',
    duration: '30 to 45 minutes',
  },
  'Health and Safety Level 2': {
    overview: 'Introduces workplace hazards, legal duties, risk assessment and practical controls for low- to medium-risk environments. It helps employees understand how their actions contribute to a safer workplace.',
    audience: 'Suitable for adult employees completing induction, refresher learning or preparation for Level 2 health-and-safety assessment.',
    duration: '4 to 5 hours',
  },
  'Managing Conflict': {
    overview: 'Builds confidence in recognising, preventing and responding to workplace conflict. It covers communication, de-escalation and practical approaches to threatening, abusive or difficult behaviour.',
    audience: 'Suitable for adult employees at all levels, including new starters and customer-facing teams.',
    duration: '20 to 40 minutes',
  },
  'Awareness of Sexual Harassment in the Workplace for Managers': {
    overview: 'Supports managers in preventing and responding to sexual harassment, handling concerns appropriately and building a respectful workplace culture. It explains management responsibilities, reporting and dignity at work.',
    audience: 'Suitable for adult managers and senior colleagues responsible for creating a safe and respectful workplace.',
    duration: '30 to 45 minutes',
  },
  'First Aid at Work': {
    overview: 'Provides online knowledge learning connected with first aid at work, including priorities, responsibilities and responses to workplace incidents. Practical training and assessment remain separate where a qualification is required.',
    audience: 'Suitable for adults preparing to become workplace first aiders or refreshing their underpinning knowledge.',
    duration: '8 to 10 hours',
  },
  'Food Safety Level 3': {
    overview: 'Provides advanced food-safety learning for people with supervisory responsibility. It covers the management of hazards, controls, staff practices and effective food-safety systems within a food business.',
    audience: 'Suitable for adult managers, supervisors and chefs responsible for food safety and staff performance.',
    duration: '8 to 10 hours',
  },
  'Food Safety for Manufacturing Level 2': {
    overview: 'Covers the key food-safety controls needed in manufacturing, including contamination prevention, hygiene, safe working practices and the responsibilities of people working in production environments.',
    audience: 'Suitable for adult employees working in food manufacturing, including production, packing, storage and induction roles.',
    duration: '4 to 5 hours',
  },
  'Health and Safety Level 1': {
    overview: 'Provides introductory workplace health-and-safety awareness, including common hazards, safe behaviour, employee responsibilities and how to reduce the risk of harm.',
    audience: 'Suitable for adult new starters and employees working in low-risk environments who need basic health-and-safety awareness.',
    duration: '1 to 2 hours',
  },
  'Team Working': {
    overview: 'Explores how teams work towards shared objectives through communication, cooperation, relationship building and clear roles. It helps learners understand how effective teamwork contributes to organisational success.',
    audience: 'Suitable for adult employees at every level, including new starters and apprentices integrating into a workplace team.',
    duration: '20 to 40 minutes',
  },
  'Awareness of Lone Working': {
    overview: 'Explains what lone working is, the risks it can create, how risk assessments and controls should be used and the responsibilities of employers and employees working away from direct supervision.',
    audience: 'Suitable for adult employees who work alone, remotely or separately from colleagues for any part of their role.',
    duration: '35 to 50 minutes',
  },
  'Safeguarding Children': {
    overview: 'Introduces child safeguarding responsibilities, signs of possible abuse or neglect and the importance of responding and reporting appropriately to protect children and young people.',
    audience: 'Suitable for adults who have responsibility for the welfare, care or supervision of children and young people.',
    duration: '20 to 40 minutes',
  },
  'Display Screen Equipment': {
    overview: 'Explains health risks associated with regular use of computers, laptops, tablets and other display-screen equipment. It covers workstation setup, posture, breaks, eye strain and practical steps to improve comfort.',
    audience: 'Suitable for adult employees who regularly use display-screen equipment at work or while working from home.',
    duration: '20 to 40 minutes',
  },
  'Personal Licence Holders Level 2': {
    overview: 'Covers the knowledge element associated with selling or authorising the sale of alcohol on licensed premises, including licensing law, responsible retailing and the duties of a personal licence holder.',
    audience: 'Suitable for adults preparing for a personal-licence qualification or working in licensed premises in England and Wales.',
    duration: '4 to 5 hours',
  },
  'STARS (Scottish Training for Alcohol Retailers and Servers)': {
    overview: 'Provides responsible alcohol-retailing training for people selling or serving alcohol in Scotland. It covers legal responsibilities, age verification, refusing sales and safer retail practice.',
    audience: 'Suitable for adults selling or serving alcohol in licensed Scottish premises who require approved staff training.',
    duration: '2 hours',
  },
  'Manual Handling': {
    overview: 'Introduces safer manual-handling practice, common injury risks and the principles used to assess lifting, carrying, pushing and pulling tasks. It supports induction and refresher learning.',
    audience: 'Suitable for adult employees whose work includes lifting, carrying, pushing, pulling or moving loads.',
    duration: '30 to 40 minutes',
  },
  'Stress Management': {
    overview: 'Explains workplace stress, common causes and warning signs, the difference between helpful pressure and harmful stress, and practical strategies for personal and organisational support.',
    audience: 'Suitable for adult employees, managers and organisations developing workplace health-and-wellbeing awareness.',
    duration: '20 to 40 minutes',
  },
  'Introduction to Working at Height': {
    overview: 'Introduces the hazards and controls associated with working at height, including planning, safe systems of work and the appropriate use of access equipment.',
    audience: 'Suitable for adult employees and new starters who require basic awareness of working-at-height risks and responsibilities.',
    duration: '40 to 90 minutes',
  },
  'An Awareness of Warehousing and Storage': {
    overview: 'Introduces warehousing and storage operations, including workplace health and safety, security, effective working relationships and maintaining clean, organised work areas.',
    audience: 'Suitable for adults working in or preparing to enter logistics, warehousing and storage roles.',
    duration: '2 to 3 hours',
  },
};

function subjectFor(course: Course) {
  return course.shortDescription
    .replace(/^Online training covering\s+/i, '')
    .replace(/[.]+$/, '')
    .trim();
}

function firstSentence(value: string) {
  return value.match(/^(.+?[.!?])(?:\s|$)/)?.[1] ?? value;
}

function enrichCourse(course: Course) {
  const source = factSheetDetails[course.title];
  const subject = subjectFor(course);

  course.shortDescription = source
    ? `${firstSentence(source.overview)} Learn the responsibilities, risks and practical actions connected with this subject.`
    : `Develop practical understanding of ${subject}, including key responsibilities, common risks and examples of good practice.`;

  course.overview = source
    ? `${source.overview} The course is completed online through the Highfield Learning Management System after Aptenvo has processed the learner's enrolment. Structured modules and knowledge checks help the learner understand and apply the subject.`
    : `${course.overview} The content is organised into focused online modules that explain the subject, provide practical examples and check understanding as the learner progresses. After Aptenvo completes enrolment, Highfield sends the learner instructions for accessing the Learning Management System.`;

  course.audience = source?.audience
    ? `${source.audience} Aptenvo only accepts purchases from adults aged 18 or over.`
    : `${course.audience} Aptenvo only accepts purchases from adults aged 18 or over.`;

  course.delivery = source?.duration
    ? `Self-paced online learning through the Highfield Learning Management System. The supplied provider fact sheet gives an estimated learning time of ${source.duration}; actual completion time varies by learner.`
    : 'Self-paced online learning through the Highfield Learning Management System. Completion time varies according to the course and the learner.';

  if (!course.qualificationNotice.includes('18+')) {
    course.qualificationNotice = `${course.qualificationNotice} Aptenvo is an 18+ service and does not sell courses to anyone under the age of 18.`;
  }
}

catalogue.forEach(enrichCourse);

export { factSheetDetails };
