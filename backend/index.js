// =============================================================================
// BACKEND SERVER — Resume & Job Description Analyzer
// =============================================================================
//
// WHAT THIS FILE DOES (plain English):
//   This is the "brain" of the app that runs on a server (not in the browser).
//   It receives the user's resume PDF and the job description text, reads the
//   PDF, finds matching skills, and sends back a score + feedback.
//
// HOW IT RUNS:
//   • Locally (your computer)  → runs as a normal Node.js web server on port 8000
//   • In the cloud (AWS)       → runs as a "Lambda function" (explained below)
//
// WHAT IS AWS LAMBDA?
//   Lambda is a cloud service by Amazon. Instead of keeping a server running
//   24/7, Lambda only wakes up your code when someone makes a request, then
//   shuts it down again. You only pay for the seconds it's actually running.
//   The `serverless-http` package translates between Lambda's format and
//   Express's format so the same code works in both places.
//
// ENDPOINTS (URLs this server listens to):
//   GET  /health        → Quick check that the server is alive
//   POST /analyze       → Main analysis: resume + job description → score
//   POST /cover-letter  → Generate a cover letter from resume skills
// =============================================================================

// --- IMPORTS ------------------------------------------------------------------
// These are third-party libraries we install via npm (package.json).

// Express: the most popular Node.js framework for building web servers.
// It lets us define routes like "when someone visits /analyze, run this code".
import express from 'express'

// cors: "Cross-Origin Resource Sharing". Browsers block requests from one
// website to another by default for security. cors() tells the browser
// "it's OK — this frontend is allowed to talk to this backend".
import cors from 'cors'

// multer: a library for handling file uploads. Without it, reading an uploaded
// PDF from the request would require a lot of manual work.
import multer from 'multer'

// pdf-parse: reads a PDF file's binary data and extracts the plain text inside.
import pdfParse from 'pdf-parse'

// serverless-http: wraps our Express app so it can run as an AWS Lambda
// function. It converts Lambda's event format into something Express understands.
import serverless from 'serverless-http'


// --- CREATE THE EXPRESS APP ---------------------------------------------------
// `app` is our web server instance. We add routes and middleware to it below.
const app = express()

// Set up multer to hold uploaded files in memory (as a Buffer — raw bytes).
// We never write the file to disk, which is safer and faster.
// The 10 MB limit prevents people from uploading huge files.
const upload = multer({
  storage: multer.memoryStorage(),   // keep the file in RAM, not on disk
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB maximum file size
})

// Tell Express to automatically parse JSON request bodies.
// Without this, req.body would be undefined when someone sends JSON data.
app.use(express.json())

// Allow these specific frontend URLs to make requests to our backend.
// Any URL not on this list will be blocked by the browser's CORS policy.
app.use(cors({
  origin: [
    'http://localhost:3000',   // common React dev server port
    'http://localhost:5173',   // Vite dev server port (this project)
    'http://localhost:5174',   // alternative Vite port
    'https://jd-analyzer-psi.vercel.app', // production frontend on Vercel
  ],
  credentials: true, // allow cookies to be sent with requests (future use)
}))


// --- STATIC DATA --------------------------------------------------------------
// A hand-curated list of skills to look for in resumes and job descriptions.
// When we scan text, we check if any of these words appear in it.
const TECH_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular',
  'Node.js', 'Next.js', 'FastAPI', 'Django', 'Flask', 'Spring', 'Java',
  'C++', 'C#', 'Go', 'Rust', 'Kotlin', 'Swift',
  'SQL', 'PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis',
  'Elasticsearch', 'Cassandra', 'DynamoDB',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible',
  'Git', 'CI/CD', 'Jenkins', 'GitHub Actions', 'GitLab CI', 'Linux', 'Bash',
  'REST API', 'GraphQL', 'gRPC', 'Microservices', 'Kafka', 'RabbitMQ',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch',
  'scikit-learn', 'Pandas', 'NumPy', 'Spark', 'Hadoop',
  'Agile', 'Scrum', 'Kanban', 'JIRA', 'Confluence',
  'Figma', 'UX Design', 'CSS', 'HTML', 'Tailwind CSS', 'Sass',
  'Webpack', 'Vite', 'Jest', 'Cypress', 'Playwright',
  'Product Management', 'Data Analysis', 'System Design',
  'Leadership', 'Communication', 'Problem Solving', 'Teamwork',
  'SEO', 'Analytics', 'Performance Optimization', 'Security',
]

