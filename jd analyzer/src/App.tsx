// =============================================================================
// FRONTEND â€” React + TypeScript
// =============================================================================
//
// WHAT IS REACT?
//   React is a JavaScript library for building user interfaces. Instead of
//   manually updating the webpage every time data changes, React re-renders
//   only the parts that changed automatically. You build the UI out of
//   small reusable pieces called "components" (functions that return HTML).
//
// WHAT IS TYPESCRIPT?
//   TypeScript is JavaScript with "types" added. A type describes what kind
//   of value a variable can hold: number, string, boolean, or a custom shape.
//   TypeScript catches mistakes at edit-time instead of at runtime.
//   e.g. `const score: number = 75` â€” TypeScript won't let you put "hello" here.
//
// HOW THIS FILE IS ORGANISED:
//   1. Imports       â€” bring in external libraries
//   2. Constants     â€” data that never changes (API URL, static lists)
//   3. Small UI components â€” CircularProgress, FeedbackCard, SkillPill, etc.
//   4. Large sections â€” FileDropzone, Header, HowItWorks, etc.
//   5. Main App component â€” ties everything together
// =============================================================================

// --- IMPORTS ------------------------------------------------------------------

// React built-ins:
//   useState    â†’ stores values that can change over time (like a form field)
//   useRef      â†’ holds a reference to a DOM element (e.g. the hidden file input)
//   useCallback â†’ memoises a function so it isn't recreated on every render
import { useState, useRef, useCallback } from 'react'

// framer-motion: a library for smooth animations and transitions.
//   motion.div     â†’ a <div> that can be animated
//   AnimatePresence â†’ animates components when they appear or disappear
import { motion, AnimatePresence } from 'framer-motion'

// lucide-react: a collection of icon components (SVG icons as React components)
import {
  Upload, FileText, CheckCircle2, Github, Zap,
  Loader2, X, Star, AlertCircle, Lightbulb,
  TrendingUp, ChevronRight, WifiOff,
  Users, Award, Clock, BarChart2, ChevronDown,
  Shield, Lock, Target, Briefcase,
  Edit3, Copy, ClipboardCheck, User, Sparkles,
} from 'lucide-react'

import './App.css'

// Import our TypeScript type definitions from a separate file.
// Types describe the "shape" of data objects so TypeScript can check our code.
import type {
  AnalysisResult,
  FeedbackCardProps,
  SkillPillProps,
  CircularProgressProps,
  ResultsDashboardProps,
  FileDropzoneProps,
  CoverLetterSectionProps,
} from './types'


// --- CONFIGURATION ------------------------------------------------------------

// The URL of our backend server.
// In development: uses http://localhost:8000
// In production:  set VITE_API_URL in Vercel/Netlify environment variables
// `.replace(/\/$/, '')` removes a trailing slash if someone adds one by mistake
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')


// =============================================================================
// SMALL UI COMPONENTS
// =============================================================================
// Each of these is a pure display component: it receives "props" (inputs) and
// returns JSX (HTML-like syntax). They don't make API calls or manage state.
// =============================================================================

// --- CIRCULAR PROGRESS BAR ---------------------------------------------------
// Shows the match score as a circular ring that fills from 0% to the score value.
// Props: `value` â€” a number from 0 to 100
function CircularProgress({ value }: CircularProgressProps) {
  // SVG geometry: radius determines the size of the ring
  const radius        = 52
  const circumference = 2 * Math.PI * radius  // full circumference of the circle

  // strokeDashoffset controls how much of the ring is "filled".
  // 0 offset = fully filled ring; full circumference offset = empty ring.
  const offset = circumference - (value / 100) * circumference

  // Pick ring colour based on score: green = excellent, amber = good, red = needs work
  const strokeColor =
    value >= 80 ? '#22c55e'   // green
    : value >= 60 ? '#f59e0b' // amber
    : '#ef4444'               // red

  const label =
    value >= 80 ? 'Excellent'
    : value >= 60 ? 'Good'
    : 'Needs Work'

  return (
    <div className="flex flex-col items-center gap-2">
      {/* The SVG circle. -rotate-90 makes it start at the top instead of the right */}
      <div className="relative flex items-center justify-center w-40 h-40">
        <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
          {/* Background grey track */}
          <circle
            cx="60" cy="60" r={radius}
            className="fill-none stroke-slate-100"
            strokeWidth="10"
          />
          {/* Coloured progress arc â€” animated by framer-motion */}
          <motion.circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}  // start: empty
            animate={{ strokeDashoffset: offset }}          // end: filled to `value`
            transition={{ duration: 1.6, ease: 'easeOut' }}
          />
        </svg>

        {/* Score number displayed in the centre of the ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-extrabold text-slate-800 leading-none"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            {value}%
          </motion.span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-1">
            MATCH
          </span>
        </div>
      </div>

      {/* Label badge below the ring */}
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{ backgroundColor: `${strokeColor}18`, color: strokeColor }}
      >
        {label}
      </span>
    </div>
  )
}


