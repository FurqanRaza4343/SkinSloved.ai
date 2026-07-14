"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mic, Stethoscope, Play, Download, AlertTriangle, Calendar, Clock, Image, Loader2, ShoppingCart, ExternalLink, Sparkles } from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { useAuth } from "@/lib/auth-context"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface ConsultationData {
  id: string
  patient_text: string
  doctor_response: string | null
  severity: string | null
  status: string
  created_at: string
  image_url: string | null
  audio_url: string | null
  products_text: string | null
}

export default function ConsultationDetailPage() {
  const params = useParams()
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [consultation, setConsultation] = useState<ConsultationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push("/login"); return }
    fetchConsultation()
  }, [authLoading, user, params.id])

  const fetchConsultation = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${BACKEND}/api/consultations/${params.id}`, {
        headers: { "X-User-Id": user!.id },
      })
      if (!response.ok) throw new Error("Consultation not found")
      const data = await response.json()
      setConsultation(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getSeverityLabel = (text: string): "mild" | "moderate" | "urgent" => {
    const lower = text.toLowerCase()
    if (lower.includes("urgent") || lower.includes("serious")) return "urgent"
    if (lower.includes("moderate") || lower.includes("inflammation")) return "moderate"
    return "mild"
  }

  const downloadPdf = () => {
    window.open(`${BACKEND}/api/consultations/${params.id}/report`, "_blank")
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !consultation) {
    return (
      <>
        <Navbar />
        <main className="pt-24 min-h-screen pb-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center py-16">
            <p className="text-lg font-semibold text-muted-foreground">{error || "Consultation not found"}</p>
            <Link href="/dashboard"><Button className="mt-4">Back to Dashboard</Button></Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const severity = getSeverityLabel(consultation.patient_text)
  const date = new Date(consultation.created_at)

  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold tracking-tight">Consultation Detail</h1>
                  <Badge variant={severity}>{severity}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
              <Button variant="outline" className="gap-2" onClick={downloadPdf}>
                <Download className="h-4 w-4" /> Download PDF Report
              </Button>
            </div>

            {consultation.image_url && (
              <Card className="border-border/60 mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Image className="h-5 w-5 text-primary" /> Uploaded Skin Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl overflow-hidden bg-muted/50">
                    <img src={consultation.image_url} alt="Skin image" className="w-full h-64 object-contain" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/60 mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" /> Your Speech Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-xl bg-muted/50 italic text-muted-foreground">&ldquo;{consultation.patient_text}&rdquo;</div>
              </CardContent>
            </Card>

            <Card className="border-border/60 mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-sky-500 to-teal-500" />
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" /> Doctor&apos;s Guidance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-relaxed whitespace-pre-wrap">{consultation.doctor_response || "No analysis available."}</p>
              </CardContent>
            </Card>

            {consultation.products_text && (
              <Card className="border-border/60 mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" /> Recommended Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 dark:from-sky-950/20 dark:to-teal-950/20 border border-sky-100 dark:border-sky-900/50">
                    <div className="flex items-start gap-2 mb-3">
                      <Sparkles className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">Based on your skin analysis, these products may help:</p>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{consultation.products_text}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/70">
                      <ExternalLink className="h-3 w-3" />
                      <span>Search these on Amazon or your local pharmacy</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {consultation.audio_url && (
              <Card className="border-border/60 mb-6">
                <CardContent className="p-4 flex items-center gap-4">
                  <Button size="icon" className="h-12 w-12 rounded-full medical-gradient text-white shadow-lg shrink-0">
                    <Play className="h-5 w-5 ml-0.5" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Doctor Voice Response</p>
                    <p className="text-xs text-muted-foreground">Listen to the AI doctor&apos;s audio response</p>
                  </div>
                  <audio controls src={consultation.audio_url} className="hidden" />
                </CardContent>
              </Card>
            )}

            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-400">
                <strong>Important:</strong> This analysis is generated by AI and is for informational purposes only. It does not constitute a medical diagnosis. Please consult a licensed dermatologist for professional medical advice.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}