// Generic strength sentences used as fallbacks when no specific skill is found.
const GENERIC_STRENGTHS = [
  'Your technical skill set aligns well with modern engineering roles.',
  'Strong communication skills — a valued asset in cross-functional teams.',
  'Continuous learning mindset is a key differentiator in fast-moving fields.',
]

// Tips shown to the user after analysis. We pick from this list based on results.
const IMPROVEMENT_TIPS = [
  'Quantify achievements with metrics — e.g., "Reduced load time by 40%, improving Lighthouse score from 72 to 95".',
  'Add a dedicated Skills section near the top, grouping technologies by category for easy recruiter scanning.',
  'Tailor your summary to mirror the job title and company mission in 2–3 sentences.',
  'Include links to live projects or GitHub repos so recruiters can verify skills hands-on.',
  'Use strong action verbs ("Architected", "Owned", "Reduced") to open each bullet point.',
  'Remove outdated technologies and focus on tools mentioned in the JD.',
  'Keep your resume to 1–2 pages with consistent formatting throughout.',
  'Add relevant certifications or online courses that match the JD requirements.',
]


// --- SKILL EXTRACTION ---------------------------------------------------------
// Goes through a block of text and returns all the skills from TECH_SKILLS
// that appear in it. Uses regex (a pattern-matching tool) so "React" matches
// the word "React" but not a word like "Reacting".
function extractSkills(text) {
  const lowerText = text.toLowerCase() // convert to lowercase for case-insensitive search

  return TECH_SKILLS.filter(skill => {
    // Escape special regex characters in the skill name (e.g. "C++" → "C\+\+")
    // so the regex engine treats them as literal characters, not commands.
    const safeSkill = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // \b means "word boundary" — ensures we match the whole word, not a fragment
    const pattern = new RegExp(`\\b${safeSkill}\\b`)

    return pattern.test(lowerText) // returns true if the skill was found
  })
}


// --- IDENTIFY STRENGTHS -------------------------------------------------------
// Builds a short list of strength sentences based on what skills were found.
// This is a "mock" (fake) AI function — in a real production app you would
// replace this with a call to an AI API like OpenAI or HuggingFace.
function identifyStrengths(resumeSkills) {
  // Check which broad categories of skills the candidate has
  const hasTechSkills    = resumeSkills.some(s => ['React', 'Node.js', 'Python', 'TypeScript', 'AWS'].includes(s))
  const hasLeadership    = resumeSkills.some(s => ['Leadership', 'Agile', 'Scrum', 'Product Management'].includes(s))
  const hasDataSkills    = resumeSkills.some(s => ['Data Analysis', 'Machine Learning', 'Pandas', 'SQL'].includes(s))

  const strengths = []

  if (hasTechSkills) {
    strengths.push('Your technical skill set aligns well with modern engineering roles.')
  }
  if (hasLeadership) {
    strengths.push('Demonstrated leadership experience positions you for senior responsibilities.')
  }
  if (hasDataSkills) {
    strengths.push('Data-driven decision-making background adds strong value to this position.')
  }

  // If we found fewer than 3 specific strengths, fill in with the generic ones
  const combined = [...strengths, ...GENERIC_STRENGTHS]
  return combined.slice(0, 3) // always return exactly 3 strengths
}


