require('dotenv').config();
const mongoose = require('mongoose');
const KnowledgeChunk = require('../models/KnowledgeChunk');

const SOURCE = 'Capware Systems approved FAQ';
const entries = [
  {
    title: 'Capware internship catalog - all six programs',
    keywords: ['internship', 'internships', 'all internships', 'available internships', 'internship programs', 'program list', 'training programs', 'react', 'python', 'machine learning', 'ml', 'data science', 'java', 'full stack', 'genai', 'fees', 'fee', '1499'],
    content: 'Capware Systems offers the following six internship program options in its catalog: (1) Full Stack Development with GenAI, (2) React.js Development, (3) Python Development, (4) AI & Machine Learning, (5) Data Science, and (6) Java Full Stack. The reference fee confirmed for each of these six programs is ₹1,499. Do not claim that a current batch is open unless confirmed separately. Program-specific syllabus, duration, schedule, eligibility, batch dates, registration steps, certificate terms and current availability should be confirmed with capwaresystems@gmail.com before payment. For Full Stack Development with GenAI, previously shared topics include React.js, Node.js, Express.js, MongoDB, MySQL, Generative AI tools and an n8n automation demonstration. Do not invent curriculum details for the other programs.',
  },
  {
    title: 'React.js Development Internship',
    keywords: ['react internship', 'reactjs internship', 'react.js development', 'frontend internship', 'front end internship', 'react developer', 'internship', '1499'],
    content: 'Capware Systems lists a React.js Development Internship. The reference fee confirmed for this program is ₹1,499. The detailed syllabus, duration, schedule, eligibility, current batch availability, registration process and certificate terms must be confirmed with capwaresystems@gmail.com. Do not invent specific modules, projects or placement guarantees.',
  },
  {
    title: 'Python Development Internship',
    keywords: ['python internship', 'python development', 'python programming', 'backend python', 'internship', '1499'],
    content: 'Capware Systems lists a Python Development Internship. The reference fee confirmed for this program is ₹1,499. The detailed syllabus, duration, schedule, eligibility, current batch availability, registration process and certificate terms must be confirmed with capwaresystems@gmail.com. Do not invent specific modules, projects or placement guarantees.',
  },
  {
    title: 'AI and Machine Learning Internship',
    keywords: ['ai internship', 'machine learning internship', 'ml internship', 'artificial intelligence', 'machine learning', 'internship', '1499'],
    content: 'Capware Systems lists an AI & Machine Learning Internship. The reference fee confirmed for this program is ₹1,499. The detailed syllabus, duration, schedule, eligibility, current batch availability, registration process and certificate terms must be confirmed with capwaresystems@gmail.com. Do not invent specific modules, projects or placement guarantees.',
  },
  {
    title: 'Data Science Internship',
    keywords: ['data science internship', 'data analysis internship', 'data scientist', 'internship', '1499'],
    content: 'Capware Systems lists a Data Science Internship. The reference fee confirmed for this program is ₹1,499. The detailed syllabus, duration, schedule, eligibility, current batch availability, registration process and certificate terms must be confirmed with capwaresystems@gmail.com. Do not invent specific modules, projects or placement guarantees.',
  },
  {
    title: 'Java Full Stack Internship',
    keywords: ['java internship', 'java full stack', 'fullstack java', 'spring boot', 'java developer', 'internship', '1499'],
    content: 'Capware Systems lists a Java Full Stack Internship. The reference fee confirmed for this program is ₹1,499. The detailed syllabus, duration, schedule, eligibility, current batch availability, registration process and certificate terms must be confirmed with capwaresystems@gmail.com. Do not claim that Spring Boot or other specific modules are included unless Capware confirms them. Do not invent placement guarantees.',
  },
  {
    title: 'Capware Systems services',
    keywords: ['services', 'website development', 'mobile app', 'desktop software', 'billing software', 'online classes', 'workshops', 'internship', 'project guidance'],
    content: 'Capware Systems Private Limited offers website development, mobile application development, desktop and billing applications, online classes, workshops, internship programs, and final-year project guidance. Confirm scope, timelines, eligibility, availability and current prices with the Capware team before making a payment.',
  },
  {
    title: 'Full Stack Development with GenAI Internship Program',
    keywords: ['internship', 'internships', 'intern', 'full stack', 'fullstack', 'genai', 'generative ai', 'training', 'student internship', 'fresher internship', 'certificate', 'internship fee', 'how to apply'],
    content: 'Capware Systems has offered a Full Stack Development with GenAI Internship Program for students and freshers interested in practical software development. Reference fee confirmed for this program: ₹1,499. Topics and demonstrations include React.js, Node.js, Express.js, MongoDB, MySQL, Generative AI tools and an n8n workflow automation demonstration. Previously listed benefits include technical training, project support, hosting and deployment guidance, company email access, Microsoft Teams access, Git access and an internship certificate. The current batch dates, duration, schedule, eligibility, registration process, certificate conditions and fee must be confirmed with Capware. Do not promise placement or employment. Contact: capwaresystems@gmail.com.',
  },
  {
    title: 'Internship fee and payment information',
    keywords: ['internship fee', 'internship fees', 'internship cost', 'internship price', '1499', '₹1499', 'payment', 'pay internship'],
    content: 'The reference fee confirmed for each of the six Capware internship catalog programs is ₹1,499 per program. Confirm current batch availability, payment recipient and applicable terms with capwaresystems@gmail.com before paying. Ask capwaresystems@gmail.com to confirm the current fee, what is included, payment recipient and applicable terms before paying. Never send passwords, OTPs, card details or API keys in chat.',
  },
  {
    title: 'Internship technologies and curriculum',
    keywords: ['internship syllabus', 'internship curriculum', 'learn', 'technologies', 'tech stack', 'react', 'node', 'express', 'mongodb', 'mysql', 'genai', 'n8n'],
    content: 'The Capware Full Stack Development with GenAI internship information previously shared covers React.js, Node.js, Express.js, MongoDB, MySQL, Generative AI tools and an n8n automation demonstration. The exact syllabus, depth, project requirements and batch schedule should be confirmed with Capware Systems.',
  },
  {
    title: 'Internship certificate and benefits',
    keywords: ['internship certificate', 'certificate', 'completion certificate', 'benefits', 'git access', 'teams', 'hosting', 'deployment', 'company email', 'project support'],
    content: 'The benefits previously listed for the Capware Full Stack Development with GenAI Internship Program include technical training, project support, hosting and deployment guidance, company email access, Microsoft Teams access, Git access and an internship certificate. Certificate eligibility and completion requirements should be confirmed before registration. Do not promise a job or placement guarantee.',
  },
  {
    title: 'How to enquire or apply for a Capware internship',
    keywords: ['apply internship', 'register internship', 'internship registration', 'join internship', 'internship opening', 'current batch', 'internship dates', 'internship duration'],
    content: 'For the current Capware internship batch, application link, opening status, duration, start date, schedule, eligibility and registration steps, contact capwaresystems@gmail.com. Do not invent a registration URL or claim that applications are currently open unless this knowledge entry is updated with confirmed information.',
  },
  {
    title: 'Website development pricing',
    keywords: ['website', 'web development', 'price', 'pricing', 'cost'],
    content: 'The reference promotional website development price previously shared by Capware is ₹6,999, compared with a listed price of ₹12,999. Pricing can change and project scope affects the quote. Ask Capware for a current written quote before payment.',
  },
  {
    title: 'Mobile app development pricing',
    keywords: ['mobile', 'app', 'application', 'price', 'pricing'],
    content: 'The reference promotional mobile application development price previously shared by Capware is ₹14,999, compared with a listed price of ₹25,999. Pricing can change and final scope affects the quote. Ask Capware for a current written quote.',
  },
  {
    title: 'Desktop and billing application pricing',
    keywords: ['desktop', 'billing', 'software', 'price'],
    content: 'The reference price previously shared for desktop and billing applications is ₹9,999. Confirm requirements, integrations, support and current price with Capware before payment.',
  },
  {
    title: 'Online classes and workshops',
    keywords: ['class', 'classes', 'course', 'courses', 'online', 'workshop', 'training', 'price'],
    content: 'Reference prices previously shared by Capware are ₹499 for online classes and ₹999 for workshops. Availability, syllabus, schedule and current fees should be confirmed with Capware.',
  },
  {
    title: 'Final-year project guidance',
    keywords: ['final year', 'project', 'college', 'bca', 'mca', 'btech', 'guidance'],
    content: 'Capware offers final-year project guidance. A previously shared reference price is ₹2,999. Scope depends on the project, technology, support needed and deliverables. Ask Capware for current availability and a written scope before payment.',
  },
  {
    title: 'Contact Capware support',
    keywords: ['contact', 'support', 'email', 'help', 'phone', 'reach'],
    content: 'For Capware service, internship, workshop or project questions, email capwaresystems@gmail.com. Do not send passwords, OTPs, payment-card details or API keys by email or chat.',
  },
  {
    title: 'Student privacy and account status',
    keywords: ['student', 'enrollment', 'enrolment', 'payment status', 'certificate status', 'application status'],
    content: 'Capware AI does not directly inspect private student, enrollment, payment, certificate or project records. Students and customers should sign in to the official website dashboard or contact support for account-specific status. Never share passwords or OTPs in chat.',
  },
  {
    title: 'Payment safety',
    keywords: ['payment', 'pay', 'upi', 'refund', 'fees', 'transaction'],
    content: 'Confirm the current price, scope, payment recipient and applicable refund terms with Capware before paying. The AI chatbot cannot confirm whether a payment was received or initiate a refund.',
  },
];

(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing from the backend .env file.');
    await mongoose.connect(process.env.MONGODB_URI);
    for (const entry of entries) {
      await KnowledgeChunk.updateOne(
        { title: entry.title, sourceName: SOURCE },
        { $set: { ...entry, sourceName: SOURCE, sourceType: 'faq', active: true } },
        { upsert: true },
      );
    }
    console.log(`Successfully seeded/updated ${entries.length} Capware knowledge entries.`);
  } catch (error) {
    console.error('Knowledge seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  }
})();
