export type LibraryQuiz = {
  question: string;
  options: string[];
  answer: number;
};

export type LibraryLesson = {
  title: string;
  summary: string;
  content: string[];
  quiz?: LibraryQuiz;
};

export type LibraryCourse = {
  slug: string;
  title: string;
  category: string;
  description: string;
  level: 'Beginner' | 'Intermediate';
  minutes: number;
  featured?: boolean;
  includedPlans: string[];
  lessons: LibraryLesson[];
};

export const libraryCourses: LibraryCourse[] = [
  {
    slug: 'starting-a-small-business',
    title: 'Starting a Small Business',
    category: 'Business and enterprise',
    description: 'Turn an idea into a focused, testable and financially sensible small business.',
    level: 'Beginner', minutes: 55, featured: true,
    includedPlans: ['Learner', 'Learner Plus', 'Team 5', 'Team 15'],
    lessons: [
      { title: 'From idea to customer problem', summary: 'Define the customer, the problem and the useful outcome.', content: ['A business idea becomes useful when it solves a specific problem for a defined customer.', 'Write a simple proposition: We help a particular customer achieve a useful outcome without their main frustration.', 'Avoid building a full service before checking that the problem is real and important.'] },
      { title: 'Testing demand before building', summary: 'Use small tests before committing serious time or money.', content: ['Speak to potential customers and ask about their current behaviour rather than whether they like your idea.', 'Useful tests include a waiting list, a simple landing page, a paid trial or a manual version of the service.', 'Real commitment is stronger evidence than compliments or social-media reactions.'] },
      { title: 'Pricing and basic finances', summary: 'Understand costs, price, cash flow and a basic margin.', content: ['A sustainable price needs to cover direct costs, overheads, taxes, risk and profit.', 'Estimate fixed monthly costs, variable cost per sale and a realistic sales volume.', 'Profit and cash are not the same: timing differences can leave a profitable business short of available cash.'], quiz: { question: 'Which is the strongest early evidence of demand?', options: ['Someone says the idea sounds good', 'A customer pays for a small trial', 'A social post receives a like'], answer: 1 } },
    ],
  },
  {
    slug: 'ai-literacy-for-everyday-work',
    title: 'AI Literacy for Everyday Work',
    category: 'Digital skills and AI',
    description: 'Use generative AI productively while checking accuracy, privacy and risk.',
    level: 'Beginner', minutes: 45, featured: true,
    includedPlans: ['Learner', 'Learner Plus', 'Team 5', 'Team 15'],
    lessons: [
      { title: 'What generative AI does', summary: 'Understand useful capabilities and important limitations.', content: ['Generative AI produces content from patterns in data. It can draft, transform, organise and summarise information.', 'It does not guarantee truth and can produce confident but incorrect statements.', 'Treat important output as a draft requiring human judgement.'] },
      { title: 'Writing useful prompts', summary: 'Give the system a clear goal, context and output format.', content: ['A useful prompt explains the goal, relevant context, constraints, audience and desired format.', 'Breaking a complicated task into stages can improve quality and make checking easier.', 'Do not confuse a polished answer with a verified answer.'] },
      { title: 'Privacy and verification', summary: 'Protect information and check important claims.', content: ['Do not enter confidential, commercially sensitive or personal information unless the use is approved.', 'Verify legal, financial, medical, safety and operational claims using reliable sources.', 'Keep a human decision-maker responsible for important outcomes.'], quiz: { question: 'What should you do with an important AI-generated claim?', options: ['Assume it is correct', 'Check it against reliable sources', 'Publish it immediately'], answer: 1 } },
    ],
  },
  {
    slug: 'customer-service-essentials',
    title: 'Customer Service Essentials',
    category: 'Workplace essentials',
    description: 'Handle enquiries, complaints and difficult conversations professionally.',
    level: 'Beginner', minutes: 50, featured: true,
    includedPlans: ['Learner', 'Learner Plus', 'Team 5', 'Team 15'],
    lessons: [
      { title: 'Understanding the real need', summary: 'Listen, clarify and confirm the customer’s desired outcome.', content: ['Customers may describe symptoms before they describe the underlying problem.', 'Ask concise questions, reflect back what you understood and confirm the outcome they need.', 'Record relevant facts without adding assumptions.'] },
      { title: 'Complaint handling', summary: 'Use a consistent process for fair and accountable handling.', content: ['A practical sequence is acknowledge, clarify, investigate, resolve and confirm.', 'Do not promise an outcome before the facts and your authority are clear.', 'Explain decisions in plain language and keep an appropriate record.'] },
      { title: 'De-escalation', summary: 'Reduce tension without dismissing the issue.', content: ['Keep your tone calm and avoid arguing about emotion.', 'Separate the person’s frustration from the practical issue that needs action.', 'Set respectful boundaries where behaviour becomes abusive or threatening.'], quiz: { question: 'What should happen before promising a resolution?', options: ['Investigate the relevant facts', 'End the conversation', 'Ignore the complaint'], answer: 0 } },
    ],
  },
  {
    slug: 'uk-data-protection-awareness',
    title: 'UK Data Protection Awareness',
    category: 'Compliance awareness',
    description: 'Recognise personal data and understand everyday handling responsibilities.',
    level: 'Beginner', minutes: 55, featured: true,
    includedPlans: ['Learner Plus', 'Team 5', 'Team 15'],
    lessons: [
      { title: 'Recognising personal data', summary: 'Identify information relating to an identifiable living person.', content: ['Personal data can include obvious identifiers and information that becomes identifying when combined with other data.', 'Special category data requires additional care because of its sensitive nature.', 'Context matters when deciding whether information identifies somebody.'] },
      { title: 'Minimisation and retention', summary: 'Collect what is needed and keep it only as long as justified.', content: ['Purpose should drive what information is collected.', 'Data should be relevant, accurate and limited to what is necessary.', 'Retention should be based on a documented legal, regulatory or operational reason.'] },
      { title: 'Responding to incidents', summary: 'Report suspected loss, disclosure or unauthorised access promptly.', content: ['A personal-data incident may involve confidentiality, integrity or availability.', 'Staff should report concerns immediately through the organisation’s approved route.', 'Do not conceal, independently investigate beyond your authority or destroy evidence.'], quiz: { question: 'What should happen after a suspected personal-data incident?', options: ['Hide it', 'Report it promptly', 'Delete all records'], answer: 1 } },
    ],
  },
  {
    slug: 'workplace-health-and-safety-awareness',
    title: 'Workplace Health and Safety Awareness',
    category: 'Safety awareness',
    description: 'Recognise hazards, understand risk and report concerns appropriately.',
    level: 'Beginner', minutes: 45,
    includedPlans: ['Learner Plus', 'Team 5', 'Team 15'],
    lessons: [
      { title: 'Hazards and risks', summary: 'Separate the source of harm from likelihood and severity.', content: ['A hazard is something with the potential to cause harm.', 'Risk considers how likely harm is and how serious the consequences could be.', 'Controls should reflect the nature of the hazard and who may be affected.'] },
      { title: 'Hierarchy of controls', summary: 'Prefer stronger controls over reliance on individual behaviour.', content: ['Elimination is generally strongest, followed by substitution, engineering controls and administrative controls.', 'Personal protective equipment is important but normally sits lower in the hierarchy.', 'Several controls may be required together.'] },
      { title: 'Incident and near-miss reporting', summary: 'Use reporting to prevent recurrence and improve controls.', content: ['Report accidents, near misses and unsafe conditions through the approved route.', 'A near miss can reveal a weakness before somebody is harmed.', 'Preserve relevant information and follow emergency arrangements where necessary.'], quiz: { question: 'Which type of control is generally preferred first?', options: ['Personal protective equipment', 'Elimination of the hazard', 'A warning sign'], answer: 1 } },
    ],
  },
  {
    slug: 'time-management-that-works',
    title: 'Time Management That Actually Works',
    category: 'Personal development',
    description: 'Plan realistic days, prioritise by consequence and protect focused time.',
    level: 'Beginner', minutes: 40,
    includedPlans: ['Learner', 'Learner Plus', 'Team 5', 'Team 15'],
    lessons: [
      { title: 'Capture before prioritising', summary: 'Keep commitments in one trusted system.', content: ['Scattered notes and remembered tasks create avoidable mental load.', 'Capture commitments in a single reliable place before deciding priority.', 'Separate actions, appointments, reference information and ideas.'] },
      { title: 'Prioritise by consequence', summary: 'Choose work based on impact, deadline and responsibility.', content: ['Urgent does not always mean important.', 'Ask what creates the greatest useful result and what has a genuine deadline or dependency.', 'Make trade-offs visible instead of pretending everything is equally important.'] },
      { title: 'Build a realistic week', summary: 'Leave capacity for administration, interruptions and recovery.', content: ['Scheduling every minute makes a plan fragile.', 'Include preparation, travel, follow-up, breaks and routine administration.', 'Review the plan and move unfinished work deliberately rather than carrying vague guilt.'], quiz: { question: 'Why should you avoid scheduling every minute?', options: ['To leave capacity for real-world interruptions', 'Because planning is pointless', 'To avoid all deadlines'], answer: 0 } },
    ],
  },
  {
    slug: 'marketing-fundamentals', title: 'Marketing Fundamentals', category: 'Business and enterprise',
    description: 'Create a focused offer and communicate it to the right audience.', level: 'Beginner', minutes: 50,
    includedPlans: ['Learner Plus', 'Team 5', 'Team 15'],
    lessons: [
      { title: 'Positioning and value', summary: 'Explain who an offer is for and why it matters.', content: ['Positioning connects a defined audience, problem, outcome and reason to choose the offer.', 'Clear positioning is more useful than trying to appeal to everybody.', 'Value should be expressed through customer outcomes rather than internal features alone.'] },
      { title: 'The customer journey', summary: 'Understand movement from awareness to retention.', content: ['Customers may move through awareness, consideration, purchase, use and retention.', 'Different questions and barriers appear at each stage.', 'Marketing and service delivery should make the next step clear.'] },
      { title: 'Useful measurement', summary: 'Track measures that support decisions.', content: ['Useful measures include qualified enquiries, conversion, acquisition cost and retention.', 'Large numbers of views may be meaningless without relevant action.', 'Choose measures that connect to a business objective.'] },
    ],
  },
  {
    slug: 'cybersecurity-awareness', title: 'Cybersecurity Awareness', category: 'Digital skills and AI',
    description: 'Reduce everyday risks from phishing, weak passwords and unsafe devices.', level: 'Beginner', minutes: 50,
    includedPlans: ['Learner Plus', 'Team 5', 'Team 15'],
    lessons: [
      { title: 'Phishing and manipulation', summary: 'Recognise urgency, authority, fear and curiosity tactics.', content: ['Attackers often create pressure so that a person acts before checking.', 'Verify unusual requests through a trusted separate channel.', 'Do not rely on branding, display names or caller identity alone.'] },
      { title: 'Passwords and multi-factor authentication', summary: 'Protect accounts with unique credentials and stronger sign-in.', content: ['Use a unique password for each important account.', 'A password manager can reduce reuse and support stronger passwords.', 'Enable multi-factor authentication using the strongest approved method available.'] },
      { title: 'Updates, devices and backups', summary: 'Reduce known weaknesses and protect recoverability.', content: ['Install security updates promptly through approved processes.', 'Lock unattended devices and avoid unknown removable media.', 'Backups should be protected and tested, not merely assumed to work.'] },
    ],
  },
  {
    slug: 'communication-at-work', title: 'Communication at Work', category: 'Workplace essentials',
    description: 'Write and speak with clarity, appropriate tone and clear actions.', level: 'Beginner', minutes: 40,
    includedPlans: ['Learner', 'Learner Plus', 'Team 5', 'Team 15'],
    lessons: [
      { title: 'Make the purpose obvious', summary: 'Lead with the reason and required action.', content: ['Readers should quickly understand why the communication exists.', 'State the decision, question or action near the beginning.', 'Use headings and short paragraphs where they improve navigation.'] },
      { title: 'Choose the right channel', summary: 'Match the channel to urgency, sensitivity and record needs.', content: ['Use written communication where a durable record is needed.', 'A conversation may be better for sensitive or complicated matters, followed by a written summary.', 'Do not use an insecure channel for protected information.'] },
      { title: 'Close the loop', summary: 'Confirm decisions, owners and deadlines.', content: ['Ambiguity creates duplicated work and missed expectations.', 'Record who will do what and by when.', 'Confirm changes where the original plan is no longer achievable.'] },
    ],
  },
  {
    slug: 'critical-thinking-and-decisions', title: 'Critical Thinking and Better Decisions', category: 'Personal development',
    description: 'Separate evidence from assumption and make defensible decisions.', level: 'Intermediate', minutes: 55,
    includedPlans: ['Learner Plus', 'Team 5', 'Team 15'],
    lessons: [
      { title: 'Claims, evidence and assumptions', summary: 'Write down what is known, inferred and unknown.', content: ['A claim should be supported by evidence appropriate to its importance.', 'Separate direct evidence from interpretation and assumption.', 'Make uncertainty visible rather than hiding it behind confident language.'] },
      { title: 'Alternative explanations', summary: 'Test the answer you prefer against other possibilities.', content: ['Look for evidence that could disprove your preferred explanation.', 'Consider whether the same facts support another reasonable interpretation.', 'Avoid treating correlation as proof of causation.'] },
      { title: 'Decision records', summary: 'Record context, options, rationale and expected result.', content: ['A decision record supports accountability and later learning.', 'Include what was known at the time rather than judging only with hindsight.', 'Set a review point where the result can be compared with expectations.'] },
    ],
  },
  {
    slug: 'bookkeeping-basics', title: 'Bookkeeping Basics', category: 'Business and enterprise',
    description: 'Understand income, expenses, records and basic cash-flow control.', level: 'Beginner', minutes: 50,
    includedPlans: ['Learner Plus', 'Team 5', 'Team 15'],
    lessons: [
      { title: 'Income, expenses and evidence', summary: 'Record transactions consistently with supporting documents.', content: ['Keep complete records of business income and expenditure.', 'Use consistent categories and retain appropriate invoices, receipts and statements.', 'Do not mix personal and business records where separation is required.'] },
      { title: 'Profit is not cash', summary: 'Understand timing differences between activity and available money.', content: ['A sale can be recorded before the customer pays.', 'A future tax or supplier payment can reduce available cash even when current profit looks healthy.', 'Cash-flow monitoring helps a business plan for timing gaps.'] },
      { title: 'Monthly review', summary: 'Reconcile accounts and investigate differences.', content: ['Compare records with bank and payment-provider statements.', 'Review unpaid invoices, upcoming liabilities and unusual transactions.', 'Correct errors promptly and preserve an audit trail.'] },
    ],
  },
  {
    slug: 'equality-inclusion-and-respect', title: 'Equality, Inclusion and Respect', category: 'Workplace essentials',
    description: 'Support respectful behaviour and fairer everyday workplace decisions.', level: 'Beginner', minutes: 45,
    includedPlans: ['Learner Plus', 'Team 5', 'Team 15'],
    lessons: [
      { title: 'Respectful conduct', summary: 'Maintain professional respect even where people disagree.', content: ['Respectful conduct concerns behaviour, not forced agreement.', 'Avoid humiliating, threatening, discriminatory or exclusionary behaviour.', 'Challenge concerns through appropriate and proportionate routes.'] },
      { title: 'Fair decisions', summary: 'Use relevant criteria consistently and record reasons.', content: ['Identify criteria before making a decision where possible.', 'Check whether assumptions or irrelevant characteristics are influencing the outcome.', 'Document important decisions and any justified exceptions.'] },
      { title: 'Speaking up and confidentiality', summary: 'Know the reporting route and protect information appropriately.', content: ['Use the organisation’s approved reporting or grievance route.', 'Share information only with people who need it for a legitimate purpose.', 'Protection from retaliation and fair investigation are important features of a credible process.'] },
    ],
  },
];

export const libraryCategories = Array.from(new Set(libraryCourses.map((course) => course.category)));

export function findLibraryCourse(slug: string) {
  return libraryCourses.find((course) => course.slug === slug);
}