// --- COMPUTE MATCH SCORE ------------------------------------------------------
// Compares the skills found in the resume against those required by the job.
// Returns: which skills matched, which are missing, and a numeric score (35–97).
function computeMatch(resumeSkills, jdSkills) {
  // Convert resume skills to lowercase for case-insensitive comparison
  const resumeSkillsLower = new Set(resumeSkills.map(s => s.toLowerCase()))

  const foundSkills   = [] // skills that appear in BOTH resume and job description
  const missingSkills = [] // skills in the job description but NOT in the resume

  for (const skill of jdSkills) {
    const skillLower = skill.toLowerCase()

    // A skill is "matched" if the resume contains it, or a close variant of it.
    // e.g. "ML" in resume matches "Machine Learning" in JD (substring check).
    const isMatched = [...resumeSkillsLower].some(
      resumeSkill => skillLower.includes(resumeSkill) || resumeSkill.includes(skillLower)
    )

    if (isMatched) {
      foundSkills.push(skill)
    } else {
      missingSkills.push(skill)
    }
  }

  // Calculate score:
  //   1. raw = (number of matching skills / total required skills) × 100
  //   2. Multiply by 0.70 and add 30 so scores are never unrealistically low
  //   3. Clamp between 35 and 97 to avoid extremes like 0% or 100%
  let score = 50 // default if the job description had no skills listed
  if (jdSkills.length > 0) {
    const rawPercent = (foundSkills.length / jdSkills.length) * 100
    score = Math.round(rawPercent * 0.70 + 30)
    score = Math.min(97, Math.max(35, score)) // clamp to [35, 97]
  }

  return {
    foundSkills:   foundSkills.slice(0, 12),   // show at most 12 matched skills
    missingSkills: missingSkills.slice(0, 10),  // show at most 10 missing skills
    score,
  }
}


// --- GENERATE COVER LETTER ----------------------------------------------------
// Builds a cover letter using a template filled with the candidate's details.
// This is a "mock" function — swap it for an AI API call in production.
function generateCoverLetter(name, role, skills, jdSnippet) {
  // Use the top 5 skills, or fall back to generic ones if the resume had none
  const topSkills = skills.length > 0 ? skills.slice(0, 5) : ['problem-solving', 'communication', 'teamwork']

  // Join skill names naturally: "React, Node.js and Python"
  const skillsList = topSkills.length > 1
    ? topSkills.slice(0, -1).join(', ') + ' and ' + topSkills[topSkills.length - 1]
    : topSkills[0]

  // Take the first 90 characters of the JD as a preview, removing trailing punctuation
  const jdPreview = jdSnippet.trim().slice(0, 90).replace(/[.,;]+$/, '')

  // Build the letter as an array of lines, then join them with newline characters
  const lines = [
    'Dear Hiring Manager,',
    '',
    `I am writing to express my strong interest in the ${role} position. With a solid background in ${skillsList}, I am confident my experience aligns closely with the requirements outlined in your job posting.`,
    '',
    `Throughout my career I have built expertise in ${topSkills.slice(0, 3).join(', ')}, which has prepared me to contribute meaningfully from day one. I am particularly excited by the opportunity to work on ${jdPreview}, and I believe my skill set makes me a strong match for what your team is looking for.`,
    '',
    `I would welcome the chance to discuss how my background and enthusiasm can support your organisation's goals. Thank you for your time and consideration — I look forward to speaking with you.`,
    '',
    'Sincerely,',
    name,
  ]

  return lines.join('\n')
}


// --- ROUTES -------------------------------------------------------------------
// A "route" is a URL + HTTP method combination. When the frontend makes a
// request to one of these URLs, Express runs the corresponding function.
//
// HTTP methods:
//   GET  = "give me information" (reading data)
//   POST = "here is data, process it" (sending data to the server)

// GET / — Returns basic info about the API (useful for testing in a browser)
app.get('/', (_req, res) => {
  res.json({
    name: 'ResumeMatch AI — Backend API',
    status: 'running',
    endpoints: {
      health:      'GET  /health',
      analyze:     'POST /analyze',
      coverLetter: 'POST /cover-letter',
    },
  })
})

