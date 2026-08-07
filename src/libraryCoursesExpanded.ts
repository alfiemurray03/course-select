import { assessmentQuestion, lesson, type LibraryCourse } from './libraryCourseTypes';

const allPlans = ['Learner', 'Learner Plus', 'Team 5', 'Team 15'] as const;
const completePlans = ['Learner Plus', 'Team 5', 'Team 15'] as const;

type CategoryBlueprint = {
  prefix: string;
  purpose: string;
  practice: string;
  risks: string;
  evidence: string;
  audience: string[];
  notice: string;
  titles: string[];
};

const blueprints: CategoryBlueprint[] = [
  {
    prefix: 'BUS',
    purpose: 'turn an objective into a commercially sensible and testable way of working',
    practice: 'define the customer or business need, choose an proportionate method, check assumptions and review the financial or operational effect',
    risks: 'unclear assumptions, weak evidence, avoidable cost, poor cash timing, over-commitment and decisions that are not recorded',
    evidence: 'customer evidence, simple calculations, decision records, action plans and review measures',
    audience: ['Small-business owners', 'New managers', 'People supporting business planning or commercial decisions'],
    notice: 'This course provides general business education and does not provide legal, tax, accounting, investment or regulated financial advice.',
    titles: ['Business Planning Essentials','Market Research Basics','Value Proposition Design','Business Model Fundamentals','Pricing for Small Businesses','Cash Flow Planning','Cost Control Essentials','Revenue Forecasting Basics','Supplier Management','Business Risk Awareness','Business Continuity Basics','Starting as a Sole Trader','Limited Company Basics','Business Record Keeping','Commercial Decision Making','Business Growth Planning','Service Design Fundamentals','Customer Discovery','Competitor Analysis','Business Performance Measures'],
  },
  {
    prefix: 'SAL',
    purpose: 'understand the customer need and deliver a clear, fair and accountable service outcome',
    practice: 'listen actively, clarify the request, explain options accurately, agree next steps and keep an appropriate record',
    risks: 'misunderstanding the customer, over-promising, pressure selling, poor records, inconsistent treatment and unresolved complaints',
    evidence: 'accurate notes, agreed actions, service measures, feedback and documented follow-up',
    audience: ['Customer-service staff', 'Sales staff', 'Small-business owners', 'Team leaders supporting customer-facing work'],
    notice: 'This course provides general service and sales skills. Organisation-specific complaints, vulnerability, consumer, safeguarding and escalation procedures must still be followed.',
    titles: ['Customer Service Foundations','Handling Customer Enquiries','Telephone Service Skills','Live Chat Service Skills','Email Customer Service','Complaint Handling Essentials','Service Recovery','Managing Customer Expectations','Difficult Customer Conversations','Customer Vulnerability Awareness','Sales Conversation Basics','Needs-Based Selling','Ethical Sales Practice','Handling Sales Objections','Building Customer Trust','Customer Retention Basics','Cross-Selling Responsibly','After-Sales Service','Customer Feedback and Insight','Service Quality Monitoring'],
  },
  {
    prefix: 'DAI',
    purpose: 'use digital tools confidently while keeping human judgement, verification, privacy and accessibility in the workflow',
    practice: 'define the task, use an approved tool, provide suitable context, check the output and record material decisions or changes',
    risks: 'unverified information, inappropriate disclosure, poor accessibility, over-automation, weak source checking and loss of human accountability',
    evidence: 'verified outputs, source notes, version history, review checklists and documented human decisions',
    audience: ['Employees using digital tools', 'Managers', 'Small-business owners', 'People introducing AI-assisted working'],
    notice: 'This course is general digital-skills education. It does not approve a particular AI or software service and does not replace security, privacy or professional-review requirements.',
    titles: ['Digital Confidence at Work','Generative AI Foundations','Prompt Writing Essentials','AI Output Verification','Responsible AI Use','AI-Assisted Research','AI for Writing and Editing','AI for Customer Service','AI for Business Planning','AI for Productivity','Online Research Skills','Digital Collaboration Tools','Cloud Working Essentials','Digital File Organisation','Browser and Web Skills','Online Form Design Basics','Digital Note-Taking','Automation Awareness','Data Visualisation Basics','Digital Accessibility Basics'],
  },
  {
    prefix: 'M36',
    purpose: 'use Microsoft 365 tools in a controlled, efficient and collaborative way',
    practice: 'choose the right application, structure information clearly, use collaboration features deliberately and check the final output before sharing',
    risks: 'duplicate files, uncontrolled sharing, broken formulas, inaccessible documents, confusing formatting and loss of version control',
    evidence: 'well-structured files, clear permissions, version history, quality checks and accessible final documents',
    audience: ['Microsoft 365 users', 'Administrative staff', 'Managers', 'People producing workplace documents, spreadsheets or presentations'],
    notice: 'Features can change as Microsoft 365 is updated. Learners should follow their organisation’s approved tenant configuration, security settings and sharing rules.',
    titles: ['Microsoft Word Essentials','Microsoft Word Intermediate','Microsoft Excel Essentials','Microsoft Excel Formulas','Microsoft Excel Data Organisation','Microsoft PowerPoint Essentials','Microsoft Outlook Essentials','Microsoft Teams Essentials','Microsoft OneDrive Essentials','Microsoft SharePoint Essentials','Microsoft Forms Essentials','Microsoft Lists Essentials','Microsoft Planner Essentials','Microsoft Loop Essentials','Microsoft Bookings Essentials','Microsoft 365 Collaboration','Creating Accessible Office Documents','Professional Document Formatting','Spreadsheet Quality Checks','Presentation Design Basics'],
  },
  {
    prefix: 'WRK',
    purpose: 'complete day-to-day work reliably, professionally and with clear accountability',
    practice: 'understand the task, confirm priorities and standards, carry out the work, record important information and escalate issues at the right time',
    risks: 'missed instructions, unclear ownership, poor handover, unmanaged workload, confidentiality failures and preventable quality errors',
    evidence: 'task records, handover notes, completed checks, issue logs and clear ownership of follow-up actions',
    audience: ['Employees', 'Volunteers', 'New starters', 'Supervisors supporting routine operational work'],
    notice: 'Learners must also follow organisation-specific procedures, confidentiality rules, safety arrangements and authorised escalation routes.',
    titles: ['Professional Conduct at Work','Workplace Organisation','Meeting Essentials','Effective Handover','Shift Handover Basics','Working to Procedures','Following Instructions Accurately','Workplace Record Keeping','Task Prioritisation','Managing Workload','Remote Working Essentials','Hybrid Working Essentials','Working Independently','Teamworking Foundations','Workplace Problem Solving','Escalation and Reporting','Quality Awareness','Continuous Improvement Basics','Workplace Confidentiality','Professional Boundaries'],
  },
  {
    prefix: 'LDR',
    purpose: 'lead people through clear expectations, fair decisions, useful feedback and accountable follow-up',
    practice: 'set the outcome, explain responsibilities, listen to the team, support delivery, review evidence and address problems consistently',
    risks: 'unclear expectations, inconsistent treatment, avoidance of difficult conversations, weak records, poor delegation and decisions based on assumption',
    evidence: 'agreed objectives, one-to-one notes, feedback records, action plans, performance evidence and review dates',
    audience: ['First-time managers', 'Team leaders', 'Supervisors', 'People preparing for management responsibilities'],
    notice: 'This course provides general management skills and does not replace organisation-specific HR, employment-law, safeguarding, disciplinary or grievance procedures.',
    titles: ['First-Time Manager Essentials','Team Leadership Foundations','Delegation Skills','Setting Clear Expectations','One-to-One Meetings','Giving Constructive Feedback','Receiving Feedback as a Manager','Managing Team Performance','Coaching Conversations','Motivating a Team','Leading Through Change','Decision Making for Managers','Managing Competing Priorities','Manager Communication Skills','Building Psychological Safety','Managing Conflict in Teams','Inclusive Leadership Awareness','Remote Team Leadership','Team Accountability','Management Record Keeping'],
  },
  {
    prefix: 'OPS',
    purpose: 'plan and control projects or operational work so that scope, ownership, risk and progress remain visible',
    practice: 'define the outcome, break work into manageable actions, identify dependencies and risks, monitor progress and close or hand over properly',
    risks: 'scope drift, hidden dependencies, weak ownership, unmanaged change, poor handover, inaccurate status reporting and repeated process failures',
    evidence: 'plans, risk logs, status reports, process maps, decision records, action trackers and closure notes',
    audience: ['Project team members', 'Operations staff', 'Managers', 'People improving workflows or services'],
    notice: 'This course provides general project and operational skills. Sector-specific technical, safety, contractual and regulatory controls may require additional training.',
    titles: ['Project Management Foundations','Project Scoping','Project Planning Basics','Project Risk Management','Project Scheduling Basics','Project Stakeholder Management','Project Status Reporting','Project Handover and Closure','Operational Planning','Standard Operating Procedures','Process Mapping','Workflow Improvement','Root Cause Analysis','Incident Review Basics','Service Operations Fundamentals','Capacity Planning Basics','Resource Planning Basics','Operational Risk Awareness','Change Control Basics','Performance Dashboard Basics'],
  },
  {
    prefix: 'COM',
    purpose: 'communicate information so that the audience understands the purpose, evidence, decision and required action',
    practice: 'choose the right channel, structure the message, use appropriate tone, check understanding and confirm decisions or actions',
    risks: 'ambiguity, unnecessary conflict, inaccessible communication, missing context, undocumented decisions and messages that do not identify an owner or deadline',
    evidence: 'clear written records, confirmed actions, meeting notes, briefing documents and feedback from the intended audience',
    audience: ['Employees', 'Managers', 'Customer-facing staff', 'People producing written or verbal workplace communications'],
    notice: 'Learners must follow organisation-specific confidentiality, records-management, accessibility and approved-channel requirements.',
    titles: ['Clear Writing at Work','Professional Email Writing','Business Telephone Skills','Active Listening','Asking Better Questions','Giving Clear Instructions','Writing Meeting Minutes','Running Effective Meetings','Presenting with Confidence','Writing Briefing Notes','Writing Reports','Communicating Change','Communicating Bad News Professionally','Conflict Resolution Basics','Negotiation Foundations','Collaborative Problem Solving','Working Across Teams','Stakeholder Communication','Written Tone and Professionalism','Communicating with Senior Leaders'],
  },
  {
    prefix: 'DEV',
    purpose: 'build a repeatable personal system for learning, priorities, decisions and reliable follow-through',
    practice: 'define the desired outcome, recognise constraints, choose a manageable action, review progress and adjust deliberately',
    risks: 'unrealistic planning, vague goals, distraction, avoidance, poor reflection, overloaded commitments and relying on motivation instead of a system',
    evidence: 'written goals, review notes, action lists, learning records, reflection and measurable progress over time',
    audience: ['Employees', 'Managers', 'Jobseekers', 'People developing their personal effectiveness'],
    notice: 'This course provides general personal-development education. It is not medical, psychological or therapeutic advice.',
    titles: ['Time Management Essentials','Personal Productivity Systems','Goal Setting','Building Better Habits','Managing Distractions','Focus and Deep Work','Personal Organisation','Decision Making Skills','Critical Thinking Foundations','Creative Problem Solving','Confidence at Work','Resilience Awareness','Learning How to Learn','Reflective Practice','Managing Personal Workload','Professional Self-Awareness','Growth Mindset in Practice','Building Consistency','Personal Accountability','Career Development Planning'],
  },
  {
    prefix: 'SEC',
    purpose: 'protect information, accounts and devices by making secure behaviour part of normal work',
    practice: 'verify unusual requests, use approved authentication and storage, minimise access, protect devices and report suspicious activity promptly',
    risks: 'phishing, stolen credentials, inappropriate sharing, excessive access, lost devices, untested recovery and delayed incident reporting',
    evidence: 'access records, incident reports, approved storage, security checks, recovery tests and prompt escalation',
    audience: ['Employees using digital systems', 'Small-business owners', 'Managers', 'People handling business or personal information'],
    notice: 'This is general cybersecurity and information-management awareness. It does not replace technical controls, specialist security advice or organisation-specific incident procedures.',
    titles: ['Password Security','Multi-Factor Authentication Awareness','Phishing Awareness','Social Engineering Awareness','Secure Remote Working','Device Security Basics','Safe Web Browsing','Email Security Awareness','Data Classification Basics','Secure File Sharing','Information Handling Essentials','Records Management Basics','Data Retention Awareness','Secure Disposal of Information','Access Control Awareness','Incident Reporting for Cyber Events','Backup and Recovery Awareness','Cloud Security Basics','Mobile Device Security','Cybersecurity for Small Businesses'],
  },
  {
    prefix: 'GOV',
    purpose: 'support lawful, fair and accountable organisational decisions through clear controls and records',
    practice: 'understand the relevant policy or duty, identify authority and risk, follow the approved process, keep evidence and escalate uncertainty',
    risks: 'acting outside authority, weak records, undisclosed conflicts, inconsistent treatment, missed requests, poor monitoring and failure to escalate concerns',
    evidence: 'policies, registers, audit trails, approvals, review records, complaint files and documented decisions',
    audience: ['Employees', 'Managers', 'Business owners', 'People supporting governance, compliance or controlled processes'],
    notice: 'This is general governance and compliance awareness and is not legal advice. Applicable law, regulator guidance and organisation-specific procedures must be checked for the learner’s circumstances.',
    titles: ['Data Protection Foundations','Privacy by Design Awareness','Subject Access Request Awareness','Personal Data Breach Awareness','Records Governance','Policy and Procedure Awareness','Conflicts of Interest Awareness','Anti-Bribery and Corruption Awareness','Fraud Awareness','Whistleblowing Awareness','Equality at Work Awareness','Harassment Prevention Awareness','Reasonable Adjustments Awareness','Consumer Fairness Awareness','Complaints Governance','Audit Trail Awareness','Delegated Authority Awareness','Governance Record Keeping','Risk Register Basics','Compliance Monitoring Basics'],
  },
  {
    prefix: 'SAF',
    purpose: 'recognise workplace hazards, follow controls and report concerns before they become more serious',
    practice: 'identify the hazard, consider who may be affected, follow the established control, stop or escalate unsafe work and record incidents or near misses',
    risks: 'unrecognised hazards, bypassed controls, fatigue, poor ergonomics, unsafe equipment, weak emergency response and under-reporting',
    evidence: 'risk controls, checks, incident reports, near-miss reports, safety briefings and documented follow-up',
    audience: ['Employees and volunteers', 'New starters', 'Supervisors', 'Small-business owners requiring general awareness'],
    notice: 'This is general awareness training and does not replace workplace risk assessments, practical instruction, competent-person advice, first-aid training or role-specific safety training.',
    titles: ['Workplace Safety Foundations','Hazard Identification','Risk Assessment Awareness','Manual Handling Awareness','Fire Safety Awareness','Emergency Procedures','Slips Trips and Falls Awareness','Display Screen Equipment Awareness','Lone Working Awareness','Home Working Safety','Stress Awareness','Workplace Wellbeing','Fatigue Awareness','First Aid Awareness','Accident Reporting','Near Miss Reporting','Personal Safety at Work','Safe Use of Work Equipment Awareness','Workplace Ergonomics','Safety Communication'],
  },
  {
    prefix: 'CAR',
    purpose: 'present skills and experience clearly while preparing for the practical expectations of work and career development',
    practice: 'identify the target opportunity, gather relevant evidence, tailor the application or development plan, prepare examples and review feedback',
    risks: 'generic applications, unsupported claims, weak preparation, unclear career goals, poor evidence of skills and missed follow-up',
    evidence: 'CVs, application records, interview examples, development plans, portfolios and professional learning records',
    audience: ['Jobseekers', 'New starters', 'Employees planning progression', 'People changing role or career direction'],
    notice: 'This course provides general employability and career-development education and does not guarantee employment, promotion or a particular recruitment outcome.',
    titles: ['CV Writing Essentials','Cover Letter Writing','Job Search Skills','Interview Preparation','Interview Communication','Starting a New Job','Probation Period Success','Workplace Confidence for New Starters','Professional Networking','LinkedIn Profile Basics','Building a Professional Portfolio','Career Goal Setting','Transferable Skills','Workplace Etiquette','Professional References','Preparing for Promotion','Internal Job Applications','Career Change Planning','Freelancing Foundations','Professional Development Records'],
  },
];

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function titleLower(title: string) {
  return title.charAt(0).toLowerCase() + title.slice(1);
}

