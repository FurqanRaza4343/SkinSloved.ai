export interface Consultation {
  id: string
  patient_text: string
  doctor_response: string | null
  severity: string | null
  status: string
  created_at: string
  image_url: string | null
  audio_url: string | null
}

export interface Detection {
  disease: string
  confidence: number
  severity: string
}

export interface Product {
  brand: string
  name: string
  category: string
  key_ingredients: string[]
  description: string
  price_range: string
  image_url: string | null
  amazon_search_url: string
}

export interface DiaryEntry {
  id: string
  patient_text: string
  doctor_response: string | null
  severity: string | null
  status: string
  created_at: string
  image_url: string | null
}

export type Severity = "mild" | "moderate" | "urgent"

export const SEVERITY_COLORS: Record<Severity, string> = {
  mild: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  moderate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

export const SEVERITY_BG: Record<Severity, string> = {
  mild: "bg-emerald-500",
  moderate: "bg-amber-500",
  urgent: "bg-red-500",
}
