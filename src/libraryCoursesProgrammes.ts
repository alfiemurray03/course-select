import {
  assessmentQuestion,
  type AssessmentQuestion,
  type CoursePlan,
  type KnowledgeCheck,
  type LibraryCourse,
  type LibraryLesson,
  type LibraryModule,
} from './libraryCourseTypes';

const corePlans: CoursePlan[] = ['Learner', 'Learner Plus', 'Team 5', 'Team 15'];
const completePlans: CoursePlan[] = ['Learner Plus', 'Team 15'];

type WeekBlueprint = {
  title: string;
  lessonOne: string;
  lessonTwo: string;
  focus: string;
};

type ProgrammeBlueprint = {
  code: string;
  slug: string;
  title: string;
  category: string;
  level: 'Foundation' | 'Intermediate';
  featured?: boolean;
  core: boolean;
  shortDescription: string;
  overview: string;
  audience: string[];
  prerequisites: string;
  practiceContext: string;
  risks: string;
  evidence: string;
  notice: string;
  weeks: WeekBlueprint[];
};

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function rotateOptions(correct: string, distractors: string[], shift: number) {
  const options = [correct, ...distractors].slice(0, 4);
  const amount = ((shift % options.length) + options.length) % options.length;
  const rotated = [...options.slice(amount), ...options.slice(0, amount)];
  return { options: rotated, answer: rotated.indexOf(correct) };
}

function knowledgeCheck(question: string, correct: string, distractors: string[], explanation: string, shift: number): KnowledgeCheck {
  const rotated = rotateOptions(correct, distractors, shift);
  return { question, options: rotated.options, answer: rotated.answer, explanation };
}

function lessonChecks(programme: ProgrammeBlueprint, week: WeekBlueprint, applied: boolean, seed: number): KnowledgeCheck[] {
  const topic = applied ? week.lessonTwo : week.lessonOne;
  return [
    knowledgeCheck(
      `What should happen first when applying ${topic.toLowerCase()}?`,
      'Define the intended outcome, context and constraints before choosing an action.',
      ['Choose a tool immediately and work backwards.', 'Copy the last approach without checking whether circumstances changed.', 'Wait until the end before deciding what success means.'],
      'A controlled approach starts by defining the outcome and context so the method can be proportionate.', seed,
    ),
    knowledgeCheck(
      `Which evidence is strongest when making a decision about ${week.title.toLowerCase()}?`,
      `Evidence directly connected to the required outcome, recorded assumptions and the ${programme.evidence}.`,
      ['An unsupported opinion from the person doing the task.', 'A result selected only because it confirms the preferred answer.', 'A record that does not identify its source or date.'],
      'Relevant, traceable evidence is stronger than assumption or confirmation bias.', seed + 1,
    ),
    knowledgeCheck(
      `What is the best response when a ${programme.category.toLowerCase()} task exceeds the learner's authority or competence?`,
      'Pause, preserve the relevant information and escalate through the authorised route.',
      ['Continue because escalation makes the task slower.', 'Delete the record so nobody is confused.', 'Make the highest-risk decision alone and explain it afterwards.'],
      'Escalation is part of competent practice when risk, authority or specialist knowledge exceeds the learner’s role.', seed + 2,
    ),
    knowledgeCheck(
      `How should quality be checked after completing work on ${week.title.toLowerCase()}?`,
      'Compare the result with the original requirement, evidence and agreed standard.',
      ['Assume completion means the outcome is correct.', 'Check only whether the task was fast.', 'Use a different standard after seeing the result.'],
      'Quality review compares the actual result against the requirement and standard agreed before the work was completed.', seed + 3,
    ),
    knowledgeCheck(
      `What makes the learner's work on ${topic.toLowerCase()} accountable?`,
      'A proportionate record of evidence, decisions, actions, ownership and follow-up.',
      ['Keeping important decisions only in memory.', 'Recording large amounts of unrelated information.', 'Removing the name of the person responsible for follow-up.'],
      'Accountability depends on a proportionate record that another authorised person can understand and continue.', seed + 4,
    ),
  ];
}

function makeLesson(programme: ProgrammeBlueprint, week: WeekBlueprint, weekNumber: number, applied: boolean): LibraryLesson {
  const title = applied ? week.lessonTwo : week.lessonOne;
  const id = `week-${weekNumber}-${applied ? 'workshop' : 'learning'}`;
  const checks = lessonChecks(programme, week, applied, weekNumber * 7 + (applied ? 3 : 0));
  const practicalActivity = applied
    ? {
        title: `${week.title}: applied case workshop`,
        instructions: [
          `Work through a realistic ${programme.practiceContext} scenario connected to ${week.focus}.`,
          'Identify the outcome, people affected, evidence available, constraints and any missing information.',
          'Write down at least two possible approaches and explain the trade-offs between them.',
          `Identify how the following risks could appear in the scenario: ${programme.risks}.`,
          'Choose an action, explain why it is proportionate and define how the result will be checked.',
        ],
      }
    : {
        title: `${week.title}: concept-to-practice notes`,
        instructions: [
          `Summarise the core principles of ${title.toLowerCase()} in your own words.`,
          'Write one example from a real or realistic workplace situation.',
          'Identify one point where evidence is needed before action is taken.',
          'Identify one point where escalation or specialist support may be required.',
        ],
      };

  return {
    id,
    title,
    summary: applied
      ? `Apply the week's learning to realistic decisions, evidence, records and follow-up in ${programme.practiceContext}.`
      : `Build a detailed understanding of ${title.toLowerCase()}, why it matters and how to use it in practice.`,
    minutes: 65,
    objectives: [
      `Explain the main principles of ${title.toLowerCase()}.`,
      `Apply those principles to ${programme.practiceContext}.`,
      'Distinguish evidence from assumption and identify missing information.',
      'Recognise risk, authority limits and appropriate escalation points.',
    ],
    sections: [
      {
        heading: `Understanding ${title}`,
        paragraphs: [
          `${title} is not a vocabulary exercise. In this programme it is treated as a practical capability: the learner must understand the purpose, make a reasoned decision, carry out the work and be able to explain why the approach was appropriate.`,
          `This week focuses on ${week.focus}. The learner should connect that focus to the programme's wider aim: ${programme.overview}`,
        ],
      },
      {
        heading: 'A disciplined decision framework',
        bullets: [
          'Define the outcome before choosing the method.',
          'Identify who is affected and who owns the decision.',
          'Gather information that is relevant, current and proportionate.',
          'Separate known facts from assumptions and unresolved questions.',
          'Choose an action that matches the consequence and level of risk.',
          'Record material decisions, exceptions and agreed follow-up.',
        ],
        callout: `The method should be proportionate. Higher-consequence ${programme.category.toLowerCase()} work needs stronger evidence, review and escalation.`,
      },
      {
        heading: `Worked example: ${programme.practiceContext}`,
        paragraphs: [
          `Imagine a learner is responsible for a ${programme.practiceContext} task involving ${week.focus}. The task arrives with incomplete information and a deadline. A weak response is to start immediately and fill gaps with assumptions. A stronger response is to identify the required outcome, check authority, gather the minimum reliable evidence and decide which checks must happen before the work is released or acted upon.`,
          `The learner should be able to explain what changed between the initial request and the final action. That explanation is part of the evidence of competent practice, not unnecessary administration.`,
        ],
      },
      {
        heading: 'Common failure points and controls',
        bullets: [
          `Watch for ${programme.risks}.`,
          'Use a second check where an error could materially affect a person, payment, record, service or decision.',
          'Do not treat a template, checklist or software output as a substitute for judgement.',
          'Stop when the task moves outside the learner’s authority, competence or reliable evidence.',
          'Review exceptions and repeated rework because they often reveal a process weakness.',
        ],
      },
      {
        heading: 'Evidence of learning and workplace transfer',
        paragraphs: [
          `Useful evidence may include ${programme.evidence}. The purpose is not to collect paperwork for its own sake. Evidence should help the learner demonstrate what was understood, what was done, why it was done and how the result was checked.`,
        ],
        bullets: [
          'Keep the record concise enough to use later.',
          'Name the source of important facts and assumptions.',
          'Record ownership and dates for follow-up actions.',
          'Use reflection to identify one improvement for the next similar task.',
        ],
      },
    ],
    activity: practicalActivity,
    assignment: applied ? {
      title: `${week.title} applied learning journal`,
      brief: `Produce a short evidence-based learning journal showing how you would apply ${week.title.toLowerCase()} to a realistic ${programme.practiceContext} situation. This is part of the learning, not an optional extra.`,
      deliverables: [
        'Describe the situation, intended outcome and people affected.',
        'Identify the relevant evidence and at least two assumptions or information gaps.',
        'Set out the chosen approach and why it is proportionate.',
        'Identify at least two risks or failure points and the controls you would use.',
        'State the owner, follow-up action and review point.',
      ],
      reflectionPrompt: `What would you do differently the next time you face a similar ${week.title.toLowerCase()} situation, and what evidence supports that change?`,
      minimumWords: 180,
      estimatedMinutes: 50,
    } : undefined,
    knowledgeCheck: checks[0],
    knowledgeChecks: checks,
  };
}

