/**
 * Resume & JD Analyzer — Node.js Backend
 * ----------------------------------------
 * Runs as Express locally for development.
 * Exported as an AWS Lambda handler via serverless-http for production.
 *
 * NOTE: This version uses mock AI responses so it works out-of-the-box
 * with no API keys required. Swap the mock functions for real
 * HuggingFace / OpenAI calls when you are ready for production.
 *
 * Endpoints:
 *   GET  /health        — liveness probe
 *   POST /analyze       — resume + JD analysis
 *   POST /cover-letter  — cover letter generation
 */

import express from 'express'
import cors from 'cors'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import serverless from 'serverless-http'

// ── App setup ─────────────────────────────────────────────────────────────────

const app = express()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
})

app.use(express.json())

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://jd-analyzer-psi.vercel.app',
  ],
  credentials: true,
}))

// ── Static data ───────────────────────────────────────────────────────────────

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

const MOCK_STRENGTHS = [
  'Your technical skill set aligns well with modern engineering roles.',
  'Strong communication skills — a valued asset in cross-functional teams.',
  'Continuous learning mindset is a key differentiator in fast-moving fields.',
]

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

// ── Skill extraction (regex — no API key needed) ──────────────────────────────

/**
 * Scan text against the TECH_SKILLS vocabulary using word-boundary regex.
 * This is the real extraction logic — no external API required.
 */
