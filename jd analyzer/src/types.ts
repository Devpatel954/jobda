// Shared TypeScript types for the JD Analyzer frontend

export interface AnalysisResult {
  score: number
  strengths: string[]
  missingKeywords: string[]
  tips: string[]
  foundSkills: string[]
  requiredSkills: string[]
}

export interface FeedbackCardProps {
  icon: React.ReactNode
  title: string
  items: string[]
  color: 'green' | 'red' | 'indigo'
  delay?: number
}

export interface SkillPillProps {
  label: string
  found: boolean
}

export interface CircularProgressProps {
  value: number
}

export interface ResultsDashboardProps {
  data: AnalysisResult
}

export interface FileDropzoneProps {
  file: File | null
  onFile: (file: File | null) => void
}

export interface CoverLetterSectionProps {
  file: File | null
  jobDescription: string
}
