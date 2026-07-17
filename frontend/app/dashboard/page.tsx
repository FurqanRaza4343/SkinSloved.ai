"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Stethoscope, Plus, History, Activity, ChevronRight, Clock, Download,
  Trash2, Calendar, Search, Loader2, AlertCircle, TrendingUp, Sparkles
} from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { ProgressChart } from "@/components/dashboard/progress-chart"

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

const severityColors = { mild: "mild" as const, moderate: "moderate" as const, urgent: "urgent" as const }

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    fetchConsultations()
  }, [user, authLoading, router])

  const fetchConsultations = async () => {
    setLoadingData(true)
    setError("")
    try {
      const response = await fetch(`${BACKEND}/api/consultations`, {
        headers: { "X-User-Id": user!.id },
      })
      if (!response.ok) throw new Error("Failed to load consultations")
      const data = await response.json()
      setConsultations(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingData(false)
    }
  }

  const getSeverity = (text: string): "mild" | "moderate" | "urgent" => {
    const lower = text.toLowerCase()
    if (lower.includes("urgent") || lower.includes("serious") || lower.includes("emergency")) return "urgent"
    if (lower.includes("moderate") || lower.includes("inflammatory") || lower.includes("infection")) return "moderate"
    return "mild"
  }

  const filtered = consultations.filter((c) =>
    c.patient_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.doctor_response?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const thisMonth = consultations.filter(
    (c) => new Date(c.created_at).getMonth() === new Date().getMonth()
  ).length

  const currentStreak = consultations.length > 0
    ? new Date(consultations[0].created_at).toLocaleDateString()
    : "N/A"

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
      <main className="pt-24 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
              <p className="text-muted-foreground mt-1">Track your skin health journey over time.</p>
            </div>
            <Link href="/consult/new">
              <Button size="lg" className="medical-gradient text-white shadow-lg gap-2 w-full sm:w-auto">
                <Plus className="h-5 w-5" /> New Consultation
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Activity, label: "Total Consultations", value: String(consultations.length), color: "from-sky-500 to-teal-500" },
              { icon: Clock, label: "This Month", value: String(thisMonth), color: "from-violet-500 to-purple-500" },
              { icon: Calendar, label: "Last Visit", value: currentStreak, color: "from-rose-500 to-pink-500" },
              { icon: TrendingUp, label: "Progress", value: consultations.length > 0 ? "Tracking" : "Start now", color: "from-amber-500 to-orange-500" },
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

          {/* Progress Chart */}
          <div className="mb-8">
            <ProgressChart consultations={consultations} />
          </div>

          {/* Skin Diary Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Skin Diary</h2>
                <p className="text-sm text-muted-foreground">Track your progress with photo comparisons</p>
              </div>
              <Link href="/diary">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Sparkles className="h-4 w-4" /> View Full Diary
                </Button>
              </Link>
            </div>

            {filtered.length === 0 && (
              <Card className="border-dashed border-2 border-border/40">
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 dark:from-sky-900/30 dark:to-teal-900/30 flex items-center justify-center mb-4">
                    <Activity className="h-7 w-7 text-sky-500" />
                  </div>
                  <h3 className="font-bold text-lg mb-1">Start Your Skin Diary</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm mb-5">
                    Take your first skin photo to establish a baseline and track changes over time.
                  </p>
                  <Link href="/consult/new">
                    <Button className="medical-gradient text-white shadow-lg gap-2">
                      <Plus className="h-4 w-4" /> Start Now
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {filtered.length === 1 && (
              <Card className="border-border/60 bg-gradient-to-br from-sky-50/30 to-teal-50/30 dark:from-sky-950/10 dark:to-teal-950/10">
                <CardContent className="flex items-center gap-4 p-4 sm:p-6">
                  <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-muted/50 ring-1 ring-border/40">
                    {filtered[0].image_url ? (
                      <img src={filtered[0].image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                        <Activity className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">Baseline Photo Captured</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(filtered[0].created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Take another photo in 2 weeks to compare and track your progress.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Link href="/consult/new">
                        <Button size="sm" className="medical-gradient text-white shadow-lg gap-1 h-8 text-xs">
                          <Plus className="h-3.5 w-3.5" /> Take Follow-up
                        </Button>
                      </Link>
                      <Link href="/diary">
                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                          <Sparkles className="h-3.5 w-3.5" /> View Diary
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {filtered.length >= 2 && (
              <Card className="border-border/60 overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid sm:grid-cols-5">
                    <div className="sm:col-span-2 p-4 sm:p-6 bg-gradient-to-br from-sky-50 to-teal-50 dark:from-sky-950/20 dark:to-teal-950/20">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          {filtered.length} photos captured
                        </span>
                      </div>
                      <p className="text-sm font-bold mt-1">Progress Tracking</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Spanning {
                          Math.max(1, Math.round(
                            (new Date(filtered[0].created_at).getTime() - new Date(filtered[filtered.length - 1].created_at).getTime()) / 86400000
                          ))
                        } days
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Link href="/diary">
                          <Button size="sm" className="medical-gradient text-white shadow-lg gap-1 h-8 text-xs">
                            <Sparkles className="h-3.5 w-3.5" /> Compare Photos
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <div className="sm:col-span-3 p-4 sm:p-6 flex items-center gap-4">
                      {filtered.slice(0, 4).map((c, i) => (
                        <div key={c.id} className="relative group flex-1">
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted/50 ring-1 ring-border/40">
                            {c.image_url ? (
                              <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-muted-foreground/30">
                                <Activity className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 text-center truncate">
                            {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search consultations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Consultation List */}
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Consultation History
              </CardTitle>
              <Badge variant="secondary">{consultations.length} total</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {loadingData ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-semibold text-foreground">Failed to load consultations</p>
                  <p className="text-sm mt-1">{error}</p>
                  <Button variant="outline" className="mt-4" onClick={fetchConsultations}>Try Again</Button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-semibold text-foreground">
                    {consultations.length === 0 ? "No consultations yet" : "No results found"}
                  </p>
                  <p className="text-sm mt-1">
                    {consultations.length === 0
                      ? "Start your first skin analysis today."
                      : "Try a different search term."}
                  </p>
                  {consultations.length === 0 && (
                    <Link href="/consult/new">
                      <Button className="mt-4">Start Consultation</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {filtered.map((consultation, i) => {
                    const severity = getSeverity(consultation.patient_text)
                    const snippet = consultation.doctor_response
                      ? consultation.doctor_response.slice(0, 100).replace(/[*#]/g, "") + "..."
                      : consultation.patient_text.slice(0, 100) + "..."
                    return (
                      <motion.div
                        key={consultation.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 p-4 sm:p-6 hover:bg-muted/30 transition-colors group"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          severity === "urgent" ? "bg-red-100 dark:bg-red-900/30" :
                          severity === "moderate" ? "bg-amber-100 dark:bg-amber-900/30" :
                          "bg-emerald-100 dark:bg-emerald-900/30"
                        }`}>
                          <Activity className={`h-5 w-5 ${
                            severity === "urgent" ? "text-red-600 dark:text-red-400" :
                            severity === "moderate" ? "text-amber-600 dark:text-amber-400" :
                            "text-emerald-600 dark:text-emerald-400"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">
                              {severity.charAt(0).toUpperCase() + severity.slice(1)} Concern
                            </p>
                            <Badge variant={severityColors[severity]} className="shrink-0">{severity}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{snippet}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {new Date(consultation.created_at).toLocaleDateString("en-US", {
                              year: "numeric", month: "short", day: "numeric"
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {consultation.audio_url && (
                            <Button
                              variant="ghost" size="icon" className="h-9 w-9"
                              onClick={() => new Audio(consultation.audio_url!).play()}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Link href={`/consult/${consultation.id}`}>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  )
}