// --- FEEDBACK CARD ------------------------------------------------------------
// A card showing a list of bullet points (used for Strengths, Missing Keywords, Tips).
// Props: icon, title, items (the bullet text), color theme, animation delay

// Defines the CSS classes for each colour theme.
// TypeScript `as const` tells TypeScript these are exact literal strings, not just "string".
const cardThemes = {
  green:  { card: 'border-emerald-100', iconBg: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-400' },
  red:    { card: 'border-rose-100',    iconBg: 'bg-rose-100 text-rose-600',       dot: 'bg-rose-400'    },
  indigo: { card: 'border-indigo-100',  iconBg: 'bg-indigo-100 text-indigo-600',   dot: 'bg-indigo-400'  },
} as const

function FeedbackCard({ icon, title, items, color, delay = 0 }: FeedbackCardProps) {
  const theme = cardThemes[color]

  return (
    // motion.div animates the card fading in and sliding up when it mounts
    <motion.div
      initial={{ opacity: 0, y: 24 }}   // start: invisible, 24px below final position
      animate={{ opacity: 1, y: 0 }}     // end: fully visible, in final position
      transition={{ duration: 0.45, delay }}
      className={`bg-white rounded-2xl border ${theme.card} shadow-sm p-5 flex flex-col gap-4`}
    >
      {/* Card header: icon + title */}
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${theme.iconBg}`}>
          {icon}
        </div>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>

      {/* Bullet point list */}
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
            {/* Coloured dot bullet */}
            <span className={`mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${theme.dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}


// --- SKILL PILL ---------------------------------------------------------------
// A small badge showing one skill. Green with a checkmark if found in resume,
// red with an X if it's missing.
function SkillPill({ label, found }: SkillPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
        found
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-rose-50 text-rose-700 border-rose-200'
      }`}
    >
      {found
        ? <CheckCircle2 size={11} className="flex-shrink-0" />
        : <X size={11} className="flex-shrink-0" />
      }
      {label}
    </span>
  )
}


// =============================================================================
// RESULTS DASHBOARD
// =============================================================================
// Shown after the user clicks "Analyze". Receives the full analysis response
// from the backend and renders the score, feedback cards, and skill pills.
function ResultsDashboard({ data }: ResultsDashboardProps) {
  // Destructure the data object into named variables for cleaner code.
  // This is the same as: const score = data.score; const strengths = data.strengths; etc.
  const { score, strengths, missingKeywords, tips, foundSkills, requiredSkills } = data

  // Pick a summary message based on the score
  const matchMessage =
    score >= 80
      ? 'Your resume is strongly aligned. A few tweaks could make it perfect.'
      : score >= 60
      ? 'Good profile fit â€” incorporating the missing keywords can significantly boost your score.'
      : 'Significant gaps detected. Tailor your resume closely before applying.'

  return (
    // motion.section fades in the entire results panel
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-10 space-y-6"
      aria-label="Analysis results"
    >
      {/* â”€â”€ Score Summary Card â”€â”€ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-center gap-8"
      >
        {/* Circular progress ring on the left */}
        <CircularProgress value={score} />

        {/* Text summary on the right */}
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {score >= 80 ? 'ðŸŽ‰ Excellent Match!' : score >= 60 ? 'ðŸ‘ Good Potential' : 'âš ï¸ Needs Tailoring'}
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-md">{matchMessage}</p>

          {/* Skill count summary */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 justify-center sm:justify-start">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              {foundSkills.length} skills matched
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
              {requiredSkills.length} skills missing
            </span>
          </div>
        </div>
      </motion.div>

      {/* â”€â”€ Three Feedback Cards: Strengths / Missing Keywords / Tips â”€â”€ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeedbackCard icon={<Star size={16} />}        title="Strengths"        items={strengths}       color="green"  delay={0.1} />
        <FeedbackCard icon={<AlertCircle size={16} />} title="Missing Keywords" items={missingKeywords} color="red"    delay={0.2} />
        <FeedbackCard icon={<Lightbulb size={16} />}   title="Improvement Tips" items={tips}            color="indigo" delay={0.3} />
      </div>

      {/* â”€â”€ Skill Gap Analysis: all skills as coloured pills â”€â”€ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.4 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={18} className="text-indigo-600" />
          <h3 className="font-semibold text-slate-800">Skill Gap Analysis</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Skills detected in the job description â€” green = present in your resume, red = missing.
        </p>
        <div className="flex flex-wrap gap-2">
          {/* Render a green pill for each matched skill */}
          {foundSkills.map(skill => <SkillPill key={skill} label={skill} found />)}
          {/* Render a red pill for each missing skill */}
          {requiredSkills.map(skill => <SkillPill key={skill} label={skill} found={false} />)}
        </div>
      </motion.div>
    </motion.section>
  )
}


// =============================================================================
// FILE DROPZONE
// =============================================================================
// The resume upload area. Supports both click-to-browse and drag-and-drop.
// Props:
//   file   â†’ the currently selected File object (or null if nothing selected)
//   onFile â†’ callback called with the new File when the user selects one
function FileDropzone({ file, onFile }: FileDropzoneProps) {
  // useRef creates a reference to the hidden <input type="file"> element.
  // We trigger it programmatically when the user clicks the dropzone.
  const inputRef = useRef<HTMLInputElement>(null)

  // useState tracks whether the user is currently dragging a file over the zone
  const [dragging, setDragging] = useState(false)

  // useCallback wraps the function so it isn't recreated on every render.
  // Only matters for performance when passed as a prop to child components.
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()          // prevent the browser from opening the file
    setDragging(false)
    const droppedFile = e.dataTransfer.files[0]  // get the first dropped file
    if (droppedFile) onFile(droppedFile)
  }, [onFile])

  return (
    <div className="flex flex-col h-full">
      <label className="block text-sm font-semibold text-slate-700 mb-3">
        <span className="flex items-center gap-2">
          <FileText size={15} className="text-indigo-500" />
          Upload Resume
        </span>
      </label>

      {/* AnimatePresence animates between the "file selected" and "empty dropzone" states */}
      <AnimatePresence mode="wait">
        {file ? (
          // â”€â”€ File already selected: show the file name with a remove button â”€â”€
          <motion.div
            key="uploaded"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="flex-1 flex flex-col justify-center"
          >
            <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
              {/* Green checkmark icon */}
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} className="text-emerald-500" />
              </div>

              {/* File name and size */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800 truncate">{file.name}</p>
                <p className="text-xs text-emerald-500 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB Â· Ready for analysis
                </p>
              </div>

              {/* Remove file button: calls onFile(null) to clear the selection */}
              <button
                onClick={() => onFile(null)}
                className="text-emerald-400 hover:text-emerald-700 transition-colors p-1 rounded-lg hover:bg-emerald-100"
                aria-label="Remove file"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 text-center mt-3">
              File looks good! Now paste the job description â†’
            </p>
          </motion.div>
        ) : (
          // â”€â”€ No file selected: show the drag-and-drop zone â”€â”€
          <motion.button
            key="dropzone"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            type="button"
            onClick={() => inputRef.current?.click()}       // open the file picker on click
            onDrop={handleDrop}                             // handle drag-and-drop
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            className={`flex-1 flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed transition-all cursor-pointer py-12 ${
              dragging
                ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'  // highlighted when dragging
                : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${dragging ? 'bg-indigo-200' : 'bg-indigo-100'}`}>
              <Upload size={24} className="text-indigo-500" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm font-medium text-slate-700">
                {dragging ? 'Drop it here!' : <>Drop your resume or <span className="text-indigo-600 font-semibold">browse</span></>}
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF Â· up to 10 MB</p>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Hidden file input â€” clicking the dropzone button triggers this */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        aria-label="Resume file upload"
      />
    </div>
  )
}


// =============================================================================
// HEADER
// =============================================================================
// The fixed navigation bar at the top of the page.
function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo and app name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-800 text-lg tracking-tight">ResumeMatch</span>
          <span className="hidden sm:inline-flex items-center bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100 ml-1">
            AI
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex items-center gap-1">
          <a
            href="#how-it-works"
            className="text-sm text-slate-500 hover:text-indigo-600 transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50 hidden sm:flex items-center gap-1"
          >
            How it Works <ChevronRight size={14} />
          </a>
          <a
            href="https://github.com/Devpatel954"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
            aria-label="View on GitHub"
          >
            <Github size={20} />
          </a>
        </nav>
      </div>
    </header>
  )
}


// =============================================================================
// HOW IT WORKS SECTION
// =============================================================================
// Static explanatory section â€” data lives in the array below.
const HOW_IT_WORKS_STEPS = [
  { icon: <Upload size={22} />,   title: 'Upload Your Resume',       desc: 'Drop your PDF resume into the upload zone. We never store your file.' },
  { icon: <FileText size={22} />, title: 'Paste the Job Description', desc: 'Copy and paste the complete job posting into the text area on the right.' },
  { icon: <Zap size={22} />,      title: 'Get Instant AI Feedback',   desc: 'Receive a detailed match score, keyword analysis, and actionable tips in seconds.' },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 border-y border-slate-100 py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-slate-800">How It Works</h2>
          <p className="text-slate-500 text-sm mt-2">Three steps to a tailored, job-ready resume.</p>
        </div>

        {/* Three-column grid of steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Horizontal connector line (visible only on desktop) */}
          <div className="hidden md:block absolute top-6 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-slate-200" />

          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center justify-center text-indigo-600 relative z-10">
                {step.icon}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Step {i + 1}</span>
              <h3 className="font-semibold text-slate-800 text-sm">{step.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


// =============================================================================
// COVER LETTER SECTION
// =============================================================================
// Lets the user generate a personalised cover letter using their uploaded resume.
// Props:
//   file            â†’ the resume file already selected in the main analyzer
//   jobDescription  â†’ the job description already entered in the main analyzer
function CoverLetterSection({ file, jobDescription }: CoverLetterSectionProps) {
  // useState stores values that change when the user interacts with the form.
  // Each call returns [currentValue, setterFunction].
  const [clName,      setClName]      = useState('')           // applicant's name
  const [clRole,      setClRole]      = useState('')           // target job title
  const [clJd,        setClJd]        = useState(jobDescription) // job description text
  const [generating,  setGenerating]  = useState(false)        // is the request in flight?
  const [coverLetter, setCoverLetter] = useState('')           // the generated letter text
  const [error,       setError]       = useState<string | null>(null)
  const [copied,      setCopied]      = useState(false)        // did the user just copy?
  const [jdTouched,   setJdTouched]   = useState(false)        // has the user edited the JD?

  // Keep the local JD in sync with the parent's JD, unless the user edited it
  if (!jdTouched && jobDescription && clJd !== jobDescription) setClJd(jobDescription)

  // The button is only active when a resume is selected and JD has enough text
  const canGenerate = file !== null && clJd.trim().length >= 30

  // Called when the user clicks "Generate Cover Letter"
  const handleGenerate = async () => {
    if (!canGenerate || generating) return  // guard against double-clicks

    setGenerating(true)
    setCoverLetter('')
    setError(null)

    try {
      // FormData is the standard way to send a file + text fields in one HTTP request
      const form = new FormData()
      form.append('resume',          file as File)
      form.append('job_description', clJd)
      form.append('applicant_name',  clName.trim() || 'Applicant')
      form.append('target_role',     clRole.trim() || 'this position')

      // `fetch` makes an HTTP POST request to the backend endpoint
      const res = await fetch(`${API_BASE}/cover-letter`, { method: 'POST', body: form })

      if (!res.ok) {
        // Try to read the error message from the response, or use a generic one
        const errData = await res.json().catch(() => ({}))
        throw new Error((errData as { detail?: string }).detail || `Server error ${res.status}`)
      }

      const data = await res.json() as { cover_letter: string }
      setCoverLetter(data.cover_letter || '')

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Give the user a helpful message if the backend is not running
      if (msg.includes('fetch')) {
        setError('Cannot reach the backend. Make sure the Node.js server is running on http://localhost:8000.')
      } else {
        setError(msg)
      }
    } finally {
      setGenerating(false)  // always re-enable the button, even if there was an error
    }
  }

  // Copy the generated letter to the clipboard and briefly show "Copied!"
  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetter).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)  // reset after 2.5 seconds
    })
  }

  return (
    <section id="cover-letter" className="py-16 px-4 sm:px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Section heading */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-violet-100 mb-4">
            <Edit3 size={12} /> AI Cover Letter
          </span>
          <h2 className="text-2xl font-bold text-slate-800">Generate a Tailored Cover Letter</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-lg mx-auto">
            Uses your uploaded resume's skills to write a personalised, job-specific cover letter in seconds.
          </p>
        </div>

        {/* Warning if no resume is uploaded yet */}
        {!file && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-5 rounded-2xl border border-amber-200 bg-amber-50 text-sm text-amber-800 mb-6"
          >
            <AlertCircle size={18} className="flex-shrink-0 text-amber-500" />
            <span>Upload your resume in the <strong>Analyze Your Resume</strong> section above first.</span>
          </motion.div>
        )}

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          {/* Name and role inputs side by side on wide screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <span className="flex items-center gap-2"><User size={14} className="text-violet-500" /> Your Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Jane Doe"
                value={clName}
                onChange={e => setClName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <span className="flex items-center gap-2"><Briefcase size={14} className="text-violet-500" /> Target Role</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Software Engineer"
                value={clRole}
                onChange={e => setClRole(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all placeholder-slate-400"
              />
            </div>
          </div>

          {/* Job description textarea */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <span className="flex items-center gap-2"><FileText size={14} className="text-violet-500" /> Job Description</span>
            </label>
            <textarea
              rows={5}
              placeholder="Paste the job description hereâ€¦"
              value={clJd}
              onChange={e => { setClJd(e.target.value); setJdTouched(true) }}
              className="w-full p-3.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 transition-all placeholder-slate-400 leading-relaxed"
            />
          </div>

          {/* Error banner (only shown when there is an error) */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700"
                role="alert"
              >
                <WifiOff size={16} className="flex-shrink-0 mt-0.5 text-rose-500" />
                <p className="flex-1">{error}</p>
                <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-700 p-1" aria-label="Dismiss"><X size={14} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate button */}
          <motion.button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            whileHover={{ scale: canGenerate && !generating ? 1.02 : 1 }}
            whileTap={{ scale: canGenerate && !generating ? 0.98 : 1 }}
            className={`w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md select-none ${
              canGenerate && !generating
                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-200 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {generating
              ? <><Loader2 size={18} className="animate-spin" /> AI is writing your letter â€” this may take ~30 sâ€¦</>
              : <><Edit3 size={18} /> Generate Cover Letter</>
            }
          </motion.button>
        </div>

        {/* Generated cover letter output (only shown after generation succeeds) */}
        <AnimatePresence>
          {coverLetter && (
            <motion.div
              key="cover-letter-result"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.45 }}
              className="mt-6 bg-white rounded-2xl border border-violet-200 shadow-sm overflow-hidden"
            >
              {/* Header bar with copy button */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-violet-100 bg-violet-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Edit3 size={14} className="text-violet-600" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm">Your Cover Letter</span>
                  <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-200 ml-1">
                    AI Generated
                  </span>
                </div>
                <motion.button
                  onClick={handleCopy}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    copied
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:text-violet-700'
                  }`}
                  aria-label="Copy cover letter"
                >
                  {copied ? <><ClipboardCheck size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                </motion.button>
              </div>

              {/* Letter body â€” <pre> preserves newlines from the plain-text letter */}
              <div className="px-6 py-5">
                <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">{coverLetter}</pre>
              </div>

              {/* Disclaimer */}
              <div className="px-6 pb-5">
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <AlertCircle size={11} />
                  Review and personalise before sending â€” AI output may need minor editing.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}


// =============================================================================
// STATS SECTION
// =============================================================================
// Four number cards showing social proof statistics (hard-coded display values).

// TypeScript: define exactly which colour strings are allowed for StatColor.
// This prevents typos like "indgio" from slipping through.
type StatColor = 'indigo' | 'emerald' | 'violet' | 'amber'

// TypeScript interface: describes the shape of one stat object
interface Stat {
  icon:  React.ReactNode  // an icon component
  value: string           // display value like "50K+" or "<30s"
  label: string           // description label
  color: StatColor        // theme colour
}

const STATS: Stat[] = [
  { icon: <Users size={22} />,    value: '50K+', label: 'Resumes Analyzed',     color: 'indigo'  },
  { icon: <Award size={22} />,    value: '94%',  label: 'Match Accuracy',        color: 'emerald' },
  { icon: <BarChart2 size={22} />,value: '2',    label: 'AI Models at Work',     color: 'violet'  },
  { icon: <Clock size={22} />,    value: '<30s', label: 'Average Analysis Time', color: 'amber'   },
]

// CSS class lookup by colour name â€” avoids duplicating Tailwind classes
const statColors: Record<StatColor, { bg: string; icon: string; border: string }> = {
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  border: 'border-indigo-100'  },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  border: 'border-violet-100'  },
  amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   border: 'border-amber-100'   },
}

function StatsSection() {
  return (
    <section className="py-14 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-indigo-100 mb-4">
            <Award size={12} /> Trusted by Thousands
          </span>
          <h2 className="text-2xl font-bold text-slate-800">Results That Speak for Themselves</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            Join tens of thousands of job seekers who have used ResumeMatch AI to land interviews faster.
          </p>
        </div>

        {/* Four-column grid of stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {STATS.map((stat, i) => {
            const { bg, icon, border } = statColors[stat.color]
            return (
              <motion.div
                key={i}
                // whileInView triggers the animation when the card scrolls into view
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}  // only animate once, not every scroll
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className={`rounded-2xl border ${border} ${bg} p-6 flex flex-col items-center text-center gap-3`}
              >
                <div className={`w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm ${icon}`}>
                  {stat.icon}
                </div>
                <p className="text-3xl font-extrabold text-slate-800 leading-none">{stat.value}</p>
                <p className="text-xs text-slate-500 font-medium leading-tight">{stat.label}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}


// =============================================================================
// SCORE BREAKDOWN SECTION
// =============================================================================
// Explains the three signals that make up the match score, with animated bars.
interface BreakdownItem {
  label: string
  desc:  string
  pct:   number           // percentage weight (45, 30, 25)
  color: string           // Tailwind background class for the progress bar
  icon:  React.ReactNode
}

const BREAKDOWN_ITEMS: BreakdownItem[] = [
  { label: 'Skills Match',         desc: 'How many hard skills from the JD appear in your resume.',        pct: 45, color: 'bg-indigo-500',  icon: <Target   size={16} className="text-indigo-600"  /> },
  { label: 'Keyword Density',      desc: 'Frequency and placement of role-specific keywords.',             pct: 30, color: 'bg-emerald-500', icon: <FileText size={16} className="text-emerald-600" /> },
  { label: 'Experience Alignment', desc: 'Seniority level, years of experience, and domain overlap.',     pct: 25, color: 'bg-violet-500',  icon: <Briefcase size={16} className="text-violet-600" /> },
]

function ScoreBreakdownSection() {
  return (
    <section className="py-16 px-4 sm:px-6 bg-slate-50 border-y border-slate-100">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-violet-100 mb-4">
            <BarChart2 size={12} /> Score Methodology
          </span>
          <h2 className="text-2xl font-bold text-slate-800">How Your Score Is Calculated</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            We combine three weighted signals to produce a holistic compatibility score.
          </p>
        </div>

        <div className="space-y-5">
          {BREAKDOWN_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.12 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
            >
              {/* Label and weight percentage */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-700 tabular-nums">{item.pct}%</span>
              </div>

              {/* Animated progress bar */}
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${item.color}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${item.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: i * 0.12 + 0.2, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Final score = weighted sum of signals, clamped to a realistic 35â€“97 range to avoid misleading extremes.
        </p>
      </div>
    </section>
  )
}


// =============================================================================
// TESTIMONIALS SECTION
// =============================================================================
// Hard-coded quote cards from fictional users.
interface Testimonial {
  name:     string
  role:     string
  company:  string
  initials: string
  color:    string   // Tailwind background class for the avatar circle
  quote:    string
  stars:    number
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Riya Mehta', role: 'Software Engineer', company: 'Google', initials: 'RM', color: 'bg-indigo-500', stars: 5,
    quote: 'ResumeMatch flagged 8 missing keywords I never would have noticed. I updated my resume that night and got a callback within 3 days. Honestly, this tool changed my job search.',
  },
  {
    name: 'Marcus Johnson', role: 'Product Manager', company: 'Stripe', initials: 'MJ', color: 'bg-emerald-500', stars: 5,
    quote: 'I was getting screened out by ATS systems constantly. After using ResumeMatch to tailor each application, my interview rate went from 5% to over 30%. Game changer.',
  },
  {
    name: 'Aisha Patel', role: 'Data Scientist', company: 'Meta', initials: 'AP', color: 'bg-violet-500', stars: 5,
    quote: 'The skill gap analysis is incredibly accurate. It caught that I was listing "ML" but the job wanted "Machine Learning" spelled out â€” tiny detail, huge impact on ATS parsing.',
  },
]

function TestimonialsSection() {
  return (
    <section className="py-16 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-emerald-100 mb-4">
            <Star size={12} /> Success Stories
          </span>
          <h2 className="text-2xl font-bold text-slate-800">What Job Seekers Are Saying</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">Real results from real people who tailored their resumes with ResumeMatch AI.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.45, delay: i * 0.12 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4"
            >
              {/* Star rating */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, s) => (
                  <Star key={s} size={14} className="text-amber-400 fill-amber-400" />
                ))}
              </div>

              {/* Quote text */}
              <p className="text-sm text-slate-600 leading-relaxed flex-1">"{t.quote}"</p>

              {/* Author info */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${t.color}`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role} Â· {t.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}


// =============================================================================
// FAQ SECTION
// =============================================================================
// Accordion-style frequently asked questions. One question can be open at a time.
interface FaqItem { q: string; a: string }

const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'How does the AI matching work?',
    a: 'We run your resume and the job description through two HuggingFace models: a Named Entity Recognition (NER) model that extracts skills, and a zero-shot classifier that identifies strengths and gaps. The final score combines skills overlap, keyword density, and experience alignment.',
  },
  {
    q: 'Is my resume data stored or shared?',
    a: 'No. Your resume is processed in memory only and discarded immediately after analysis. We never write your file to disk or share it with any third party.',
  },
  {
    q: 'What file formats are supported?',
    a: 'We currently support PDF files. For best results, ensure your PDF contains selectable text (not a scanned image).',
  },
  {
    q: 'How accurate is the match score?',
    a: 'Our scoring reflects keyword and skill alignment â€” the same signals ATS systems use. Treat the score as a strong directional signal rather than a guarantee.',
  },
  {
    q: 'Why does the analysis take up to 30 seconds?',
    a: 'The HuggingFace Inference API may cold-start models that have not been used recently. Once warm, analysis typically completes in 5â€“10 seconds.',
  },
  {
    q: 'Is ResumeMatch AI really free?',
    a: 'Yes â€” completely free, no account required.',
  },
]

function FAQSection() {
  // openIndex: which FAQ item is currently expanded (null = all closed)
  // TypeScript `number | null` means it can be either a number or null
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  // Toggle: if clicking the already-open item, close it; otherwise open the clicked one
  const toggle = (i: number) => setOpenIndex(prev => (prev === i ? null : i))

  return (
    <section className="py-16 px-4 sm:px-6 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-slate-200 mb-4">
            <Shield size={12} /> FAQ
          </span>
          <h2 className="text-2xl font-bold text-slate-800">Frequently Asked Questions</h2>
          <p className="text-slate-500 text-sm mt-2">Everything you need to know before you start.</p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.35, delay: i * 0.07 }}
              className="rounded-2xl border border-slate-200 overflow-hidden"
            >
              {/* Question row (always visible) */}
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left bg-white hover:bg-slate-50 transition-colors"
                aria-expanded={openIndex === i}
              >
                <span className="font-semibold text-slate-800 text-sm leading-snug">{item.q}</span>
                {/* Chevron rotates 180Â° when open */}
                <motion.span
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex-shrink-0 text-slate-400"
                >
                  <ChevronDown size={18} />
                </motion.span>
              </button>

              {/* Answer (animates open/closed) */}
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    key="answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}


// =============================================================================
// CTA BANNER
// =============================================================================
// A full-width call-to-action that scrolls the user back to the analyzer.
function CTABanner() {
  // Smooth-scroll to the analyzer section when the button is clicked
  const scrollToAnalyzer = () => {
    document.querySelector('[aria-label="Resume analyzer"]')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="py-20 px-4 sm:px-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-xs font-semibold px-4 py-1.5 rounded-full border border-white/20 mb-6">
            <Zap size={12} /> Free Â· No Sign-up Required
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">Ready to Land That Interview?</h2>
          <p className="text-indigo-200 text-base leading-relaxed mb-8 max-w-xl mx-auto">
            Upload your resume right now and discover exactly what's keeping you from the shortlist â€” then fix it in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <motion.button
              onClick={scrollToAnalyzer}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-white text-indigo-700 font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all text-sm"
            >
              <Zap size={18} /> Analyze My Resume Now <ChevronRight size={16} />
            </motion.button>
            <div className="flex items-center gap-2 text-indigo-200 text-xs">
              <Lock size={13} />
              <span>Your data is never stored</span>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-indigo-200 text-xs">
            {['No account needed', '100% free forever', 'Results in seconds', 'Privacy guaranteed'].map(feat => (
              <span key={feat} className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-indigo-300" /> {feat}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}


// =============================================================================
// FOOTER
// =============================================================================
function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          {/* Brand mark */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-semibold text-slate-200">ResumeMatch</span>
            <span className="text-slate-600 ml-2">Â© {new Date().getFullYear()}</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-white transition-colors text-xs">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors text-xs">Terms of Service</a>
            <a
              href="https://github.com/Devpatel954"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors text-xs flex items-center gap-1.5"
            >
              <Github size={13} /> GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}


// =============================================================================
// MAIN APP COMPONENT
// =============================================================================
// This is the root component that React renders into the page.
// It owns the shared state (file, jobDescription, results) and passes it down
// to child components as props.
//
// WHAT IS STATE?
//   State is data that can change and should cause the UI to update.
//   Each `useState` call returns [currentValue, setterFunction].
//   Calling the setter causes React to re-render only the affected parts.
export default function App() {
  // The PDF file the user selected (null if nothing selected yet)
  const [file, setFile] = useState<File | null>(null)

  // The job description text typed/pasted into the textarea
  const [jobDescription, setJobDescription] = useState('')

  // Whether the backend request is currently in progress
  const [loading, setLoading] = useState(false)

  // The analysis results returned from the backend (null until analysis runs)
  const [results, setResults] = useState<AnalysisResult | null>(null)

  // An error message to display to the user (null if no error)
  const [error, setError] = useState<string | null>(null)

  // The "Analyze" button is only enabled when both inputs are provided
  const canAnalyze = file !== null && jobDescription.trim().length >= 50

  // Called when the user clicks "Analyze My Resume"
  const handleAnalyze = async () => {
    if (!canAnalyze || loading) return  // prevent double-clicks

    setLoading(true)
    setResults(null)
    setError(null)

    try {
      // Build the multipart form data (file + text field)
      const formData = new FormData()
      formData.append('resume',          file)
      formData.append('job_description', jobDescription)

      // POST the form data to the backend /analyze endpoint
      const response = await fetch(`${API_BASE}/analyze`, { method: 'POST', body: formData })

      if (!response.ok) {
        // Parse and re-throw the backend error message
        const errData = await response.json().catch(() => ({}))
        throw new Error(
          (errData as { detail?: string }).detail ||
          `Server returned ${response.status}. Check that the backend is running.`
        )
      }

      // Parse the JSON response and store it as results
      const data = await response.json() as AnalysisResult
      setResults(data)

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Give the user a helpful hint if the backend is not running
      if (msg.includes('fetch')) {
        setError('Cannot reach the backend. Make sure the Node.js server is running on http://localhost:8000 (run: npm run dev in /backend).')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // Resets all state so the user can start a new analysis
  const handleReset = () => {
    setFile(null)
    setJobDescription('')
    setResults(null)
    setError(null)
  }

  // The return value is JSX â€” it looks like HTML but is actually JavaScript.
  // React converts this into real DOM elements in the browser.
  return (
    <div className="min-h-screen bg-white text-slate-800 antialiased">
      <Header />

      {/* â”€â”€ Hero Section â”€â”€ */}
      <section className="pt-32 pb-16 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut' }}>
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-indigo-100 mb-6 shadow-sm">
              <Zap size={12} className="flex-shrink-0" />
              AI-Powered Â· Instant Analysis Â· 100% Free
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-5">
              Master Your Next<br />
              <span className="text-indigo-600">Job Application</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed">
              Upload your resume, paste a job description, and get an AI-powered compatibility score with actionable feedback â€” in seconds.
            </p>
          </motion.div>
        </div>
      </section>

      {/* â”€â”€ Informational Sections â”€â”€ */}
      <HowItWorks />
      <StatsSection />

      {/* â”€â”€ Analyzer: the main interactive section â”€â”€ */}
      <section className="py-16 px-4 sm:px-6" aria-label="Resume analyzer">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-slate-800">Analyze Your Resume</h2>
            <p className="text-sm text-slate-500 mt-1">Both fields required. Job description must be at least 50 characters.</p>
          </div>

          {/* Side-by-side inputs: resume upload (left) and job description (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: file dropzone */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col min-h-[240px]">
              <FileDropzone file={file} onFile={setFile} />
            </div>

            {/* Right: job description textarea */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <label htmlFor="jd-input" className="block text-sm font-semibold text-slate-700 mb-3">
                <span className="flex items-center gap-2">
                  <FileText size={15} className="text-indigo-500" /> Job Description
                </span>
              </label>
              <textarea
                id="jd-input"
                className="flex-1 min-h-[180px] w-full p-3.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all placeholder-slate-400 leading-relaxed"
                placeholder="Paste the full job posting hereâ€¦"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              {/* Character counter with colour-coded status */}
              <p className="text-xs text-slate-400 mt-2 flex justify-between">
                <span>{jobDescription.length} characters</span>
                {jobDescription.length > 0 && jobDescription.length < 50 && (
                  <span className="text-amber-500">{50 - jobDescription.length} more characters needed</span>
                )}
                {jobDescription.length >= 50 && (
                  <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={11} /> Ready</span>
                )}
              </p>
            </div>
          </div>

          {/* Error banner â€” AnimatePresence makes it slide in/out smoothly */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mt-5 flex items-start gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700"
                role="alert"
              >
                <WifiOff size={18} className="flex-shrink-0 mt-0.5 text-rose-500" />
                <div className="flex-1">
                  <p className="font-semibold mb-0.5">Analysis failed</p>
                  <p className="text-rose-600 leading-relaxed">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-700 transition-colors p-1" aria-label="Dismiss error">
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analyze / Reset buttons */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* Analyze button â€” disabled when inputs are incomplete or request is loading */}
            <motion.button
              onClick={handleAnalyze}
              disabled={!canAnalyze || loading}
              whileHover={{ scale: canAnalyze && !loading ? 1.03 : 1 }}
              whileTap={{ scale: canAnalyze && !loading ? 0.97 : 1 }}
              className={`inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-md select-none ${
                canAnalyze && !loading
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> Analyzing â€” this may take ~30 sâ€¦</>
                : <><Sparkles size={18} /> Analyze My Resume</>
              }
            </motion.button>

            {/* Reset button â€” only shown after results have loaded */}
            {results && (
              <button
                onClick={handleReset}
                className="text-sm text-slate-500 hover:text-slate-800 transition-colors px-4 py-2 rounded-lg hover:bg-slate-100"
              >
                Start Over
              </button>
            )}
          </div>

          {/* Results dashboard â€” shown after a successful analysis */}
          <AnimatePresence mode="wait">
            {results && <ResultsDashboard data={results} />}
          </AnimatePresence>
        </div>
      </section>

      {/* â”€â”€ Additional page sections â”€â”€ */}
      <ScoreBreakdownSection />
      <CoverLetterSection file={file} jobDescription={jobDescription} />
      <TestimonialsSection />
      <FAQSection />
      <CTABanner />
      <Footer />
    </div>
  )
}
