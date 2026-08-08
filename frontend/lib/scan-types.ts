export interface ScanHistoryEntry {
  scan_id: string
  skin_profile: {
    skin_type?: string
    fitzpatrick?: string
    undertone?: string
    tone_label?: string
  } | null
  detections: Array<{ feature: string; confidence: number; severity: string; description?: string }>
  skin_score: number | null
  severity: string | null
  explanation: string | null
  treatment: string | null
  recommendations: Array<{ feature: string; recommendation: string }> | null
  products: Array<Record<string, unknown>>
  image_url: string | null
  audio_url: string | null
  pdf_url: string | null
  created_at: string
}