function extractSkills(text) {
  const lower = text.toLowerCase()
  return TECH_SKILLS.filter(skill => {
    const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`).test(lower)
  })
}

// ── Mock AI: strengths ────────────────────────────────────────────────────────

/**
 * Returns mock strength sentences derived from the skills found in the resume.
 * In production, replace this with a real zero-shot classification call.
 */
function mockIdentifyStrengths(resumeSkills) {
  // Pick sentences that feel relevant based on what was found
  const hasTech   = resumeSkills.some(s => ['React', 'Node.js', 'Python', 'TypeScript', 'AWS'].includes(s))
  const hasLeader = resumeSkills.some(s => ['Leadership', 'Agile', 'Scrum', 'Product Management'].includes(s))
  const hasData   = resumeSkills.some(s => ['Data Analysis', 'Machine Learning', 'Pandas', 'SQL'].includes(s))

  const strengths = []
  if (hasTech)   strengths.push('Your technical skill set aligns well with modern engineering roles.')
  if (hasLeader) strengths.push('Demonstrated leadership experience positions you for senior responsibilities.')
  if (hasData)   strengths.push('Data-driven decision-making background adds strong value to this position.')

  // Pad with generic strengths if needed
  return [...strengths, ...MOCK_STRENGTHS].slice(0, 3)
}

// ── Match score computation ───────────────────────────────────────────────────

/**
 * Compare resume vs. JD skill lists with case-insensitive substring matching.
 * Score = clamp(raw * 0.70 + 30, 35, 97) — keeps values in a realistic range.
 */
function computeMatch(resumeSkills, jdSkills) {
  const resumeLower = new Set(resumeSkills.map(s => s.toLowerCase()))
  const found   = []
  const missing = []

  for (const skill of jdSkills) {
    const sl = skill.toLowerCase()
    const matched = [...resumeLower].some(r => sl.includes(r) || r.includes(sl))
    ;(matched ? found : missing).push(skill)
  }

  const score = jdSkills.length === 0
    ? 50
    : Math.min(97, Math.max(35, Math.round((found.length / jdSkills.length) * 100 * 0.70 + 30)))

  return {
    foundSkills:   found.slice(0, 12),
    missingSkills: missing.slice(0, 10),
    score,
  }
}

// ── Mock AI: cover letter ─────────────────────────────────────────────────────

/**
 * Generates a cover letter from a template using the extracted skills.
 * In production, replace this with a real LLM call (OpenAI / Flan-T5 / etc.).
 */
function mockGenerateCoverLetter(name, role, skills, jdSnippet) {
  const topSkills = skills.length ? skills.slice(0, 5) : ['problem-solving', 'communication', 'teamwork']
  const skillsStr = topSkills.length > 1
    ? topSkills.slice(0, -1).join(', ') + ' and ' + topSkills.at(-1)
    : topSkills[0]
  const jdPreview = jdSnippet.trim().slice(0, 90).replace(/[.,;]+$/, '')

  return [
    `Dear Hiring Manager,`,
    ``,
    `I am writing to express my strong interest in the ${role} position. With a solid background in ${skillsStr}, I am confident my experience aligns closely with the requirements outlined in your job posting.`,
    ``,
    `Throughout my career I have built expertise in ${topSkills.slice(0, 3).join(', ')}, which has prepared me to contribute meaningfully from day one. I am particularly excited by the opportunity to work on ${jdPreview}, and I believe my skill set makes me a strong match for what your team is looking for.`,
    ``,
    `I would welcome the chance to discuss how my background and enthusiasm can support your organisation's goals. Thank you for your time and consideration — I look forward to speaking with you.`,
    ``,
    `Sincerely,`,
    name,
  ].join('\n')
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET / — friendly landing page for the API. */
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

/** GET /health — liveness probe for load-balancers and the frontend. */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

/** POST /analyze — main resume-vs-JD analysis endpoint. */
app.post('/analyze', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No resume file uploaded.' })
    }
    if (!req.file.originalname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ detail: 'Only PDF resumes are supported. Please upload a .pdf file.' })
    }

    const jobDescription = (req.body.job_description || '').trim()
    if (!jobDescription) {
      return res.status(400).json({ detail: 'Job description is required.' })
    }

    // Extract text from the PDF buffer
    const pdfData    = await pdfParse(req.file.buffer)
    const resumeText = pdfData.text.trim()

    if (resumeText.split(/\s+/).length < 20) {
      return res.status(422).json({
        detail: 'Extracted text is too short. The PDF may be image-based (scanned). Please use a text-selectable PDF.',
      })
    }

    // Run skill extraction in parallel, then derive strengths from the result
    const [resumeSkills, jdSkills] = await Promise.all([
      extractSkills(resumeText),
      extractSkills(jobDescription),
    ])
    const strengths = mockIdentifyStrengths(resumeSkills)

    const match = computeMatch(resumeSkills, jdSkills)

    const missingKeywords = match.missingSkills.slice(0, 6).map(skill =>
      `"${skill}" is mentioned in the job description but not detected in your resume.`
    )

    const tips = match.missingSkills.length >= 4
      ? [IMPROVEMENT_TIPS[0], IMPROVEMENT_TIPS[5], IMPROVEMENT_TIPS[1]]
      : IMPROVEMENT_TIPS.slice(0, 3)

    res.json({
      score:           match.score,
      strengths,
      missingKeywords,
      tips,
      foundSkills:     match.foundSkills,
      requiredSkills:  match.missingSkills,
    })
  } catch (err) {
    console.error('[/analyze]', err)
    res.status(500).json({ detail: err.message || 'Internal server error' })
  }
})

/** POST /cover-letter — generate a personalised cover letter. */
app.post('/cover-letter', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No resume file uploaded.' })
    }

    const jobDescription  = (req.body.job_description  || '').trim()
    const applicantName   = (req.body.applicant_name   || 'Applicant').trim()
    const targetRole      = (req.body.target_role      || 'this position').trim()

    if (!jobDescription) {
      return res.status(400).json({ detail: 'Job description is required.' })
    }

    const pdfData    = await pdfParse(req.file.buffer)
    const resumeText = pdfData.text.trim()

    const resumeSkills = await extractSkills(resumeText)
    const coverLetter  = mockGenerateCoverLetter(applicantName, targetRole, resumeSkills, jobDescription)

    res.json({ cover_letter: coverLetter })
  } catch (err) {
    console.error('[/cover-letter]', err)
    res.status(500).json({ detail: err.message || 'Internal server error' })
  }
})

// ── Local development server ──────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8000
  app.listen(PORT, () => {
    console.log(`✓  Backend running at http://localhost:${PORT} (mock mode — no API keys required)`)
  })
}

// ── AWS Lambda handler ────────────────────────────────────────────────────────
// serverless-http wraps the Express app so it can run as a Lambda function
// without any code changes between local and cloud environments.

export const handler = serverless(app)
export default app
