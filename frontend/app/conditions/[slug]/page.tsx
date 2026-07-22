"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, Sparkles, AlertTriangle, Stethoscope,
  CalendarDays, Shield, BookOpen, Brain, Loader2,
  Bot, Send
} from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://skin-sloved-api-d147cddd-7969-4814-a9d5-165f122a1278.fly.dev"

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

function ConditionChat({ condition }: { condition: ConditionData }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!initialized && condition) {
      setInitialized(true)
      const greetings = [
        `Hi! I'm your AI skin coach. I can help you understand ${condition.name} better. What would you like to know?`,
        `Hello! Ask me anything about ${condition.name} — symptoms, treatment, prevention, or anything else.`,
        `Welcome! I'm here to help you learn about ${condition.name}. What questions do you have?`,
      ]
      setMessages([{ role: "assistant", content: greetings[Math.floor(Math.random() * greetings.length)] }])
    }
  }, [initialized, condition])

  const sendMessage = async (msg?: string) => {
    const text = msg || input
    if (!text.trim() || loading) return
    const userMsg = text.trim()
    setMessages(prev => [...prev, { role: "user", content: userMsg }])
    if (!msg) setInput("")
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/conditions/analyze/${condition.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.analysis }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't analyze that right now. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    `What are the symptoms of ${condition.name}?`,
    `How is ${condition.name} treated?`,
    `What causes ${condition.name}?`,
    `How can I prevent ${condition.name}?`,
    `When should I see a doctor?`,
    `Is ${condition.name} contagious?`,
  ]

  return (
    <Card className="border-primary/20" id="ai-ask-section">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Skin Coach
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => { setMessages([]); setInitialized(false) }} className="h-8 text-xs gap-1">
          <Sparkles className="h-3 w-3" /> New Chat
        </Button>
      </CardHeader>
      <CardContent>
        <div className="h-72 sm:h-96 overflow-y-auto mb-3 space-y-3 rounded-xl bg-muted/30 p-3 border border-border/40">
          {messages.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Ask me anything about {condition.name}</p>
              <p className="text-xs mt-1">Symptoms, treatment, prevention, and more</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border/60 text-card-foreground rounded-bl-md"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl px-4 py-2.5 bg-card border border-border/60 rounded-bl-md">
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {quickActions.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-accent border border-border/60 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendMessage() }}
            placeholder={`Ask about ${condition.name}...`}
            className="flex-1 h-10 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 medical-gradient text-white"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/60 mt-2 italic text-center">
          For educational purposes only. Always consult a qualified dermatologist.
        </p>
      </CardContent>
    </Card>
  )
}

export default function ConditionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [condition, setCondition] = useState<ConditionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchCondition = async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)
        const res = await fetch(
          `${BACKEND}/api/conditions/${params.slug}`,
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
              </CardContent>
            </Card>

            <ConditionChat condition={condition} />
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}