function createExpandedCourse(category: CategoryBlueprint, title: string, index: number): LibraryCourse {
  const topic = titleLower(title);
  const code = `SME-${category.prefix}-${String(index + 201).padStart(3, '0')}`;
  const includedPlans = index < 6 ? [...allPlans] : [...completePlans];
  const level = title.includes('Intermediate') || index >= 14 ? 'Intermediate' as const : 'Foundation' as const;

  const modules = [
    {
      id: 'foundations',
      title: 'Module 1: Foundations and purpose',
      description: `Understand where ${topic} fits into day-to-day work and what a good outcome looks like.`,
      lessons: [
        lesson(
          'purpose-and-scope',
          `Purpose and scope of ${title}`,
          `Build a practical definition of ${topic} and identify when the skill or control matters.`,
          10,
          [`Explain the purpose of ${topic}.`, 'Identify the people, information and outcomes affected.', 'Recognise when a task needs a more specialised process or adviser.'],
          [
            { heading: 'Start with the outcome', paragraphs: [`${title} is most useful when it begins with a clear outcome rather than a habit, template or tool. In this course, the aim is to ${category.purpose}. Before acting, identify who is affected, what success should look like and which constraints or procedures apply.`] },
            { heading: 'Put the topic in context', bullets: ['Define the intended outcome before choosing a method.', 'Check who owns the decision and who needs to be involved.', 'Use only the information, authority and tools that are appropriate to the task.', 'Pause and escalate when the consequence of an error is outside your competence or authority.'], callout: `Good ${topic} is proportionate: the method should match the importance, complexity and risk of the task.` },
          ],
          { question: `What is the strongest starting point for ${topic}?`, options: ['Define the intended outcome and relevant context', 'Copy a template without checking whether it fits', 'Start work without knowing who owns the decision'], answer: 0, explanation: 'A clear outcome and context allow the learner to choose an appropriate and proportionate method.' },
        ),
        lesson(
          'principles-and-standards',
          `Principles for reliable ${title}`,
          `Use a small set of principles to keep ${topic} consistent, fair and reviewable.`,
          10,
          ['Use a repeatable method.', 'Separate evidence from assumption.', 'Keep decisions and actions proportionate to risk.'],
          [
            { heading: 'Reliable work can be explained', paragraphs: [`A good approach to ${topic} should be understandable to another person. The learner should be able to explain what was known, what was assumed, which method was used and why the final action was reasonable.`] },
            { heading: 'Core working principles', bullets: ['Use relevant evidence rather than unsupported assumption.', 'Apply the same standard consistently unless there is a justified reason to adapt it.', 'Protect confidential or sensitive information.', 'Record material decisions, changes and agreed actions.', 'Review the result rather than treating completion as proof of quality.'] },
          ],
          { question: `Which behaviour makes ${topic} more accountable?`, options: ['Recording material decisions and the evidence used', 'Relying on memory for every important action', 'Changing the standard without recording why'], answer: 0, explanation: 'A proportionate record makes the work easier to review, explain and improve.' },
        ),
      ],
    },
    {
      id: 'practice',
      title: 'Module 2: Apply the skill in practice',
      description: `Turn the principles into a repeatable workflow for ${topic}.`,
      lessons: [
        lesson(
          'practical-workflow',
          `A practical ${title} workflow`,
          'Move from an unclear task to a controlled sequence of actions and checks.',
          11,
          ['Break the task into a clear sequence.', 'Build checks into the workflow.', 'Confirm ownership and follow-up.'],
          [
            { heading: 'Use a controlled sequence', paragraphs: [`A practical approach is to ${category.practice}. The exact tools will differ between organisations, but the sequence should make it difficult to skip important checks or leave ownership unclear.`] },
            { heading: 'A six-step workflow', bullets: ['1. Define the purpose and required outcome.', '2. Gather only the information that is relevant.', '3. Choose an approved method, channel or tool.', '4. Carry out the task and record material decisions.', '5. Check the result against the original requirement.', '6. Confirm the next action, owner and review point.'], callout: 'A checklist is useful only when it reflects the real task and the learner still applies judgement.' },
          ],
          { question: `What should happen near the end of a ${topic} task?`, options: ['Check the result against the original requirement and confirm follow-up', 'Assume completion means the result is correct', 'Remove the record of how the decision was reached'], answer: 0, explanation: 'The output should be checked against the intended outcome and any follow-up should have a clear owner.' },
        ),
        lesson(
          'mistakes-and-controls',
          `Common mistakes and controls in ${title}`,
          'Recognise predictable failure points and use proportionate controls before they create a larger problem.',
          10,
          ['Identify common failure points.', 'Use preventative and detective checks.', 'Escalate uncertainty at the right time.'],
          [
            { heading: 'Predictable problems can be managed', paragraphs: [`Common risks in this area include ${category.risks}. A useful control should reduce the chance or consequence of the problem without making the process unnecessarily difficult.`] },
            { heading: 'Control the important points', bullets: ['Verify identity, authority or source where that matters.', 'Use peer review or a second check for higher-consequence work.', 'Keep permissions and access no wider than necessary.', 'Record exceptions and the reason for them.', 'Escalate when the task exceeds the learner’s authority, competence or available evidence.'] },
          ],
          { question: `When should a learner escalate a ${topic} issue?`, options: ['When the consequence or decision is outside their authority or competence', 'Only after hiding the problem', 'Never, because every task should be handled alone'], answer: 0, explanation: 'Timely escalation is part of accountable working where the learner cannot safely or properly resolve the issue alone.' },
        ),
      ],
    },
    {
      id: 'review',
      title: 'Module 3: Evidence, review and improvement',
      description: `Keep useful evidence, learn from outcomes and improve future ${topic}.`,
      lessons: [
        lesson(
          'records-and-evidence',
          `Records and evidence for ${title}`,
          'Create a proportionate record that another authorised person can understand and use.',
          9,
          ['Identify useful evidence.', 'Avoid unnecessary or excessive recording.', 'Make actions and decisions traceable.'],
          [
            { heading: 'Record what supports the work', paragraphs: [`Useful evidence for ${topic} can include ${category.evidence}. The record should be accurate enough to support continuity and review, but it should not collect unnecessary information simply because storage is available.`] },
            { heading: 'A useful record answers five questions', bullets: ['What was the task or issue?', 'What relevant evidence was available?', 'What decision or action was taken?', 'Who owns the next step?', 'When will the result be reviewed or closed?'] },
          ],
          { question: 'Which is the best reason to keep a proportionate record?', options: ['To support continuity, accountability and review', 'To collect every possible piece of information', 'To avoid deciding who owns the next action'], answer: 0, explanation: 'A useful record supports future action and review without creating unnecessary information.' },
        ),
        lesson(
          'review-and-improvement',
          `Review and improve ${title}`,
          'Use outcomes, feedback and exceptions to make the next cycle more reliable.',
          10,
          ['Review whether the intended outcome was achieved.', 'Use feedback and exceptions as evidence.', 'Choose a specific improvement action.'],
          [
            { heading: 'Review the result, not just the activity', paragraphs: [`Completing a ${topic} process does not prove it worked. Compare the result with the original objective, identify unexpected effects and distinguish a one-off mistake from a recurring weakness in the process.`] },
            { heading: 'Close the learning loop', bullets: ['Compare the result with the intended outcome.', 'Identify what worked and what created friction or risk.', 'Look for repeated exceptions or avoidable rework.', 'Choose one specific improvement with an owner.', 'Set a point to check whether the change actually helped.'], callout: 'Improvement should be evidence-led. Changing a process without checking the result can simply move the problem elsewhere.' },
          ],
          { question: `What is the best way to improve future ${topic}?`, options: ['Use outcomes and evidence to choose a specific change and review it', 'Change several things without recording them', 'Ignore exceptions because the task eventually finished'], answer: 0, explanation: 'A specific evidence-led change is easier to test and learn from.' },
        ),
      ],
    },
  ];

  return {
    code,
    slug: slugify(title),
    title,
    category: category.prefix === 'SAL' ? 'Customer service and sales' : category.prefix === 'M36' ? 'Microsoft 365 and office skills' : category.prefix === 'LDR' ? 'Leadership and management' : category.prefix === 'OPS' ? 'Project and operational skills' : category.prefix === 'COM' ? 'Communication and collaboration' : category.prefix === 'SEC' ? 'Cybersecurity and information management' : category.prefix === 'GOV' ? 'Compliance and governance awareness' : category.prefix === 'SAF' ? 'Safety and wellbeing awareness' : category.prefix === 'CAR' ? 'Employability and career skills' : category.prefix === 'WRK' ? 'Workplace essentials' : category.prefix === 'DEV' ? 'Personal development' : category.prefix === 'DAI' ? 'Digital skills and AI' : 'Business and enterprise',
    shortDescription: `A structured practical course covering the foundations, workflow, common risks, evidence and improvement of ${topic}.`,
    overview: `${title} is a structured ${level.toLowerCase()} course designed to help learners apply the topic in real work rather than simply recognise terminology. It explains the purpose and principles, provides a repeatable practical workflow, highlights predictable failure points and requires the learner to complete six knowledge checks and a final assessment.`,
    audience: category.audience,
    prerequisites: level === 'Foundation' ? 'No previous formal training is required.' : `A basic understanding of ${topic} or related workplace experience is helpful.`,
    level,
    featured: false,
    version: '1.0',
    reviewDate: 'August 2027',
    includedPlans,
    learningOutcomes: [
      `Explain the purpose and scope of ${topic}.`,
      `Apply a repeatable workflow for ${topic}.`,
      'Separate relevant evidence from assumption.',
      'Recognise common mistakes, risks and escalation points.',
      'Keep proportionate records of material actions and decisions.',
      `Review outcomes and identify a specific improvement to future ${topic}.`,
    ],
    modules,
    finalAssessment: {
      title: `${title} final assessment`,
      instructions: 'Answer all six questions. A score of 80% or higher is required. You may review the course and attempt the assessment again.',
      passMark: 80,
      questions: [
        assessmentQuestion('q1', `What is the best starting point for ${topic}?`, ['Define the intended outcome and context', 'Select a tool before understanding the task', 'Avoid identifying who is affected'], 0, 'The outcome and context should be understood before choosing the method.'),
        assessmentQuestion('q2', `Which behaviour makes ${topic} more accountable?`, ['Keeping a proportionate record of material decisions', 'Relying only on memory', 'Changing standards without explanation'], 0, 'A proportionate record supports review and accountability.'),
        assessmentQuestion('q3', 'What should a controlled workflow include?', ['A final check against the original requirement', 'No defined owner', 'Only the easiest steps'], 0, 'The result should be checked against the requirement before the task is treated as complete.'),
        assessmentQuestion('q4', 'When is escalation appropriate?', ['When the issue exceeds the learner’s authority, competence or evidence', 'Only after the record is deleted', 'Never'], 0, 'Escalation is part of safe and accountable working when the learner cannot properly resolve the issue.'),
        assessmentQuestion('q5', 'Why keep proportionate evidence?', ['To support continuity, accountability and review', 'To collect information without a purpose', 'To remove ownership of actions'], 0, 'Useful evidence supports the next action and later review.'),
        assessmentQuestion('q6', `How should ${topic} be improved over time?`, ['Review outcomes, choose a specific change and check whether it helps', 'Change several things without measuring them', 'Ignore repeated exceptions'], 0, 'Improvement is strongest when it is specific, evidence-led and reviewed.'),
      ],
    },
    certificateStatement: `Certificate of completion: ${title}.`,
    importantNotice: category.notice,
  };
}

export const expandedLibraryCourses: LibraryCourse[] = blueprints.flatMap((category) =>
  category.titles.map((title, index) => createExpandedCourse(category, title, index)),
);