// GET /health — A simple "ping" that returns { status: 'ok' }.
// Load balancers and monitoring tools call this to check the server is alive.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// POST /analyze — The main endpoint.
// Receives: a PDF resume file + job description text
// Returns: match score, strengths, missing keywords, tips, skill lists
//
// `upload.single('resume')` is middleware that reads the uploaded file from
// the request and attaches it to req.file before our function runs.
app.post('/analyze', upload.single('resume'), async (req, res) => {
  try {
    // Validate that a file was actually attached to the request
    if (!req.file) {
      return res.status(400).json({ detail: 'No resume file uploaded.' })
    }

    // We only support PDF files (not Word, plain text, etc.)
    if (!req.file.originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ detail: 'Only PDF resumes are supported. Please upload a .pdf file.' })
    }

    // req.body contains the text fields sent alongside the file
    const jobDescription = (req.body.job_description || '').trim()
    if (!jobDescription) {
      return res.status(400).json({ detail: 'Job description is required.' })
    }

    // Convert the PDF binary (req.file.buffer) into plain text
    const pdfData    = await pdfParse(req.file.buffer)
    const resumeText = pdfData.text.trim()

    // Reject PDFs that are scanned images — they produce no extractable text
    const wordCount = resumeText.split(/\s+/).length
    if (wordCount < 20) {
      return res.status(422).json({
        detail: 'Extracted text is too short. The PDF may be image-based (scanned). Please use a text-selectable PDF.',
      })
    }

    // Extract skills from both documents at the same time (runs in parallel).
    // Promise.all waits for both to finish before moving on.
    const [resumeSkills, jdSkills] = await Promise.all([
      extractSkills(resumeText),
      extractSkills(jobDescription),
    ])

    // Build the analysis results
    const strengths = identifyStrengths(resumeSkills)
    const match     = computeMatch(resumeSkills, jdSkills)

    // Turn missing skill names into human-readable sentences
    const missingKeywords = match.missingSkills.slice(0, 6).map(skill =>
      `"${skill}" is mentioned in the job description but not detected in your resume.`
    )

    // Choose tips: if there are many missing skills, prioritise quantifying and
    // tailoring advice; otherwise give general improvement tips
    const tips = match.missingSkills.length >= 4
      ? [IMPROVEMENT_TIPS[0], IMPROVEMENT_TIPS[5], IMPROVEMENT_TIPS[1]]
      : IMPROVEMENT_TIPS.slice(0, 3)

    // Send back the full analysis as a JSON object
    res.json({
      score:          match.score,
      strengths,
      missingKeywords,
      tips,
      foundSkills:    match.foundSkills,
      requiredSkills: match.missingSkills,
    })

  } catch (err) {
    // If anything unexpected went wrong, log it and send a generic error message
    console.error('[/analyze error]', err)
    res.status(500).json({ detail: err.message || 'Internal server error' })
  }
})

// POST /cover-letter — Generates a personalised cover letter.
// Receives: a PDF resume file + job description + applicant name + target role
// Returns: a ready-to-use cover letter as plain text
app.post('/cover-letter', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No resume file uploaded.' })
    }

    // Read text fields from the request body, with fallbacks if they are missing
    const jobDescription = (req.body.job_description  || '').trim()
    const applicantName  = (req.body.applicant_name   || 'Applicant').trim()
    const targetRole     = (req.body.target_role      || 'this position').trim()

    if (!jobDescription) {
      return res.status(400).json({ detail: 'Job description is required.' })
    }

    // Extract text from the uploaded PDF
    const pdfData    = await pdfParse(req.file.buffer)
    const resumeText = pdfData.text.trim()

    // Find the skills in the resume, then build the cover letter
    const resumeSkills = extractSkills(resumeText)
    const coverLetter  = generateCoverLetter(applicantName, targetRole, resumeSkills, jobDescription)

    res.json({ cover_letter: coverLetter })

  } catch (err) {
    console.error('[/cover-letter error]', err)
    res.status(500).json({ detail: err.message || 'Internal server error' })
  }
})


// --- LOCAL DEVELOPMENT SERVER -------------------------------------------------
// When running on your own computer (NODE_ENV is not 'production'), we start a
// regular HTTP server so you can test the API at http://localhost:8000.
// In production (AWS Lambda), this block is skipped — Lambda handles routing.
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8000
  app.listen(PORT, () => {
    console.log(`✓  Backend running at http://localhost:${PORT}`)
  })
}


// --- AWS LAMBDA EXPORT --------------------------------------------------------
// When deployed to AWS Lambda, Amazon doesn't start a listening server.
// Instead, it calls a specific function (called "handler") each time a
// request arrives. `serverless-http` wraps our entire Express app into
// a single `handler` function that Lambda knows how to call.
//
// Think of it like an adapter: Lambda speaks one language, Express speaks
// another, and serverless-http translates between them automatically.
export const handler = serverless(app)

// Also export the app itself so we can import it in tests
export default app