function makeAssessment(programme: ProgrammeBlueprint): AssessmentQuestion[] {
  return programme.weeks.flatMap((week, index) => [
    assessmentQuestion(
      `w${index + 1}a`,
      `Which approach best demonstrates competent practice in ${week.title.toLowerCase()}?`,
      ['Define the outcome, use relevant evidence, act proportionately and review the result.', 'Start with the preferred answer and collect supporting evidence afterwards.', 'Skip documentation whenever a deadline is close.', 'Treat every task as equally low risk.'],
      0,
      'Competent practice combines a defined outcome, relevant evidence, proportionate action and review.',
    ),
    assessmentQuestion(
      `w${index + 1}b`,
      `A learner finds an important information gap while working on ${week.lessonTwo.toLowerCase()}. What should they do?`,
      ['Identify the gap, assess its effect and obtain or escalate for the information before a material decision.', 'Invent a reasonable value so the task can be closed.', 'Delete the incomplete record.', 'Assume another person will notice later.'],
      0,
      'Important information gaps should be resolved or escalated before they undermine a material decision.',
    ),
    assessmentQuestion(
      `w${index + 1}c`,
      `What is the strongest evidence that learning from ${week.title.toLowerCase()} has transferred into practice?`,
      ['A completed piece of work with traceable evidence, reasoning, controls and review.', 'Remembering the module title.', 'Opening every page in the LMS.', 'Completing the course as quickly as possible.'],
      0,
      'Transfer is demonstrated through applied work and accountable reasoning, not page views or speed.',
    ),
  ]);
}

function createProgramme(programme: ProgrammeBlueprint): LibraryCourse {
  const modules: LibraryModule[] = programme.weeks.map((week, index) => ({
    id: `week-${index + 1}`,
    week: index + 1,
    title: `Week ${index + 1}: ${week.title}`,
    description: week.focus,
    lessons: [
      makeLesson(programme, week, index + 1, false),
      makeLesson(programme, week, index + 1, true),
    ],
  }));

  return {
    code: programme.code,
    slug: programme.slug,
    title: programme.title,
    category: programme.category,
    shortDescription: programme.shortDescription,
    overview: programme.overview,
    audience: programme.audience,
    prerequisites: programme.prerequisites,
    level: programme.level,
    featured: programme.featured,
    version: '2.0',
    reviewDate: 'August 2027',
    includedPlans: programme.core ? [...corePlans] : [...completePlans],
    studyPlan: {
      durationWeeks: 12,
      expectedHoursPerWeek: '3–4 hours',
      guidedLearningHours: 26,
      independentStudyHours: 18,
      totalQualificationTimeHours: 44,
      deliveryPattern: '12 weekly modules with taught lessons, applied workshops, learning-journal assignments, formative assessment and a capstone project.',
    },
    learningOutcomes: [
      `Explain the key principles, language and professional expectations within ${programme.category.toLowerCase()}.`,
      `Apply a structured method to realistic ${programme.practiceContext} work.`,
      'Evaluate evidence, assumptions, risk and competing options before making a decision.',
      'Create proportionate records that show ownership, reasoning, action and follow-up.',
      'Recognise when a task requires escalation, specialist advice or stronger controls.',
      'Use feedback, outcomes and exceptions to improve future practice.',
      'Complete a substantial capstone project that integrates learning from across the programme.',
    ],
    modules,
    finalAssessment: {
      title: `${programme.title} final assessment`,
      instructions: 'Complete all 36 questions after finishing every weekly module and applied learning-journal assignment. A score of 80% or higher is required. Questions test judgement and application across the full twelve-week programme, not simple recall.',
      passMark: 80,
      questions: makeAssessment(programme),
      estimatedMinutes: 90,
    },
    capstoneProject: {
      title: `${programme.title} capstone project`,
      brief: `Complete an integrated project demonstrating how the programme can be applied to a realistic ${programme.practiceContext} situation from initial scoping through evidence, decision, delivery, review and improvement.`,
      deliverables: [
        'A concise project or case brief defining the situation, outcome, stakeholders and constraints.',
        'An evidence log identifying sources, assumptions, gaps and material decisions.',
        'A practical plan or completed work product appropriate to the programme.',
        'A risk and controls section identifying foreseeable failure points and escalation routes.',
        'A review of the outcome against the original objective and evidence.',
        'A reflective improvement note identifying what would change in the next cycle and why.',
      ],
      estimatedHours: 6,
    },
    certificateStatement: `Certificate of completion: ${programme.title} — 12-week Sousa Murray eLearning programme.`,
    importantNotice: programme.notice,
  };
}

