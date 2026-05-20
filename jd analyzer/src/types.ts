// =============================================================================
// TYPESCRIPT TYPES — Shared type definitions for the JD Analyzer frontend
// =============================================================================
//
// WHAT ARE TYPESCRIPT TYPES?
//   A type (or interface) is a contract that describes the exact shape of a
//   data object. TypeScript uses these at compile time to catch mistakes before
//   the code ever runs in the browser.
//
//   Example: if the backend sends { score: 75 } and our code tries to read
//   result.scor (a typo), TypeScript will show a red underline immediately
//   instead of silently failing at runtime.
//
// These types are defined once here and imported wherever they are needed,
// so we only have to update the shape in one place if the backend API changes.
// =============================================================================

// AnalysisResult — the JSON object returned by POST /analyze on the backend.
// Every field maps directly to a property in the backend's res.json({...}) call.
export interface AnalysisResult {
  score:           number    // 0–100 match percentage (clamped to 35–97 in practice)
  strengths:       string[]  // 3 sentences about what the candidate does well
  missingKeywords: string[]  // up to 6 "X is missing from your resume" sentences
  tips:            string[]  // 3 actionable improvement suggestions
  foundSkills:     string[]  // skills that appear in both resume and job description
  requiredSkills:  string[]  // skills in the job description but absent from the resume
}

// FeedbackCardProps — the inputs ("props") accepted by the FeedbackCard component.
// React props are like function arguments: the parent passes them in,
// the child receives and renders them.
export interface FeedbackCardProps {
  icon:   React.ReactNode          // any renderable React element (e.g. an icon component)
  title:  string                   // card heading (e.g. "Strengths")
  items:  string[]                 // bullet-point text lines
  color:  'green' | 'red' | 'indigo'  // which colour theme to use
  delay?: number                   // optional: animation delay in seconds (default: 0)
  // The `?` after `delay` means this prop is optional
}

// SkillPillProps — inputs for the SkillPill badge component
export interface SkillPillProps {
  label: string   // the skill name to display (e.g. "React")
  found: boolean  // true = green/checkmark, false = red/X
}

// CircularProgressProps — inputs for the animated circular progress ring
export interface CircularProgressProps {
  value: number  // score from 0 to 100
}

// ResultsDashboardProps — inputs for the full results panel shown after analysis
export interface ResultsDashboardProps {
  data: AnalysisResult  // the entire analysis response from the backend
}

// FileDropzoneProps — inputs for the resume upload area
export interface FileDropzoneProps {
  file:   File | null                    // the currently selected file (null = nothing selected)
  onFile: (file: File | null) => void    // callback fired when the user selects or removes a file
  // `(file: File | null) => void` is a function type:
  //   it takes one argument (a File or null) and returns nothing (void)
}

// CoverLetterSectionProps — inputs for the cover letter generator
export interface CoverLetterSectionProps {
  file:           File | null  // resume file (must match the one used in the analyzer)
  jobDescription: string       // pre-filled from the main analyzer's textarea
}
