// Backend — Resume & Job Description Analyzer
// Runs locally as an Express server (port 8000) or on AWS Lambda via serverless-http.
// Endpoints: GET /health  |  POST /analyze  |  POST /cover-letter

import express from 'express'
import cors from 'cors'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import serverless from 'serverless-http'

const app = express()

// Store uploads in memory (never written to disk), 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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

// Curated skill list used to scan resume and JD text
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

const GENERIC_STRENGTHS = [
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


function extractSkills(text) {
  const lowerText = text.toLowerCase()
  return TECH_SKILLS.filter(skill => {
    // Escape special regex chars (e.g. "C++" → "C\+\+") then match whole word
    const safeSkill = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${safeSkill}\\b`).test(lowerText)
  })
}


// Mock strength analysis — replace with an AI API call in production
function identifyStrengths(resumeSkills) {
  const hasTechSkills = resumeSkills.some(s => ['React', 'Node.js', 'Python', 'TypeScript', 'AWS'].includes(s))
  const hasLeadership = resumeSkills.some(s => ['Leadership', 'Agile', 'Scrum', 'Product Management'].includes(s))
  const hasDataSkills = resumeSkills.some(s => ['Data Analysis', 'Machine Learning', 'Pandas', 'SQL'].includes(s))

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

  const combined = [...strengths, ...GENERIC_STRENGTHS]
  return combined.slice(0, 3)
}


// Returns matched skills, missing skills, and a clamped score (35–97)
function computeMatch(resumeSkills, jdSkills) {
  const resumeSkillsLower = new Set(resumeSkills.map(s => s.toLowerCase()))
  const foundSkills   = []
  const missingSkills = []

  for (const skill of jdSkills) {
    const skillLower = skill.toLowerCase()
    // Also matches close variants via substring (e.g. "ML" ↔ "Machine Learning")
    const isMatched = [...resumeSkillsLower].some(
      resumeSkill => skillLower.includes(resumeSkill) || resumeSkill.includes(skillLower)
    )

    if (isMatched) {
      foundSkills.push(skill)
    } else {
      missingSkills.push(skill)
    }
  }

  // raw% → scale to [30,100] → clamp to [35,97]
  let score = 50
  if (jdSkills.length > 0) {
    const rawPercent = (foundSkills.length / jdSkills.length) * 100
    score = Math.min(97, Math.max(35, Math.round(rawPercent * 0.70 + 30)))
  }

  return {
    foundSkills:   foundSkills.slice(0, 12),
    missingSkills: missingSkills.slice(0, 10),
    score,
  }
}


// Mock cover letter generator — swap for an AI API call in production
function generateCoverLetter(name, role, skills, jdSnippet) {
  const topSkills = skills.length > 0 ? skills.slice(0, 5) : ['problem-solving', 'communication', 'teamwork']
  const skillsList = topSkills.length > 1
    ? topSkills.slice(0, -1).join(', ') + ' and ' + topSkills[topSkills.length - 1]
    : topSkills[0]
  const jdPreview = jdSnippet.trim().slice(0, 90).replace(/[.,;]+$/, '')

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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

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

    const pdfData    = await pdfParse(req.file.buffer)
    const resumeText = pdfData.text.trim()

    // Reject scanned/image-only PDFs that yield no text
    const wordCount = resumeText.split(/\s+/).length
    if (wordCount < 20) {
      return res.status(422).json({
        detail: 'Extracted text is too short. The PDF may be image-based (scanned). Please use a text-selectable PDF.',
      })
    }

    const [resumeSkills, jdSkills] = await Promise.all([
      extractSkills(resumeText),
      extractSkills(jobDescription),
    ])

    const strengths = identifyStrengths(resumeSkills)
    const match     = computeMatch(resumeSkills, jdSkills)

    const missingKeywords = match.missingSkills.slice(0, 6).map(skill =>
      `"${skill}" is mentioned in the job description but not detected in your resume.`
    )

    const tips = match.missingSkills.length >= 4
      ? [IMPROVEMENT_TIPS[0], IMPROVEMENT_TIPS[5], IMPROVEMENT_TIPS[1]]
      : IMPROVEMENT_TIPS.slice(0, 3)

    res.json({
      score:          match.score,
      strengths,
      missingKeywords,
      tips,
      foundSkills:    match.foundSkills,
      requiredSkills: match.missingSkills,
    })

  } catch (err) {
    console.error('[/analyze error]', err)
    res.status(500).json({ detail: err.message || 'Internal server error' })
  }
})

app.post('/cover-letter', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No resume file uploaded.' })
    }

    const jobDescription = (req.body.job_description  || '').trim()
    const applicantName  = (req.body.applicant_name   || 'Applicant').trim()
    const targetRole     = (req.body.target_role      || 'this position').trim()

    if (!jobDescription) {
      return res.status(400).json({ detail: 'Job description is required.' })
    }

    const pdfData    = await pdfParse(req.file.buffer)
    const resumeText = pdfData.text.trim()
    const resumeSkills = extractSkills(resumeText)
    const coverLetter  = generateCoverLetter(applicantName, targetRole, resumeSkills, jobDescription)

    res.json({ cover_letter: coverLetter })

  } catch (err) {
    console.error('[/cover-letter error]', err)
    res.status(500).json({ detail: err.message || 'Internal server error' })
  }
})


// --- LOCAL DEV SERVER (skipped on Lambda) ------------------------------------
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8000
  app.listen(PORT, () => {
    console.log(`✓  Backend running at http://localhost:${PORT}`)
  })
}


// --- AWS LAMBDA EXPORT --------------------------------------------------------
// serverlessHandler is initialised outside the handler (cold-start best practice —
// the wrapper is created once and reused across warm invocations).
let isColdStart = true
const serverlessHandler = serverless(app)

export const handler = async (event, context) => {
  // Detect cold vs warm start and log it
  const startedAsCold = isColdStart
  if (isColdStart) {
    isColdStart = false
    console.log('[Lambda] COLD START — container initialising')
  }

  // Structured CloudWatch log — every request traceable by requestId
  const requestId = context.awsRequestId
  console.log(JSON.stringify({
    level:       'INFO',
    requestId,
    coldStart:   startedAsCold,
    method:      event.httpMethod || event.requestContext?.http?.method || 'UNKNOWN',
    path:        event.path || event.rawPath || '/',
    remainingMs: context.getRemainingTimeInMillis(),
    memoryMB:    context.memoryLimitInMB,
    function:    context.functionName,
  }))

  // Short-circuit EventBridge warmup pings (keeps container alive, avoids cold starts)
  if (event.source === 'serverless-plugin-warmup') {
    console.log('[Lambda] Warmup ping received')
    return { statusCode: 200, body: 'warmed' }
  }

  const invocationStart = Date.now()
  const response        = await serverlessHandler(event, context)

  console.log(JSON.stringify({
    level: 'INFO', requestId,
    statusCode: response.statusCode,
    durationMs: Date.now() - invocationStart,
  }))

  return response
}

// Also export the app itself so we can import it in tests
export default app