const programmes: ProgrammeBlueprint[] = [
  {
    code: 'SME-BUS-501', slug: 'business-and-enterprise', title: 'Business & Enterprise', category: 'Business and enterprise', level: 'Foundation', featured: true, core: true,
    shortDescription: 'Build, test, launch and improve a small business using customer evidence, commercial judgement and disciplined financial planning.',
    overview: 'A twelve-week practical programme taking a learner from opportunity discovery through customer research, value proposition, business modelling, pricing, cash flow, suppliers, risk, launch and performance review.',
    audience: ['People considering self-employment', 'New sole traders and company founders', 'Employees supporting a small-business or enterprise project'],
    prerequisites: 'No previous business qualification is required. Learners should bring a real or realistic business idea to develop through the weekly assignments.',
    practiceContext: 'small-business planning and launch', risks: 'weak demand evidence, unrealistic pricing, poor cash timing, supplier dependency, over-commitment and unrecorded decisions', evidence: 'customer interview notes, market evidence, cost calculations, cash forecasts, supplier checks, risk logs and launch measures',
    notice: 'This programme provides general business education. It is not legal, tax, accounting, investment or regulated financial advice.',
    weeks: [
      { title: 'Opportunity and problem discovery', lessonOne: 'Finding a problem worth solving', lessonTwo: 'Customer problem interviews', focus: 'Move from a vague idea to a specific customer problem supported by observable evidence.' },
      { title: 'Market research', lessonOne: 'Researching customers and markets', lessonTwo: 'Competitor and alternative analysis', focus: 'Use primary and secondary research without confusing market size with actual demand.' },
      { title: 'Value proposition', lessonOne: 'Designing a useful proposition', lessonTwo: 'Testing customer value', focus: 'Connect the customer problem, proposed outcome, differentiation and evidence of value.' },
      { title: 'Business model', lessonOne: 'How the business creates and delivers value', lessonTwo: 'Channels, partners and dependencies', focus: 'Map customers, delivery, resources, partners, revenue and operational dependencies as one system.' },
      { title: 'Pricing and unit economics', lessonOne: 'Costs, contribution and sustainable pricing', lessonTwo: 'Testing price with customers', focus: 'Calculate direct costs, contribution and pricing options while considering customer value and market conditions.' },
      { title: 'Cash-flow planning', lessonOne: 'Profit, cash and working capital', lessonTwo: 'Building a cash forecast', focus: 'Understand why profitable activity can still fail when cash arrives after obligations fall due.' },
      { title: 'Suppliers and service delivery', lessonOne: 'Selecting and managing suppliers', lessonTwo: 'Designing a reliable service process', focus: 'Control supplier dependency, service quality, capacity and hand-offs.' },
      { title: 'Records, responsibilities and controls', lessonOne: 'Business record keeping', lessonTwo: 'Authorities, approvals and basic governance', focus: 'Create practical records and decision controls that support continuity, accountability and compliance.' },
      { title: 'Risk and continuity', lessonOne: 'Identifying business risk', lessonTwo: 'Business continuity planning', focus: 'Prioritise risks by consequence and likelihood and prepare proportionate continuity actions.' },
      { title: 'Sales and customer acquisition', lessonOne: 'Building a route to market', lessonTwo: 'Running ethical sales conversations', focus: 'Turn a value proposition into a repeatable acquisition process without pressure selling or over-promising.' },
      { title: 'Ninety-day launch', lessonOne: 'Planning the launch', lessonTwo: 'Measures, owners and checkpoints', focus: 'Translate assumptions into actions, owners, measures and weekly review decisions.' },
      { title: 'Performance and growth', lessonOne: 'Reviewing business performance', lessonTwo: 'Choosing the next growth experiment', focus: 'Use evidence from sales, delivery, cash and customers to choose a controlled next stage.' },
    ],
  },
  {
    code: 'SME-SAL-501', slug: 'customer-service-and-sales', title: 'Customer Service & Sales', category: 'Customer service and sales', level: 'Foundation', featured: true, core: true,
    shortDescription: 'Deliver clear, fair and commercially effective customer service from first contact through complaints, recovery and responsible sales.',
    overview: 'A twelve-week customer-facing programme covering enquiry handling, telephone, email and live chat, expectations, vulnerability, complaints, difficult conversations, service recovery, ethical sales, objections, trust, retention and quality monitoring.',
    audience: ['Customer-service advisers', 'Sales advisers', 'Small-business owners', 'Team leaders supporting customer-facing teams'], prerequisites: 'No previous customer-service qualification is required.',
    practiceContext: 'customer enquiries, service decisions and sales conversations', risks: 'misunderstanding the customer, poor records, pressure selling, inconsistent treatment, unresolved complaints and over-promising', evidence: 'contact notes, agreed actions, complaint timelines, quality reviews, feedback, sales rationale and follow-up records',
    notice: 'Organisation-specific consumer, vulnerability, complaints, safeguarding and escalation procedures must still be followed.',
    weeks: [
      { title: 'Customer service foundations', lessonOne: 'Understanding needs and outcomes', lessonTwo: 'Building a professional service standard', focus: 'Define what good service means in terms of accuracy, fairness, ownership and outcome.' },
      { title: 'Listening and questioning', lessonOne: 'Active listening', lessonTwo: 'Asking questions that clarify the real need', focus: 'Gather enough information to understand the request without making assumptions.' },
      { title: 'Telephone service', lessonOne: 'Structuring professional calls', lessonTwo: 'Call control, notes and follow-up', focus: 'Manage telephone conversations confidently while keeping accurate records and clear next actions.' },
      { title: 'Written and digital service', lessonOne: 'Email customer service', lessonTwo: 'Live chat and messaging', focus: 'Use concise, accessible and professional written communication across digital channels.' },
      { title: 'Expectations and boundaries', lessonOne: 'Setting realistic expectations', lessonTwo: 'Saying no or limiting scope professionally', focus: 'Make commitments that can actually be delivered and explain constraints without creating avoidable conflict.' },
      { title: 'Vulnerability and fair treatment', lessonOne: 'Recognising signs of vulnerability', lessonTwo: 'Adapting communication and support', focus: 'Respond fairly and proportionately to customer circumstances while following authorised support routes.' },
      { title: 'Complaints', lessonOne: 'Understanding and recording complaints', lessonTwo: 'Investigating and responding', focus: 'Separate dissatisfaction from fact-finding, identify the desired outcome and keep an auditable complaint record.' },
      { title: 'Difficult conversations', lessonOne: 'De-escalation and boundaries', lessonTwo: 'Managing disagreement without losing the issue', focus: 'Keep conversations safe, respectful and focused on what can actually be resolved.' },
      { title: 'Service recovery', lessonOne: 'Putting things right', lessonTwo: 'Learning from service failure', focus: 'Choose proportionate remedies and use recurring failure as evidence for service improvement.' },
      { title: 'Ethical sales', lessonOne: 'Needs-based selling', lessonTwo: 'Responsible cross-selling and objections', focus: 'Recommend an option because it fits the customer need, not merely because it increases transaction value.' },
      { title: 'Trust and retention', lessonOne: 'Building customer trust', lessonTwo: 'After-sales service and retention', focus: 'Use reliable delivery, follow-up and transparency to support longer-term relationships.' },
      { title: 'Service quality', lessonOne: 'Quality monitoring and feedback', lessonTwo: 'Designing a service improvement plan', focus: 'Combine customer feedback, quality evidence and operational measures to improve the service.' },
    ],
  },
  {
    code: 'SME-DAI-501', slug: 'digital-skills-and-ai-at-work', title: 'Digital Skills & AI at Work', category: 'Digital skills and AI', level: 'Foundation', featured: true, core: true,
    shortDescription: 'Use modern digital tools and generative AI productively while protecting accuracy, privacy, accessibility and human accountability.',
    overview: 'A twelve-week programme covering digital confidence, online research, generative AI, prompting, verification, responsible use, writing, customer service, productivity, collaboration, automation awareness and accessible digital work.',
    audience: ['Employees using digital tools', 'Managers', 'Small-business owners', 'People introducing AI-assisted working'], prerequisites: 'No technical background is required. Access to common workplace digital tools is useful for practice.',
    practiceContext: 'digital and AI-assisted workplace tasks', risks: 'unverified information, inappropriate disclosure, over-automation, inaccessible content, weak source checking, unsafe sharing and loss of human accountability', evidence: 'source notes, prompt records, reviewed outputs, version history, accessibility checks, decision logs and human approval records',
    notice: 'This programme does not approve a particular AI service and does not replace privacy, security, professional or organisation-specific controls.',
    weeks: [
      { title: 'Digital confidence', lessonOne: 'Understanding modern digital work', lessonTwo: 'Choosing the right tool for the task', focus: 'Build confidence in selecting and using common digital tools without letting the tool dictate the process.' },
      { title: 'Online research', lessonOne: 'Search strategy and source quality', lessonTwo: 'Verifying claims and keeping source notes', focus: 'Find information efficiently and judge authority, date, relevance and corroboration.' },
      { title: 'Generative AI foundations', lessonOne: 'How generative AI works and fails', lessonTwo: 'Choosing appropriate AI-assisted tasks', focus: 'Use a risk-based mental model rather than treating fluent output as verified truth.' },
      { title: 'Prompt design', lessonOne: 'Goals, context, constraints and format', lessonTwo: 'Iterative prompting and decomposition', focus: 'Write prompts that are specific enough to produce reviewable work and break larger tasks into checkable stages.' },
      { title: 'AI output verification', lessonOne: 'Fact, calculation and source checking', lessonTwo: 'Bias, completeness and reasoning review', focus: 'Apply layered human review before an AI-assisted output is relied upon or shared.' },
      { title: 'Responsible AI', lessonOne: 'Privacy, confidentiality and ownership', lessonTwo: 'Accountability and high-consequence decisions', focus: 'Keep protected information out of unauthorised tools and retain human responsibility for material decisions.' },
      { title: 'AI for writing and editing', lessonOne: 'Drafting with AI', lessonTwo: 'Editing, tone and human authorship', focus: 'Use AI to accelerate drafting without losing accuracy, voice, accessibility or ownership.' },
      { title: 'AI for service and business work', lessonOne: 'AI-assisted customer service', lessonTwo: 'AI-assisted planning and analysis', focus: 'Use AI as an assistant for bounded work while preserving evidence, review and human judgement.' },
      { title: 'Digital productivity', lessonOne: 'Files, notes and personal organisation', lessonTwo: 'Collaboration and task systems', focus: 'Build a digital working system that reduces lost information, duplication and unclear ownership.' },
      { title: 'Automation awareness', lessonOne: 'What should and should not be automated', lessonTwo: 'Designing human checkpoints', focus: 'Automate repetitive work only when inputs, exceptions, ownership and review are well controlled.' },
      { title: 'Data and visual communication', lessonOne: 'Working with simple data', lessonTwo: 'Charts, dashboards and misleading presentation', focus: 'Present information clearly without exaggerating certainty or hiding important context.' },
      { title: 'Digital accessibility and improvement', lessonOne: 'Accessible digital content', lessonTwo: 'Designing a responsible digital workflow', focus: 'Make digital work usable by more people and build accessibility, security and review into normal practice.' },
    ],
  },
  {
    code: 'SME-M36-501', slug: 'microsoft-365-productivity', title: 'Microsoft 365 Productivity', category: 'Microsoft 365 and office skills', level: 'Intermediate', core: false,
    shortDescription: 'Use Microsoft 365 as a joined-up productivity environment for documents, data, communication, collaboration and controlled information sharing.',
    overview: 'A twelve-week practical programme covering Word, Excel, PowerPoint, Outlook, Teams, OneDrive, SharePoint, Forms, Lists, Planner, Loop, Bookings, accessibility and quality control.',
    audience: ['Microsoft 365 users', 'Administrative staff', 'Managers', 'People producing workplace documents, spreadsheets and collaborative work'], prerequisites: 'Learners should have access to Microsoft 365 and basic experience opening, editing and saving Office files.',
    practiceContext: 'Microsoft 365 workplace collaboration and information management', risks: 'duplicate files, uncontrolled sharing, broken formulas, poor permissions, inaccessible documents, confusing formatting and weak version control', evidence: 'structured files, permissions, version history, formulas, review notes, accessible documents and collaboration records',
    notice: 'Microsoft 365 features change over time. Learners must follow their organisation’s tenant configuration, security and sharing rules.',
    weeks: [
      { title: 'Microsoft 365 working model', lessonOne: 'Choosing the right Microsoft 365 application', lessonTwo: 'Files, cloud storage and version control', focus: 'Understand how Microsoft 365 applications fit together and avoid duplicate or uncontrolled information.' },
      { title: 'Microsoft Word', lessonOne: 'Professional document structure and styles', lessonTwo: 'Long documents, review and collaboration', focus: 'Create maintainable Word documents using styles, navigation, review and collaboration tools.' },
      { title: 'Microsoft Excel foundations', lessonOne: 'Structured data and tables', lessonTwo: 'Formulas, references and error checking', focus: 'Build spreadsheets that separate inputs, calculations and outputs and can be reviewed by another person.' },
      { title: 'Microsoft Excel analysis', lessonOne: 'Sorting, filtering and data quality', lessonTwo: 'Charts and summary reporting', focus: 'Turn structured data into accurate, appropriately presented information.' },
      { title: 'Microsoft PowerPoint', lessonOne: 'Designing a presentation around the message', lessonTwo: 'Slides, visuals and presenter support', focus: 'Create presentations that help an audience understand rather than simply decorate information.' },
      { title: 'Microsoft Outlook', lessonOne: 'Email, calendar and task discipline', lessonTwo: 'Rules, categories and professional communication', focus: 'Use Outlook to manage commitments without letting the inbox become the work plan.' },
      { title: 'Microsoft Teams', lessonOne: 'Chats, channels and meetings', lessonTwo: 'Files, collaboration and meeting follow-up', focus: 'Choose the correct Teams space and turn conversations into durable actions and records.' },
      { title: 'OneDrive and SharePoint', lessonOne: 'Personal and team file storage', lessonTwo: 'Permissions, links and document libraries', focus: 'Store and share information through the correct location with proportionate access.' },
      { title: 'Forms and Lists', lessonOne: 'Designing useful Microsoft Forms', lessonTwo: 'Tracking structured work with Microsoft Lists', focus: 'Collect and manage structured information without creating unnecessary manual re-entry.' },
      { title: 'Planner, Loop and collaborative work', lessonOne: 'Planning work in Microsoft Planner', lessonTwo: 'Collaborative components with Microsoft Loop', focus: 'Make ownership and progress visible while keeping collaborative information understandable.' },
      { title: 'Bookings and workflow design', lessonOne: 'Microsoft Bookings and external scheduling', lessonTwo: 'Designing a joined-up Microsoft 365 workflow', focus: 'Connect tools around a real process rather than using each application in isolation.' },
      { title: 'Accessibility and quality assurance', lessonOne: 'Creating accessible Office content', lessonTwo: 'Final quality, permissions and sharing review', focus: 'Use accessibility checks and a repeatable quality review before work is distributed.' },
    ],
  },
  {
    code: 'SME-WRK-501', slug: 'workplace-professional-practice', title: 'Workplace Professional Practice', category: 'Workplace essentials', level: 'Foundation', core: true,
    shortDescription: 'Develop reliable day-to-day working habits covering conduct, organisation, records, handovers, priorities, confidentiality and quality.',
    overview: 'A twelve-week programme for new starters and developing employees who need a dependable system for professional conduct, procedures, workload, teamwork, records, remote work, escalation and continuous improvement.',
    audience: ['Employees', 'Volunteers', 'New starters', 'Supervisors supporting routine operational work'], prerequisites: 'No previous formal workplace training is required.',
    practiceContext: 'day-to-day workplace tasks and handovers', risks: 'missed instructions, poor ownership, incomplete handovers, unmanaged workload, confidentiality failures and avoidable quality errors', evidence: 'task records, handover notes, completed checks, issue logs, schedules, quality records and follow-up actions',
    notice: 'Learners must also follow organisation-specific procedures, confidentiality, safety and escalation requirements.',
    weeks: [
      { title: 'Professional conduct', lessonOne: 'Standards, behaviour and accountability', lessonTwo: 'Professional boundaries and judgement', focus: 'Understand the behaviours that create trust and the boundaries that protect staff, customers and the organisation.' },
      { title: 'Workplace organisation', lessonOne: 'Building an organised work system', lessonTwo: 'Files, tasks and information retrieval', focus: 'Create a repeatable system so important work and information can be found and followed up.' },
      { title: 'Following procedures', lessonOne: 'Reading and applying procedures', lessonTwo: 'Handling exceptions and uncertainty', focus: 'Use procedures as controlled guidance while recognising when an exception needs escalation.' },
      { title: 'Instructions and ownership', lessonOne: 'Clarifying instructions', lessonTwo: 'Confirming ownership, deadlines and completion', focus: 'Remove ambiguity before starting work and make responsibility visible.' },
      { title: 'Task prioritisation', lessonOne: 'Urgency, importance and consequence', lessonTwo: 'Managing competing priorities', focus: 'Prioritise based on consequence and commitment rather than whoever asks most loudly.' },
      { title: 'Workload management', lessonOne: 'Planning realistic capacity', lessonTwo: 'Raising workload risks early', focus: 'Balance commitments and escalate overload before quality or safety deteriorates.' },
      { title: 'Handovers', lessonOne: 'Effective task and shift handovers', lessonTwo: 'Continuity across teams', focus: 'Transfer the information, status, risk and ownership another person genuinely needs.' },
      { title: 'Workplace records', lessonOne: 'Accurate record keeping', lessonTwo: 'Traceability and confidentiality', focus: 'Create proportionate records while protecting sensitive information and maintaining traceability.' },
      { title: 'Teamworking', lessonOne: 'Working effectively with others', lessonTwo: 'Resolving everyday team friction', focus: 'Coordinate dependencies, share relevant information and address problems without personalising them.' },
      { title: 'Remote and hybrid work', lessonOne: 'Working independently at a distance', lessonTwo: 'Remote communication and visibility', focus: 'Maintain accountability, security and communication when colleagues are not physically together.' },
      { title: 'Problem solving and escalation', lessonOne: 'Defining the real problem', lessonTwo: 'Escalating at the right time', focus: 'Separate symptoms from causes and recognise limits of authority, evidence and competence.' },
      { title: 'Quality and improvement', lessonOne: 'Checking work before completion', lessonTwo: 'Continuous improvement in everyday work', focus: 'Use errors, exceptions and feedback to improve the next cycle rather than repeat avoidable rework.' },
    ],
  },
  {
    code: 'SME-LDR-501', slug: 'leadership-and-people-management', title: 'Leadership & People Management', category: 'Leadership and management', level: 'Intermediate', core: false,
    shortDescription: 'Lead people through clear expectations, delegation, feedback, coaching, performance conversations, inclusion and accountable follow-up.',
    overview: 'A twelve-week programme for first-time and developing managers covering leadership foundations, expectations, delegation, one-to-ones, feedback, coaching, motivation, performance, conflict, change, inclusion, remote leadership and management records.',
    audience: ['First-time managers', 'Team leaders', 'Supervisors', 'People preparing for management responsibility'], prerequisites: 'Some experience working in a team is recommended.',
    practiceContext: 'people-management and team-leadership decisions', risks: 'unclear expectations, inconsistent treatment, avoidance of difficult conversations, weak delegation, poor records and assumption-led decisions', evidence: 'objectives, one-to-one notes, feedback records, action plans, performance evidence, delegation records and review dates',
    notice: 'This programme does not replace organisation-specific HR, employment-law, safeguarding, disciplinary or grievance procedures.',
    weeks: [
      { title: 'The manager role', lessonOne: 'From individual contributor to manager', lessonTwo: 'Authority, accountability and trust', focus: 'Understand the change in responsibility when success depends on enabling other people to deliver.' },
      { title: 'Expectations and objectives', lessonOne: 'Setting clear expectations', lessonTwo: 'Turning outcomes into measurable objectives', focus: 'Make standards, priorities and definitions of done explicit rather than assumed.' },
      { title: 'Delegation', lessonOne: 'Choosing what and how to delegate', lessonTwo: 'Control without micromanagement', focus: 'Match responsibility, authority, capability and review so delegated work remains accountable.' },
      { title: 'One-to-one meetings', lessonOne: 'Running useful one-to-ones', lessonTwo: 'Following up commitments', focus: 'Use regular conversations to support delivery, development, wellbeing and accountability.' },
      { title: 'Feedback', lessonOne: 'Giving constructive feedback', lessonTwo: 'Receiving and using feedback as a manager', focus: 'Discuss observable behaviour and impact while creating a clear next action.' },
      { title: 'Coaching', lessonOne: 'Coaching questions and listening', lessonTwo: 'Building ownership of solutions', focus: 'Help team members think through problems rather than making the manager the answer to every question.' },
      { title: 'Motivation and team climate', lessonOne: 'Understanding motivation', lessonTwo: 'Building psychological safety with accountability', focus: 'Create conditions where people can raise concerns, ask questions and still be responsible for delivery.' },
      { title: 'Performance management', lessonOne: 'Using evidence to discuss performance', lessonTwo: 'Creating a fair improvement plan', focus: 'Separate fact from assumption and address performance early, consistently and proportionately.' },
      { title: 'Conflict', lessonOne: 'Recognising sources of team conflict', lessonTwo: 'Facilitating a constructive resolution', focus: 'Focus on the work, interests and evidence rather than personalities or blame.' },
      { title: 'Leading change', lessonOne: 'Explaining change and uncertainty', lessonTwo: 'Supporting adoption and feedback', focus: 'Give people enough context to act while keeping feedback and unintended effects visible.' },
      { title: 'Inclusive and remote leadership', lessonOne: 'Inclusive leadership decisions', lessonTwo: 'Leading remote and hybrid teams', focus: 'Design communication, participation and accountability so location or difference does not unfairly reduce access.' },
      { title: 'Management judgement and records', lessonOne: 'Making accountable management decisions', lessonTwo: 'Management records and reflective improvement', focus: 'Keep proportionate evidence of important decisions and use outcomes to improve management practice.' },
    ],
  },
  {
    code: 'SME-OPS-501', slug: 'project-and-operations-management', title: 'Project & Operations Management', category: 'Project and operational skills', level: 'Intermediate', core: false,
    shortDescription: 'Plan, control and improve projects and operational work through scope, schedules, ownership, risks, change and measurable performance.',
    overview: 'A twelve-week programme covering project scoping, planning, schedules, stakeholders, risks, status reporting, change control, handover, operational planning, SOPs, process mapping, root-cause analysis, capacity and performance.',
    audience: ['Project team members', 'Operations staff', 'Managers', 'People improving workflows or services'], prerequisites: 'Basic workplace experience is useful; no formal project qualification is required.',
    practiceContext: 'project delivery and operational workflow improvement', risks: 'scope drift, hidden dependencies, weak ownership, unmanaged change, inaccurate status reporting, poor handover and repeated process failures', evidence: 'project briefs, schedules, risk logs, action trackers, process maps, status reports, decision records and closure notes',
    notice: 'Sector-specific technical, safety, contractual and regulatory controls may require additional training.',
    weeks: [
      { title: 'Scope and outcomes', lessonOne: 'Defining project or operational outcomes', lessonTwo: 'Scope boundaries and assumptions', focus: 'Create a shared definition of what will and will not be delivered and what assumptions need validation.' },
      { title: 'Planning and work breakdown', lessonOne: 'Breaking outcomes into deliverable work', lessonTwo: 'Ownership and dependencies', focus: 'Turn a broad objective into manageable work with visible ownership and dependencies.' },
      { title: 'Scheduling', lessonOne: 'Estimating and sequencing work', lessonTwo: 'Milestones, constraints and critical dependencies', focus: 'Build a schedule that reflects real dependencies and capacity rather than optimistic dates alone.' },
      { title: 'Stakeholders', lessonOne: 'Identifying stakeholder needs and influence', lessonTwo: 'Planning communication and decisions', focus: 'Engage the right people at the right time without allowing stakeholder noise to replace governance.' },
      { title: 'Risk management', lessonOne: 'Identifying and assessing project risk', lessonTwo: 'Controls, contingencies and owners', focus: 'Make risks actionable by linking them to controls, owners, triggers and review dates.' },
      { title: 'Status and reporting', lessonOne: 'Measuring real progress', lessonTwo: 'Writing useful status reports', focus: 'Report evidence, forecast and decisions rather than simply describing activity.' },
      { title: 'Change control', lessonOne: 'Recognising material change', lessonTwo: 'Assessing impact before approval', focus: 'Prevent hidden scope growth by evaluating time, cost, risk and benefit before change is accepted.' },
      { title: 'Handover and closure', lessonOne: 'Planning operational handover', lessonTwo: 'Closure, lessons and outstanding actions', focus: 'Transfer ownership properly and distinguish project closure from unresolved operational work.' },
      { title: 'Operational planning', lessonOne: 'Designing repeatable operational work', lessonTwo: 'Capacity and resource planning', focus: 'Match workload, resources, standards and demand so delivery can remain reliable.' },
      { title: 'Processes and SOPs', lessonOne: 'Process mapping', lessonTwo: 'Writing usable standard operating procedures', focus: 'Make the real workflow visible and document controls without creating unusable bureaucracy.' },
      { title: 'Problem analysis', lessonOne: 'Incident review and root-cause analysis', lessonTwo: 'Corrective and preventive actions', focus: 'Investigate why a problem occurred and design actions that address causes rather than symptoms.' },
      { title: 'Performance and improvement', lessonOne: 'Operational measures and dashboards', lessonTwo: 'Building an improvement cycle', focus: 'Use a balanced set of measures and review whether changes actually improve the outcome.' },
    ],
  },
  {
    code: 'SME-COM-501', slug: 'communication-and-collaboration', title: 'Communication & Collaboration', category: 'Communication and collaboration', level: 'Foundation', core: true,
    shortDescription: 'Communicate clearly across writing, email, calls, meetings, reports, presentations, conflict, negotiation and cross-team work.',
    overview: 'A twelve-week programme developing clear written and verbal communication, listening, questions, instructions, meetings, minutes, presentations, reports, change communication, conflict resolution, negotiation and stakeholder communication.',
    audience: ['Employees', 'Managers', 'Customer-facing staff', 'People producing written or verbal workplace communications'], prerequisites: 'No previous formal communications training is required.',
    practiceContext: 'workplace communication and collaborative decision-making', risks: 'ambiguity, inaccessible communication, unnecessary conflict, missing context, undocumented decisions and unclear ownership', evidence: 'emails, briefing notes, meeting records, reports, presentations, agreed actions, feedback and communication plans',
    notice: 'Organisation-specific confidentiality, records-management, accessibility and approved-channel requirements still apply.',
    weeks: [
      { title: 'Clear communication', lessonOne: 'Purpose, audience and message', lessonTwo: 'Structure, tone and plain language', focus: 'Design communication around what the audience needs to understand or do next.' },
      { title: 'Listening and questions', lessonOne: 'Active listening', lessonTwo: 'Asking better questions', focus: 'Improve understanding before offering solutions or making decisions.' },
      { title: 'Professional email and messaging', lessonOne: 'Writing effective email', lessonTwo: 'Digital tone and channel choice', focus: 'Write concise messages with enough context, ownership and action while choosing the appropriate channel.' },
      { title: 'Telephone and verbal communication', lessonOne: 'Structuring verbal conversations', lessonTwo: 'Checking understanding and follow-up', focus: 'Use signposting, summaries and explicit next actions in live conversations.' },
      { title: 'Instructions and briefings', lessonOne: 'Giving clear instructions', lessonTwo: 'Writing briefing notes', focus: 'Translate objectives into instructions and concise briefings that another person can act upon.' },
      { title: 'Meetings', lessonOne: 'Planning and running effective meetings', lessonTwo: 'Minutes, decisions and actions', focus: 'Use meetings for decisions, coordination and problem solving rather than passive information exchange.' },
      { title: 'Reports', lessonOne: 'Structuring workplace reports', lessonTwo: 'Using evidence and recommendations', focus: 'Separate evidence, analysis, conclusion and recommendation so the reader can evaluate the reasoning.' },
      { title: 'Presentations', lessonOne: 'Designing the presentation story', lessonTwo: 'Presenting with confidence and handling questions', focus: 'Help an audience understand a decision or idea through clear structure and evidence.' },
      { title: 'Change and difficult news', lessonOne: 'Communicating change', lessonTwo: 'Communicating bad news professionally', focus: 'Be clear about what is known, what changes, what remains uncertain and what support or action follows.' },
      { title: 'Conflict resolution', lessonOne: 'Understanding disagreement', lessonTwo: 'Collaborative problem solving', focus: 'Separate positions from underlying needs and use evidence to move toward a workable outcome.' },
      { title: 'Negotiation', lessonOne: 'Preparing for negotiation', lessonTwo: 'Options, trade-offs and agreement', focus: 'Define priorities, limits and alternatives before negotiating and record the actual agreement.' },
      { title: 'Stakeholder communication', lessonOne: 'Working across teams and senior stakeholders', lessonTwo: 'Building a communication plan', focus: 'Tailor detail and timing without changing the truth or losing accountability.' },
    ],
  },
  {
    code: 'SME-DEV-501', slug: 'personal-effectiveness-and-professional-development', title: 'Personal Effectiveness & Professional Development', category: 'Personal development', level: 'Intermediate', core: false,
    shortDescription: 'Build a practical personal system for priorities, focus, decisions, learning, reflection, resilience and consistent professional development.',
    overview: 'A twelve-week programme covering time management, productivity systems, goals, habits, focus, organisation, decision making, critical thinking, creativity, confidence, resilience, reflective practice and development planning.',
    audience: ['Employees', 'Managers', 'Jobseekers', 'People developing their personal effectiveness'], prerequisites: 'No formal qualification is required; learners should be willing to keep a weekly reflection and action record.',
    practiceContext: 'personal workload, learning and professional development', risks: 'unrealistic planning, vague goals, distraction, avoidance, overloaded commitments, poor reflection and relying on motivation instead of systems', evidence: 'goals, schedules, review notes, decision records, learning journals, reflection and measurable progress',
    notice: 'This programme provides general personal-development education and is not medical, psychological or therapeutic advice.',
    weeks: [
      { title: 'Personal operating system', lessonOne: 'Understanding commitments and capacity', lessonTwo: 'Designing a trusted personal system', focus: 'Move commitments out of memory and into a reliable system that supports decisions and follow-up.' },
      { title: 'Time and priorities', lessonOne: 'Time management principles', lessonTwo: 'Prioritising by consequence and value', focus: 'Choose what deserves attention rather than simply reacting to urgency.' },
      { title: 'Goals', lessonOne: 'Turning intentions into clear outcomes', lessonTwo: 'Milestones, measures and review', focus: 'Create goals that guide decisions and can be reviewed against evidence.' },
      { title: 'Habits and consistency', lessonOne: 'How habits are built', lessonTwo: 'Designing prompts, friction and recovery', focus: 'Use environment and routine to support consistent action instead of relying on motivation.' },
      { title: 'Focus and distractions', lessonOne: 'Attention and deep work', lessonTwo: 'Managing digital and environmental distractions', focus: 'Protect focused time for important work and reduce unnecessary context switching.' },
      { title: 'Personal organisation', lessonOne: 'Tasks, notes and information', lessonTwo: 'Weekly review and reset', focus: 'Keep a system current enough to trust and create a regular review cycle.' },
      { title: 'Decision making', lessonOne: 'Defining decisions and options', lessonTwo: 'Bias, assumptions and trade-offs', focus: 'Make important decisions explicit and test assumptions before committing.' },
      { title: 'Critical thinking', lessonOne: 'Claims, evidence and reasoning', lessonTwo: 'Challenging weak arguments', focus: 'Judge the quality of evidence and whether conclusions actually follow from it.' },
      { title: 'Creative problem solving', lessonOne: 'Generating options', lessonTwo: 'Testing and selecting ideas', focus: 'Separate idea generation from evaluation and test promising options cheaply.' },
      { title: 'Confidence and resilience', lessonOne: 'Professional confidence through preparation', lessonTwo: 'Responding to setbacks constructively', focus: 'Build confidence from competence, preparation and recovery rather than pretending uncertainty does not exist.' },
      { title: 'Learning and reflection', lessonOne: 'Learning how to learn', lessonTwo: 'Reflective practice', focus: 'Use retrieval, practice, feedback and reflection to convert experience into improved capability.' },
      { title: 'Professional development', lessonOne: 'Building a development plan', lessonTwo: 'Evidence of growth and next steps', focus: 'Choose development priorities based on role needs, evidence and realistic opportunities to practise.' },
    ],
  },
  {
    code: 'SME-SEC-501', slug: 'cybersecurity-and-information-management', title: 'Cybersecurity & Information Management', category: 'Cybersecurity and information management', level: 'Foundation', featured: true, core: true,
    shortDescription: 'Protect accounts, devices, information and cloud work through secure behaviour, verification, incident reporting and recoverable working practices.',
    overview: 'A twelve-week cybersecurity programme covering threat awareness, social engineering, phishing, passwords, MFA, passkeys, devices, email, browsing, classification, file sharing, access control, cloud work, backups and incident response.',
    audience: ['Employees using digital systems', 'Small-business owners', 'Managers', 'People handling business or personal information'], prerequisites: 'No technical background is required.',
    practiceContext: 'everyday cybersecurity and information-handling decisions', risks: 'phishing, stolen credentials, inappropriate sharing, excessive access, lost devices, malware, untested recovery and delayed incident reporting', evidence: 'access records, incident reports, security checks, approved storage, sharing permissions, recovery tests and escalation records',
    notice: 'This programme is general cybersecurity education and does not replace technical controls, specialist security advice or organisation-specific incident procedures.',
    weeks: [
      { title: 'Cyber risk foundations', lessonOne: 'How cyber incidents happen', lessonTwo: 'People, process and technology controls', focus: 'Understand threat, vulnerability, consequence and why everyday behaviour forms part of the control environment.' },
      { title: 'Social engineering', lessonOne: 'Manipulation, urgency and impersonation', lessonTwo: 'Verifying unusual requests', focus: 'Recognise pressure tactics and verify important requests through a separate trusted route.' },
      { title: 'Phishing', lessonOne: 'Phishing across email, text, calls and messaging', lessonTwo: 'Safe handling and reporting', focus: 'Respond consistently to suspicious contact without increasing exposure or destroying useful evidence.' },
      { title: 'Passwords and authentication', lessonOne: 'Unique credentials and password managers', lessonTwo: 'MFA, passkeys and recovery', focus: 'Reduce the spread of credential compromise and protect account recovery routes.' },
      { title: 'Device security', lessonOne: 'Updates, locking and approved software', lessonTwo: 'Mobile devices and removable media', focus: 'Keep devices protected against known weaknesses and loss or unauthorised access.' },
      { title: 'Email and web security', lessonOne: 'Safer email behaviour', lessonTwo: 'Safer web browsing and downloads', focus: 'Recognise risky destinations, attachments and downloads before interacting.' },
      { title: 'Information classification', lessonOne: 'Understanding information sensitivity', lessonTwo: 'Handling information proportionately', focus: 'Match storage, access and sharing controls to the sensitivity and purpose of the information.' },
      { title: 'Secure file sharing', lessonOne: 'Links, recipients and permissions', lessonTwo: 'Preventing oversharing', focus: 'Share only with intended recipients and keep access no wider or longer than necessary.' },
      { title: 'Access control', lessonOne: 'Least privilege and role-based access', lessonTwo: 'Joining, moving and leaving', focus: 'Give people the access needed for their role and remove access when circumstances change.' },
      { title: 'Cloud and remote security', lessonOne: 'Secure cloud working', lessonTwo: 'Remote and home-working risks', focus: 'Protect accounts, devices, networks and information when work happens outside a controlled office.' },
      { title: 'Backups and recovery', lessonOne: 'What a useful backup requires', lessonTwo: 'Recovery testing and continuity', focus: 'Treat recovery as a tested capability rather than assuming a backup exists somewhere.' },
      { title: 'Incident response', lessonOne: 'Recognising and reporting incidents', lessonTwo: 'Containment, evidence and learning', focus: 'Report early, preserve relevant information and follow authorised containment and recovery instructions.' },
    ],
  },
  {
    code: 'SME-GOV-501', slug: 'governance-compliance-and-data-protection', title: 'Governance, Compliance & Data Protection', category: 'Compliance and governance awareness', level: 'Intermediate', core: false,
    shortDescription: 'Support lawful, fair and accountable organisational decisions through data protection, governance controls, records, complaints, risk and audit trails.',
    overview: 'A twelve-week programme covering governance, policies, delegated authority, data protection, privacy by design, subject access, breaches, records, conflicts, anti-bribery, fraud, whistleblowing, equality, consumer fairness, complaints, risk registers and compliance monitoring.',
    audience: ['Employees', 'Managers', 'Business owners', 'People supporting governance, compliance or controlled processes'], prerequisites: 'No legal qualification is required; learners should understand that specialist advice may still be necessary.',
    practiceContext: 'governance, compliance and data-handling decisions', risks: 'acting outside authority, weak records, excessive data, undisclosed conflicts, inconsistent treatment, missed requests and failure to escalate', evidence: 'policies, registers, audit trails, approvals, request logs, complaint files, risk records and documented decisions',
    notice: 'This programme provides general governance and compliance education and is not legal advice. Applicable law, regulator guidance and organisation-specific procedures must be checked.',
    weeks: [
      { title: 'Governance foundations', lessonOne: 'Authority, accountability and control', lessonTwo: 'Policies, procedures and exceptions', focus: 'Understand who is authorised to decide, which controls apply and how exceptions should be recorded.' },
      { title: 'Data protection principles', lessonOne: 'Purpose, fairness and data minimisation', lessonTwo: 'Accountability and transparency', focus: 'Use personal data only for a clear purpose and keep enough evidence to demonstrate responsible handling.' },
      { title: 'Privacy by design', lessonOne: 'Building privacy into processes', lessonTwo: 'Risk assessment and proportionality', focus: 'Identify privacy effects before a new process or change is embedded.' },
      { title: 'Information rights', lessonOne: 'Subject access awareness', lessonTwo: 'Identity, scope, search and response controls', focus: 'Recognise information-rights requests and preserve them for authorised handling.' },
      { title: 'Personal data breaches', lessonOne: 'Recognising a breach', lessonTwo: 'Containment, escalation and evidence', focus: 'Report personal-data incidents promptly and preserve enough information for assessment and response.' },
      { title: 'Records governance', lessonOne: 'Retention and records management', lessonTwo: 'Secure disposal and traceability', focus: 'Keep records for a justified period and dispose of them securely when no longer needed.' },
      { title: 'Conflicts and integrity', lessonOne: 'Conflicts of interest', lessonTwo: 'Anti-bribery and corruption awareness', focus: 'Identify personal interests or improper influence before they distort an organisational decision.' },
      { title: 'Fraud and whistleblowing', lessonOne: 'Fraud awareness and warning signs', lessonTwo: 'Raising concerns through protected routes', focus: 'Recognise suspicious patterns and preserve concerns for authorised investigation.' },
      { title: 'Equality and fair treatment', lessonOne: 'Equality and harassment awareness', lessonTwo: 'Reasonable adjustments and inclusion', focus: 'Make decisions based on relevant factors and recognise when support or adjustment may be required.' },
      { title: 'Consumer fairness', lessonOne: 'Clear information and fair customer treatment', lessonTwo: 'Avoiding misleading or unfair practice', focus: 'Ensure customer-facing decisions and information are clear, supportable and not exploitative.' },
      { title: 'Complaints and audit trails', lessonOne: 'Complaints governance', lessonTwo: 'Creating a defensible audit trail', focus: 'Show what happened, what evidence was considered, what decision was made and how it was reviewed.' },
      { title: 'Risk and compliance monitoring', lessonOne: 'Risk registers and controls', lessonTwo: 'Monitoring, assurance and improvement', focus: 'Use risk and compliance evidence to test whether controls actually operate as intended.' },
    ],
  },
  {
    code: 'SME-SAF-501', slug: 'workplace-safety-and-wellbeing', title: 'Workplace Safety & Wellbeing', category: 'Safety and wellbeing awareness', level: 'Foundation', core: true,
    shortDescription: 'Recognise workplace hazards, follow controls, respond to emergencies and support safer everyday working without replacing role-specific practical training.',
    overview: 'A twelve-week safety-awareness programme covering hazard identification, risk assessment, manual handling, fire, emergencies, slips and falls, DSE, lone work, home work, stress, fatigue, first-aid awareness, incident reporting, equipment, ergonomics and safety communication.',
    audience: ['Employees and volunteers', 'New starters', 'Supervisors', 'Small-business owners requiring general awareness'], prerequisites: 'No previous formal safety training is required.',
    practiceContext: 'everyday workplace safety and wellbeing situations', risks: 'unrecognised hazards, bypassed controls, fatigue, poor ergonomics, unsafe equipment, weak emergency response and under-reporting', evidence: 'risk controls, workplace checks, incident reports, near-miss reports, briefings and documented follow-up',
    notice: 'This is general awareness training and does not replace risk assessments, practical instruction, competent-person advice, first-aid training or role-specific safety training.',
    weeks: [
      { title: 'Safety foundations', lessonOne: 'Hazards, harm and control', lessonTwo: 'Personal responsibility and stop-work decisions', focus: 'Recognise hazards early and understand that controls must work in the real task, not only on paper.' },
      { title: 'Risk assessment awareness', lessonOne: 'Who may be harmed and how', lessonTwo: 'Selecting proportionate controls', focus: 'Use a simple risk-assessment thought process and follow established controls.' },
      { title: 'Manual handling', lessonOne: 'Manual-handling risk factors', lessonTwo: 'Planning safer movement and asking for help', focus: 'Assess the task, load, environment and individual capability before moving something.' },
      { title: 'Fire safety', lessonOne: 'Fire prevention and warning signs', lessonTwo: 'Evacuation and emergency behaviour', focus: 'Know how to respond to alarms and avoid actions that obstruct evacuation or emergency response.' },
      { title: 'Slips, trips and workplace condition', lessonOne: 'Common causes of falls', lessonTwo: 'Housekeeping, reporting and temporary controls', focus: 'Identify environmental hazards and act before a minor condition becomes an injury.' },
      { title: 'Display screen and ergonomics', lessonOne: 'DSE setup and posture', lessonTwo: 'Movement, breaks and discomfort reporting', focus: 'Adjust the workstation and working pattern rather than tolerating avoidable discomfort.' },
      { title: 'Lone and personal safety', lessonOne: 'Lone-working risks', lessonTwo: 'Personal safety, contact and escalation', focus: 'Plan communication, boundaries and response routes before working alone or in unfamiliar situations.' },
      { title: 'Home and remote working', lessonOne: 'Home-working hazards', lessonTwo: 'Boundaries, equipment and safe routines', focus: 'Apply workplace safety principles even when the work location is domestic.' },
      { title: 'Stress and wellbeing awareness', lessonOne: 'Recognising pressure and stress indicators', lessonTwo: 'Work factors, support and escalation', focus: 'Recognise when workload, role or environment may require support or management action.' },
      { title: 'Fatigue', lessonOne: 'How fatigue affects judgement and safety', lessonTwo: 'Reporting and managing fatigue risk', focus: 'Treat fatigue as a potential performance and safety risk rather than a personal weakness.' },
      { title: 'Incidents and first-aid awareness', lessonOne: 'Accidents, near misses and reporting', lessonTwo: 'First-aid awareness and emergency escalation', focus: 'Report incidents accurately and understand the limits of awareness training versus competent first-aid response.' },
      { title: 'Equipment and safety culture', lessonOne: 'Safe use of work equipment awareness', lessonTwo: 'Safety communication and continuous improvement', focus: 'Use authorised equipment as intended and turn reports and near misses into safer future work.' },
    ],
  },
  {
    code: 'SME-CAR-501', slug: 'employability-and-career-development', title: 'Employability & Career Development', category: 'Employability and career skills', level: 'Intermediate', core: false,
    shortDescription: 'Build evidence of skills, create stronger applications, prepare for interviews, succeed in new roles and plan realistic career progression.',
    overview: 'A twelve-week career programme covering career direction, transferable skills, CVs, cover letters, job search, networking, LinkedIn, interviews, portfolios, references, starting a job, probation, promotion, internal applications, career change, freelancing and development records.',
    audience: ['Jobseekers', 'New starters', 'Employees planning progression', 'People changing role or career direction'], prerequisites: 'No previous career-development qualification is required.',
    practiceContext: 'job applications, interviews and career-development decisions', risks: 'generic applications, unsupported claims, weak preparation, unclear goals, poor evidence of skills and missed follow-up', evidence: 'CVs, applications, interview examples, portfolios, development plans, feedback and professional learning records',
    notice: 'This programme provides general employability and career-development education and does not guarantee employment, promotion or a recruitment outcome.',
    weeks: [
      { title: 'Career direction', lessonOne: 'Understanding strengths, interests and constraints', lessonTwo: 'Defining a realistic target role', focus: 'Choose a direction based on evidence about capability, opportunity and practical constraints.' },
      { title: 'Transferable skills', lessonOne: 'Identifying skills from experience', lessonTwo: 'Turning responsibilities into evidence', focus: 'Describe what you can do using specific examples and outcomes rather than vague claims.' },
      { title: 'CV development', lessonOne: 'Structuring a targeted CV', lessonTwo: 'Writing achievement-focused evidence', focus: 'Prioritise relevant evidence and make the document easy for a recruiter to evaluate.' },
      { title: 'Cover letters and applications', lessonOne: 'Writing a relevant cover letter', lessonTwo: 'Answering application questions with evidence', focus: 'Connect the requirements of the opportunity to specific examples from experience.' },
      { title: 'Job search strategy', lessonOne: 'Finding opportunities', lessonTwo: 'Tracking applications and follow-up', focus: 'Build a repeatable search system rather than relying on occasional browsing.' },
      { title: 'Professional networking', lessonOne: 'Building professional relationships', lessonTwo: 'LinkedIn and online professional presence', focus: 'Use networking to exchange useful information and visibility rather than immediately asking strangers for jobs.' },
      { title: 'Interview preparation', lessonOne: 'Researching the role and organisation', lessonTwo: 'Building structured examples', focus: 'Prepare evidence for likely competencies and understand what the interviewer needs to decide.' },
      { title: 'Interview communication', lessonOne: 'Answering clearly under pressure', lessonTwo: 'Questions, clarification and follow-up', focus: 'Use concise evidence, listen to the actual question and recover professionally when an answer needs clarification.' },
      { title: 'Portfolio and references', lessonOne: 'Building a professional portfolio', lessonTwo: 'Selecting and briefing references', focus: 'Create evidence that supports your claims and make reference requests appropriately.' },
      { title: 'Starting a new job', lessonOne: 'First weeks and workplace expectations', lessonTwo: 'Using the probation period well', focus: 'Learn the role, relationships, standards and feedback routes quickly without pretending to know what has not yet been learned.' },
      { title: 'Progression and promotion', lessonOne: 'Preparing for promotion', lessonTwo: 'Internal applications and development gaps', focus: 'Compare current evidence with the next role and build capability before the opportunity arrives.' },
      { title: 'Career change and independent work', lessonOne: 'Planning a career change', lessonTwo: 'Freelancing foundations and professional development records', focus: 'Test a new direction, understand practical risks and keep evidence of continuing professional development.' },
    ],
  },
];

export const programmeLibraryCourses: LibraryCourse[] = programmes.map(createProgramme);
