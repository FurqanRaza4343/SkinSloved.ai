"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, Sparkles, AlertTriangle, Stethoscope,
  CalendarDays, Shield, Syringe, BookOpen, Brain, Loader2
} from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"

const severityColors: Record<string, string> = {
  mild: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  moderate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  severe: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const categoryIcons: Record<string, string> = {
  Inflammatory: "🔴", Infectious: "🦠", Autoimmune: "🛡️",
  Pigmentary: "🎨", Growth: "⚠️", Reaction: "🔥",
  Vascular: "💉", Genetic: "🧬",
}

interface ConditionData {
  slug: string
  name: string
  category: string
  severity: string
  description: string
  symptoms: string[]
  causes: string
  treatment: string
  risk_factors: string
  when_to_see_doctor: string
  seasonality: string
  common_in: string
  prevention: string
  pdf_source: boolean
}

export default function ConditionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [condition, setCondition] = useState<ConditionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [userMessage, setUserMessage] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchCondition = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "https://skin-sloved-api-d147cddd-7969-4814-a9d5-165f122a1278.fly.dev"}/api/conditions/${params.slug}`,
          { signal: controller.signal }
        )
        clearTimeout(timeout)
        if (!res.ok) throw new Error("Condition not found")
        const data = await res.json()
        setCondition(data)
      } catch (e) {
        setError("Could not load condition information.")
      } finally {
        setLoading(false)
      }
    }
    if (params.slug) fetchCondition()
  }, [params.slug])

  const handleAnalyze = async () => {
    if (!userMessage.trim() || !condition) return
    setAnalyzing(true)
    setAnalysisResult("")
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "https://skin-sloved-api-d147cddd-7969-4814-a9d5-165f122a1278.fly.dev"}/api/conditions/analyze/${condition.slug}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage }),
        }
      )
      if (!res.ok) throw new Error("Analysis failed")
      const data = await res.json()
      setAnalysisResult(data.analysis)
    } catch (e) {
      setAnalysisResult("Sorry, analysis failed. Please try again.")
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="pt-24 min-h-screen pb-16">
          <div className="mx-auto max-w-4xl px-4 animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mb-4" />
            <div className="h-48 w-full bg-muted rounded mb-4" />
            <div className="h-64 w-full bg-muted rounded" />
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (error || !condition) {
    return (
      <>
        <Navbar />
        <main className="pt-24 min-h-screen pb-16">
          <div className="mx-auto max-w-4xl px-4 text-center py-16">
            <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h1 className="text-2xl font-bold mb-2">Condition Not Found</h1>
            <p className="text-muted-foreground mb-6">{error || "This condition does not exist in our knowledge base."}</p>
            <Button onClick={() => router.push("/conditions")} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Conditions
            </Button>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Button variant="ghost" onClick={() => router.push("/conditions")} className="mb-4 gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to Conditions
            </Button>

            <div className="flex items-start gap-4 mb-6">
              <span className="text-5xl">{categoryIcons[condition.category] || "🔬"}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-3xl sm:text-4xl font-bold">{condition.name}</h1>
                  <Badge className={severityColors[condition.severity]}>{condition.severity}</Badge>
                  <Badge variant="outline">{condition.category}</Badge>
                </div>
                <p className="text-muted-foreground text-lg">{condition.description}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" /> Seasonality
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{condition.seasonality}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{condition.risk_factors}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> When to See a Doctor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{condition.when_to_see_doctor}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Medical Overview
                  {condition.pdf_source && (
                    <Badge variant="secondary" className="text-[10px]">PDF Source</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {condition.causes && (
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Causes</h3>
                    <p className="text-muted-foreground text-sm">{condition.causes}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-sm mb-2">Symptoms</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {condition.symptoms.map(s => (
                      <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border/40">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-1">Treatment</h3>
                  <p className="text-muted-foreground text-sm">{condition.treatment}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-sm mb-1">Prevention</h3>
                  <p className="text-muted-foreground text-sm">{condition.prevention}</p>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => {
                      setUserMessage(`Tell me more about ${condition.name} — its causes, symptoms, treatment options, and what I should do.`)
                      setTimeout(() => {
                        document.getElementById("ai-ask-section")?.scrollIntoView({ behavior: "smooth" })
                      }, 100)
                    }}
                    className="medical-gradient text-white gap-1.5"
                  >
                    <Sparkles className="h-4 w-4" /> Analyze with AI
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6 border-primary/20" id="ai-ask-section">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Ask AI About {condition.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Ask our AI anything about this condition — symptoms, treatment options, prevention tips, or your specific concerns.
                </p>
                <textarea
                  placeholder={`Ask about ${condition.name}...`}
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 resize-none"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={!userMessage.trim() || analyzing}
                  className="gap-1.5"
                >
                  {analyzing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Get Analysis</>
                  )}
                </Button>

                {analysisResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 dark:from-sky-950/30 dark:to-teal-950/30 border border-sky-100 dark:border-sky-900/50"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">AI Analysis</p>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{analysisResult}</p>
                        <p className="text-xs text-muted-foreground/60 mt-3 italic">
                          This information is for educational purposes only and does not constitute medical advice.
                          Always consult a qualified dermatologist for diagnosis and treatment.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}
