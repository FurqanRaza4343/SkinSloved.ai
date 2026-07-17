"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, Mic, Stethoscope, Download, AlertTriangle, Calendar, Clock,
  Loader2, ShoppingCart, ExternalLink, Sparkles, Bot, Send, MessageSquare
} from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { useAuth } from "@/lib/auth-context"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DiseaseChart, SeverityGauge } from "@/components/consult/disease-chart"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface Detection {
  disease: string
  confidence: number
  severity: string
}

interface Product {
  brand: string
  name: string
  category: string
  key_ingredients: string[]
  description: string
  price_range: string
  image_url: string | null
  amazon_search_url: string
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

interface ConsultationData {
  id: string
  patient_text: string
  doctor_response: string | null
  severity: string | null
  status: string
  created_at: string
  image_url: string | null
  audio_url: string | null
  products: Product[]
  detections?: Detection[]
  explanation?: string
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

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput("")
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }])
    setChatLoading(true)
    try {
      const resp = await fetch(`${BACKEND}/api/consultations/${params.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user!.id },
        body: JSON.stringify({
          message: userMsg,
          patient_text: consultation.patient_text,
          doctor_response: consultation.doctor_response,
        }),
      })
      if (!resp.ok) throw new Error("Chat failed")
      const data = await resp.json()
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response }])
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process that. Please try again." }])
    } finally {
      setChatLoading(false)
    }
  }

  const severity = consultation.severity || getSeverityLabel(consultation.patient_text)
  const date = new Date(consultation.created_at)

  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold tracking-tight">Consultation Detail</h1>
                  <Badge variant={severity as any}>{severity}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              <Button variant="outline" className="gap-2" onClick={downloadPdf}>
                <Download className="h-4 w-4" /> Download PDF Report
              </Button>
            </div>

            {/* Disease Detections + Severity */}
            {consultation.detections && consultation.detections.length > 0 && (
              <div className="grid sm:grid-cols-5 gap-4 mb-6">
                <Card className="sm:col-span-1 border-border/60">
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <SeverityGauge severity={severity} />
                  </CardContent>
                </Card>
                <Card className="sm:col-span-4 border-border/60">
                  <CardContent className="p-4">
                    <DiseaseChart detections={consultation.detections} />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* AI Explanation */}
            {consultation.explanation && (
              <Card className="border-border/60 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-sky-500 to-teal-500" />
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    AI Analysis & Reasoning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 dark:from-sky-950/20 dark:to-teal-950/20 border border-sky-100 dark:border-sky-900/50">
                    <Sparkles className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed">{consultation.explanation}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Image */}
            {consultation.image_url && (
              <Card className="border-border/60 mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" /> Uploaded Skin Image
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl overflow-hidden bg-muted/50">
                    <img src={consultation.image_url} alt="Skin image" className="w-full h-64 object-contain" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Transcript */}
            <Card className="border-border/60 mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" /> Your Speech Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-xl bg-muted/50 italic text-muted-foreground">
                  &ldquo;{consultation.patient_text}&rdquo;
                </div>
              </CardContent>
            </Card>

            {/* Doctor's Guidance */}
            <Card className="border-border/60 mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-sky-500 to-teal-500" />
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" /> Doctor&apos;s Guidance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {consultation.doctor_response || "No analysis available."}
                </p>
              </CardContent>
            </Card>

            {/* Products */}
            {consultation.products?.length > 0 && (
              <Card className="border-border/60 mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" /> Recommended Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {consultation.products.map((product, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl border border-border/60 bg-card hover:shadow-md transition-shadow">
                        <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="h-full w-full object-contain" />
                          ) : (
                            <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{product.brand}</p>
                          <p className="text-xs text-muted-foreground truncate">{product.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs font-medium text-sky-600">{product.price_range}</span>
                            <span className="text-xs text-muted-foreground/50">•</span>
                            <span className="text-xs text-muted-foreground capitalize">{product.category}</span>
                          </div>
                          {product.key_ingredients?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {product.key_ingredients.slice(0, 2).map((ing, j) => (
                                <span key={j} className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 truncate max-w-24">{ing}</span>
                              ))}
                            </div>
                          )}
                          <a href={product.amazon_search_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                          >
                            <ExternalLink className="h-3 w-3" /> Search on Amazon
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Audio Player */}
            {consultation.audio_url && (
              <Card className="border-border/60 mb-6">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-2">Doctor Voice Response</p>
                  <audio controls src={consultation.audio_url} className="w-full" />
                </CardContent>
              </Card>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 mb-6">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-400">
                <strong>Important:</strong> This analysis is generated by AI and is for informational purposes only.
                It does not constitute a medical diagnosis. Please consult a licensed dermatologist for professional medical advice.
              </p>
            </div>

            {/* AI Chat */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Ask AI About This Consultation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-4 max-h-80 overflow-y-auto">
                  {chatMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Ask questions about your skin concern, treatment options, or products.
                    </p>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-sky-500 to-teal-500 text-white"
                          : "bg-muted/50 border border-border/60"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted/50 border border-border/60 p-3 rounded-xl">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); sendChatMessage() }} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a follow-up question..."
                    className="flex-1 h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={chatLoading}
                  />
                  <Button type="submit" size="icon" disabled={chatLoading || !chatInput.trim()} className="shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}
