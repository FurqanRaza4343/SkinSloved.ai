"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Camera, Plus, Clock, Calendar, TrendingUp, Activity,
  ChevronLeft, ChevronRight, Sparkles, ImageIcon,
  Loader2, AlertCircle, ArrowLeft, LayoutGrid, SlidersHorizontal,
  Send, Bot, ChevronDown, ChevronUp, MessageSquare
} from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { BeforeAfterSlider } from "@/components/dashboard/before-after"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface Consultation {
  id: string
  patient_text: string
  doctor_response: string | null
  severity: string | null
  status: string
  created_at: string
  image_url: string | null
  audio_url: string | null
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function DiaryCalendar({
  consultations,
  selectedDate,
  onSelectDate,
}: {
  consultations: Consultation[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
}) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())

  const photoDates = useMemo(() => {
    const map = new Map<string, Consultation>()
    for (const c of consultations) {
      const key = c.created_at.slice(0, 10)
      if (!map.has(key)) map.set(key, c)
    }
    return map
  }, [consultations])

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1) }
    else setViewMonth(viewMonth - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1) }
    else setViewMonth(viewMonth + 1)
  }

  const isToday = (d: number) => {
    const d2 = new Date()
    return d2.getDate() === d && d2.getMonth() === viewMonth && d2.getFullYear() === viewYear
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">{MONTHS[viewMonth]} {viewYear}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-muted-foreground mb-1">
          {DAY_NAMES.map(d => <span key={d} className="py-1 font-medium">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-sm">
          {cells.map((d, i) => {
            if (!d) return <div key={`e-${i}`} />
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
            const consult = photoDates.get(dateStr)
            const isSel = selectedDate === dateStr
            const isT = isToday(d)
            return (
              <button
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                className={`relative py-1.5 rounded-lg transition-all text-xs
                  ${isSel ? "bg-primary text-primary-foreground font-bold ring-2 ring-primary/30" : "hover:bg-accent"}
                  ${isT && !isSel ? "ring-1 ring-primary/40 font-semibold" : ""}
                `}
              >
                {d}
                {consult && (
                  <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full
                    ${consult.severity === "urgent" ? "bg-red-500" : consult.severity === "moderate" ? "bg-amber-500" : "bg-emerald-500"}
                  `} />
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function DiaryChat({
  consultations,
  chatMessages,
  setChatMessages,
  chatLoading,
  setChatLoading,
  chatInput,
  setChatInput,
}: {
  consultations: Consultation[]
  chatMessages: { role: string; content: string }[]
  setChatMessages: React.Dispatch<React.SetStateAction<{ role: string; content: string }[]>>
  chatLoading: boolean
  setChatLoading: React.Dispatch<React.SetStateAction<boolean>>
  chatInput: string
  setChatInput: React.Dispatch<React.SetStateAction<string>>
}) {
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const sendMessage = async (msg: string) => {
    if (!msg.trim() || chatLoading) return
    const userMsg = msg.trim()
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }])
    setChatInput("")
    setChatLoading(true)
    try {
      const resp = await fetch(`${BACKEND}/api/diary/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          consultation_ids: consultations.map(c => c.id),
          history: chatMessages.slice(-10),
        }),
      })
      if (!resp.ok) throw new Error("Failed")
      const data = await resp.json()
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response }])
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't analyze your diary right now. Please try again." }])
    } finally {
      setChatLoading(false)
    }
  }

  const quickActions = [
    "How is my progress?",
    "Am I improving?",
    "What should I change?",
    "Rate my skin 1-10",
    "Compare first & last photo",
  ]

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Skin Coach
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-80 overflow-y-auto mb-3 space-y-3 rounded-xl bg-muted/30 p-3 border border-border/40">
          {chatMessages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Ask me about your skin progress!</p>
              <p className="text-xs mt-1">I can compare your photos, track changes, and give tips.</p>
            </div>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border/60 text-card-foreground rounded-bl-md"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-card border border-border/60 rounded-bl-md">
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

        {chatMessages.length === 0 && (
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
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendMessage(chatInput) }}
            placeholder="Ask about your skin progress..."
            className="flex-1 h-10 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 medical-gradient text-white"
            onClick={() => sendMessage(chatInput)}
            disabled={chatLoading || !chatInput.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DiaryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [selectedBefore, setSelectedBefore] = useState<number | null>(null)
  const [selectedAfter, setSelectedAfter] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [filterMonday, setFilterMonday] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatInput, setChatInput] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push("/login"); return }
    fetchData()
  }, [user, authLoading, router])

  const fetchData = async () => {
    setLoadingData(true); setError("")
    try {
      const resp = await fetch(`${BACKEND}/api/consultations`, {
        headers: { "X-User-Id": user!.id },
      })
      if (!resp.ok) throw new Error("Failed to load")
      const data = await resp.json()
      const withPhotos = data.filter((c: Consultation) => c.image_url)
      setConsultations(withPhotos)
      if (withPhotos.length >= 2) {
        setSelectedBefore(withPhotos.length - 1)
        setSelectedAfter(0)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingData(false)
    }
  }

  const sorted = [...consultations].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const firstDate = sorted.length > 0 ? sorted[0].created_at : null
  const lastDate = sorted.length > 0 ? sorted[sorted.length - 1].created_at : null
  const totalDays = firstDate && lastDate
    ? Math.max(1, Math.round((new Date(lastDate).getTime() - new Date(firstDate).getTime()) / 86400000))
    : 0

  const beforeConsult = selectedBefore !== null && sorted[selectedBefore] ? sorted[selectedBefore] : null
  const afterConsult = selectedAfter !== null && sorted[selectedAfter] ? sorted[selectedAfter] : null

  const todayStr = new Date().toISOString().slice(0, 10)
  const hasPhotoToday = sorted.some(c => c.created_at.slice(0, 10) === todayStr)

  const filteredSorted = useMemo(() => {
    if (!filterMonday || sorted.length === 0) return sorted
    const lastMonday = new Date()
    lastMonday.setDate(lastMonday.getDate() - ((lastMonday.getDay() + 6) % 7))
    lastMonday.setHours(0, 0, 0, 0)
    return sorted.filter(c => new Date(c.created_at) >= lastMonday)
  }, [sorted, filterMonday])

  const mondayStart = new Date()
  mondayStart.setDate(mondayStart.getDate() - ((mondayStart.getDay() + 6) % 7))

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <Badge variant="outline" className="gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-primary" /> Skin Diary
                  </Badge>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">My Skin Diary</h1>
                <p className="text-muted-foreground mt-1">Track your skin health journey with daily photo check-ins.</p>
              </div>
              <Link href="/diary/checkin">
                <Button size="lg" className="medical-gradient text-white shadow-lg gap-2 w-full sm:w-auto">
                  <Plus className="h-5 w-5" /> New Check-in
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Daily prompt */}
          {!hasPhotoToday && sorted.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Card className="border-2 border-dashed border-sky-200 dark:border-sky-800 bg-gradient-to-r from-sky-50/50 to-teal-50/50 dark:from-sky-950/10 dark:to-teal-950/10">
                <CardContent className="flex items-center justify-between p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <Camera className="h-8 w-8 text-sky-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">No check-in today</p>
                      <p className="text-xs text-muted-foreground">Take a photo to keep your streak going</p>
                    </div>
                  </div>
                  <Link href="/diary/checkin">
                    <Button size="sm" className="medical-gradient text-white shadow-lg gap-1.5 shrink-0">
                      <Camera className="h-4 w-4" /> Take Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {loadingData ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="font-semibold">Failed to load</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchData}>Try Again</Button>
            </div>
          ) : sorted.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-dashed border-2 border-border/40">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 dark:from-sky-900/30 dark:to-teal-900/30 flex items-center justify-center mb-6">
                    <Camera className="h-10 w-10 text-sky-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Start Your Skin Diary</h2>
                  <p className="text-muted-foreground text-center max-w-md mb-8">
                    Take your first skin photo to establish a baseline. Check in daily to track your progress!
                  </p>
                  <Link href="/diary/checkin">
                    <Button size="xl" className="medical-gradient text-white shadow-lg gap-2">
                      <Camera className="h-5 w-5" /> Take Your First Photo
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: Camera, label: "Total Photos", value: String(sorted.length), color: "from-sky-500 to-teal-500" },
                  { icon: Calendar, label: "Time Span", value: totalDays === 0 ? "Today" : `${totalDays} days`, color: "from-violet-500 to-purple-500" },
                  { icon: Activity, label: "Trend", value: sorted.some(c => c.severity === "urgent") ? "Needs attention" : sorted.some(c => c.severity === "moderate") ? "Moderate" : "Good", color: "from-amber-500 to-orange-500" },
                  { icon: TrendingUp, label: "Progress", value: sorted.length >= 2 ? "Tracking" : "Start tracking", color: "from-emerald-500 to-teal-500" },
                ].map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <Card className="border-border/60">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color}`}>
                            <stat.icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                            <p className="text-lg sm:text-xl font-bold">{stat.value}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Calendar + Chat Grid */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <DiaryCalendar
                    consultations={sorted}
                    selectedDate={selectedDate}
                    onSelectDate={(date) => {
                      setSelectedDate(date === selectedDate ? null : date)
                      const el = document.getElementById(`timeline-${date}`)
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
                    }}
                  />

                  {/* This Week filter */}
                  {sorted.length >= 3 && (
                    <button
                      onClick={() => setFilterMonday(!filterMonday)}
                      className={`mt-3 w-full text-xs px-3 py-2 rounded-lg border transition-colors flex items-center justify-center gap-1.5
                        ${filterMonday ? "bg-primary/10 border-primary/30 text-primary" : "border-border/60 hover:bg-accent"}
                      `}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {filterMonday ? "Show all photos" : "This week only"}
                    </button>
                  )}
                </motion.div>

                <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <DiaryChat
                    consultations={filteredSorted}
                    chatMessages={chatMessages}
                    setChatMessages={setChatMessages}
                    chatLoading={chatLoading}
                    setChatLoading={setChatLoading}
                    chatInput={chatInput}
                    setChatInput={setChatInput}
                  />
                </motion.div>
              </div>

              {/* Before/After Comparison */}
              {beforeConsult && afterConsult && beforeConsult.id !== afterConsult.id && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-8"
                >
                  <Card className="border-border/60 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500" />
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <SlidersHorizontal className="h-5 w-5 text-primary" />
                          Comparison
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => {
                              const idx = sorted.indexOf(beforeConsult)
                              setSelectedBefore(Math.max(0, idx - 1))
                            }}
                            disabled={sorted.indexOf(beforeConsult) <= 0}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-xs text-muted-foreground">Select</span>
                          <Button
                            variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => {
                              const idx = sorted.indexOf(afterConsult)
                              setSelectedAfter(Math.min(sorted.length - 1, idx + 1))
                            }}
                            disabled={sorted.indexOf(afterConsult) >= sorted.length - 1}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="flex-1 max-w-[200px]">
                          <p className="text-xs text-muted-foreground mb-2 text-center">Before</p>
                          <div className="relative h-20 rounded-lg overflow-hidden border-2 border-sky-400 cursor-pointer transition-all hover:border-sky-500"
                            onClick={() => {
                              const idx = sorted.indexOf(beforeConsult)
                              setSelectedBefore((idx - 1 + sorted.length) % sorted.length)
                            }}
                          >
                            {beforeConsult.image_url && (
                              <img src={beforeConsult.image_url} alt="" className="h-full w-full object-cover" />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                              <p className="text-[10px] text-white font-medium truncate">
                                {new Date(beforeConsult.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 max-w-[200px]">
                          <p className="text-xs text-muted-foreground mb-2 text-center">After</p>
                          <div className="relative h-20 rounded-lg overflow-hidden border-2 border-emerald-400 cursor-pointer transition-all hover:border-emerald-500"
                            onClick={() => {
                              const idx = sorted.indexOf(afterConsult)
                              setSelectedAfter((idx + 1) % sorted.length)
                            }}
                          >
                            {afterConsult.image_url && (
                              <img src={afterConsult.image_url} alt="" className="h-full w-full object-cover" />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                              <p className="text-[10px] text-white font-medium truncate">
                                {new Date(afterConsult.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {beforeConsult.image_url && afterConsult.image_url && (
                        <BeforeAfterSlider
                          before={{
                            imageUrl: beforeConsult.image_url,
                            date: new Date(beforeConsult.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                            label: "Before",
                          }}
                          after={{
                            imageUrl: afterConsult.image_url,
                            date: new Date(afterConsult.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                            label: "After",
                          }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {sorted.length === 1 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
                  <Card className="border-dashed border-2 border-border/40 bg-gradient-to-br from-sky-50/30 to-teal-50/30 dark:from-sky-950/10 dark:to-teal-950/10">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 dark:from-sky-900/30 dark:to-teal-900/30 flex items-center justify-center mb-4">
                        <Camera className="h-8 w-8 text-sky-500" />
                      </div>
                      <h3 className="text-xl font-bold mb-1">Baseline Captured</h3>
                      <p className="text-muted-foreground text-center max-w-md text-sm">
                        Your first photo was taken on{" "}
                        {new Date(sorted[0].created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
                        Check in daily to track changes and get AI insights!
                      </p>
                      <Link href="/diary/checkin" className="mt-6">
                        <Button size="lg" className="medical-gradient text-white shadow-lg gap-2">
                          <Plus className="h-5 w-5" /> Take Follow-up Photo
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Photo Timeline */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <LayoutGrid className="h-5 w-5 text-primary" />
                      Photo Timeline {filterMonday ? `(This week — since ${mondayStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })})` : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-sky-500 via-teal-500 to-emerald-500 rounded-full opacity-30" />
                      <div className="space-y-4">
                        {[...filteredSorted].reverse().map((c, i) => {
                          const dateKey = c.created_at.slice(0, 10)
                          const isHighlighted = selectedDate === dateKey
                          return (
                            <motion.div
                              key={c.id}
                              id={`timeline-${dateKey}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={`relative pl-14 ${isHighlighted ? "scale-[1.02]" : ""}`}
                            >
                              <div className={`absolute left-3.5 top-4 h-5 w-5 rounded-full border-4 border-background transition-all ${
                                isHighlighted ? "ring-2 ring-primary scale-125" : ""
                              } ${
                                c.severity === "urgent" ? "bg-red-500" :
                                c.severity === "moderate" ? "bg-amber-500" : "bg-emerald-500"
                              }`} />
                              <div className={`p-4 rounded-xl border transition-all group ${
                                isHighlighted ? "border-primary/40 bg-primary/5 shadow-md" : "border-border/60 bg-card hover:shadow-md"
                              }`}>
                                <div className="flex items-start gap-4">
                                  <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-muted/50 ring-1 ring-border/40">
                                    {c.image_url ? (
                                      <img src={c.image_url} alt="Skin" className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center">
                                        <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-sm">
                                        {new Date(c.created_at).toLocaleDateString("en-US", {
                                          weekday: "short", month: "short", day: "numeric", year: "numeric"
                                        })}
                                      </p>
                                      <Badge variant={(c.severity as any) || "mild"} className="text-[10px]">
                                        {c.severity || "mild"}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                      {c.patient_text.slice(0, 120)}{c.patient_text.length > 120 ? "..." : ""}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Link href={`/consult/${c.id}`}>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                          <Activity className="h-3 w-3" /> View Details
                                        </Button>
                                      </Link>
                                      <button
                                        onClick={() => {
                                          setSelectedDate(dateKey === selectedDate ? null : dateKey)
                                        }}
                                        className="text-xs px-2 py-1 rounded-md hover:bg-accent transition-colors text-muted-foreground"
                                      >
                                        <Calendar className="h-3 w-3 inline mr-1" />
                                        {isHighlighted ? "Deselect" : "Focus"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* CTA */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-8 text-center">
                <Link href="/diary/checkin">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Camera className="h-5 w-5" /> Take Another Photo
                  </Button>
                </Link>
              </motion.div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
