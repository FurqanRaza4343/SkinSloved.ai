"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar, Activity,
  Camera, Sparkles, Loader2, AlertCircle, BarChart3, Clock
} from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { useAuth } from "@/lib/auth-context"
import { Skeleton } from "@/components/ui/skeleton"

import { BACKEND_URL } from "@/lib/config"
import { Consultation } from "@/lib/types"

const SEVERITY_MAP: Record<string, number> = { mild: 1, moderate: 2, urgent: 3 }
const SEVERITY_LABELS: Record<number, string> = { 1: "Mild", 2: "Moderate", 3: "Severe" }

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push("/login"); return }
    fetchData()
  }, [user, authLoading, router])

  const fetchData = async () => {
    setLoadingData(true); setError("")
    try {
      const resp = await fetch(`${BACKEND_URL}/api/consultations`, {
        headers: { "X-User-Id": user!.id },
      })
      if (!resp.ok) throw new Error("Failed to load")
      const data = await resp.json()
      setConsultations(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingData(false)
    }
  }

  const stats = useMemo(() => {
    if (consultations.length === 0) return null
    const sorted = [...consultations].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const scores = sorted.map(c => ({
      date: new Date(c.created_at),
      score: c.severity ? SEVERITY_MAP[c.severity] || 1 : 1,
    }))

    const first = scores[0].score
    const last = scores[scores.length - 1].score
    const trend = last < first ? "improving" : last > first ? "worsening" : "stable"

    const totalDays = Math.max(1, Math.round(
      (scores[scores.length - 1].date.getTime() - scores[0].date.getTime()) / 86400000
    ))

    const severityCounts = { mild: 0, moderate: 0, urgent: 0 }
    consultations.forEach(c => {
      const sev = (c.severity || "mild") as keyof typeof severityCounts
      if (severityCounts[sev] !== undefined) severityCounts[sev]++
    })

    const thisMonth = consultations.filter(c =>
      new Date(c.created_at).getMonth() === new Date().getMonth() &&
      new Date(c.created_at).getFullYear() === new Date().getFullYear()
    ).length

    const lastMonth = consultations.filter(c => {
      const d = new Date(c.created_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() - 1 && d.getFullYear() === now.getFullYear()
    }).length

    const monthlyChange = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : thisMonth > 0 ? 100 : 0

    const avgScore = Math.round((scores.reduce((a, s) => a + s.score, 0) / scores.length) * 100) / 100

    const byMonth: Record<string, number[]> = {}
    scores.forEach(s => {
      const key = `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, "0")}`
      if (!byMonth[key]) byMonth[key] = []
      byMonth[key].push(s.score)
    })
    const monthlyAvg = Object.entries(byMonth).sort().map(([month, vals]) => ({
      month,
      label: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      count: vals.length,
    }))

    const localDay = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

    const daySet = new Set(sorted.map(c => localDay(new Date(c.created_at))))

    const streak = (() => {
      let count = 0
      const now = new Date()
      const todayStr = localDay(now)
      if (!daySet.has(todayStr)) {
        // Streak is still alive if yesterday has a check-in; start from there.
        if (daySet.has(localDay(new Date(now.getTime() - 86400000)))) {
          let j = 1
          while (daySet.has(localDay(new Date(now.getTime() - j * 86400000)))) {
            count++
            j++
            if (j > 30) break
          }
        }
      } else {
        count = 1
        for (let i = 1; i < 30; i++) {
          const d = new Date(now.getTime() - i * 86400000)
          if (daySet.has(localDay(d))) count++
          else break
        }
      }
      return count
    })()

    const weeklyFrequency = Math.round((consultations.length / Math.max(1, totalDays / 7)) * 10) / 10

    return { trend, totalDays, severityCounts, thisMonth, monthlyChange, avgScore, monthlyAvg, streak, weeklyFrequency, total: consultations.length }
  }, [consultations])

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

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                  <Badge variant="outline" className="gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" /> Progress
                  </Badge>
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Skin Health Progress</h1>
                <p className="text-muted-foreground mt-1">Track your skin health trends over time.</p>
              </div>
              <Link href="/diary/checkin">
                <Button size="lg" className="medical-gradient text-white shadow-lg gap-2 w-full sm:w-auto">
                  <Camera className="h-5 w-5" /> New Check-in
                </Button>
              </Link>
            </div>
          </motion.div>

          {loadingData ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="border-border/60">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                        <div className="min-w-0 flex-1">
                          <Skeleton className="h-3 w-20 mb-2" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Skeleton className="h-64 rounded-xl mb-8" />
              <Skeleton className="h-48 rounded-xl" />
            </>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="font-semibold">Failed to load progress</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchData}>Try Again</Button>
            </div>
          ) : consultations.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-dashed border-2 border-border/40">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 dark:from-sky-900/30 dark:to-teal-900/30 flex items-center justify-center mb-6">
                    <BarChart3 className="h-10 w-10 text-sky-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">No Data Yet</h2>
                  <p className="text-muted-foreground text-center max-w-md mb-8">
                    Complete your first consultation to start tracking your skin health progress.
                  </p>
                  <Link href="/consult/new">
                    <Button size="xl" className="medical-gradient text-white shadow-lg gap-2">
                      <Camera className="h-5 w-5" /> Start First Consultation
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ) : stats ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: Activity, label: "Total Consultations", value: String(stats.total), color: "from-sky-500 to-teal-500" },
                  { icon: Clock, label: "Current Streak", value: `${stats.streak} day${stats.streak !== 1 ? "s" : ""}`, color: "from-violet-500 to-purple-500" },
                  { icon: Calendar, label: "This Month", value: String(stats.thisMonth), color: "from-rose-500 to-pink-500", sub: stats.monthlyChange !== 0 ? `${stats.monthlyChange > 0 ? "+" : ""}${stats.monthlyChange}%` : undefined },
                  { icon: BarChart3, label: "Weekly Avg", value: `${stats.weeklyFrequency}/wk`, color: "from-amber-500 to-orange-500" },
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
                            <div className="flex items-center gap-1.5">
                              <p className="text-lg sm:text-xl font-bold">{stat.value}</p>
                              {stat.sub && (
                                <span className={`text-[10px] font-medium ${Number(stat.sub) > 0 ? "text-emerald-500" : "text-red-500"}`}>
                                  {stat.sub}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Trend + Score */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="border-border/60 h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                        {stats.trend === "improving" ? <TrendingDown className="h-4 w-4 text-emerald-500" /> :
                         stats.trend === "worsening" ? <TrendingUp className="h-4 w-4 text-red-500" /> :
                         <Minus className="h-4 w-4 text-amber-500" />}
                        Overall Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <p className="text-3xl font-bold capitalize">{stats.trend}</p>
                        <Badge className={`${
                          stats.trend === "improving" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          stats.trend === "worsening" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>
                          {stats.trend === "improving" ? "Getting Better" : stats.trend === "worsening" ? "Needs Attention" : "Holding Steady"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Tracked over {stats.totalDays} days with {stats.total} consultations
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <Card className="border-border/60 h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        Severity Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(["mild", "moderate", "urgent"] as const).map(sev => {
                          const count = stats.severityCounts[sev]
                          const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                          return (
                            <div key={sev}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="capitalize font-medium">{sev}</span>
                                <span className="text-muted-foreground">{count} ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.6, delay: 0.3 }}
                                  className={`h-full rounded-full ${
                                    sev === "mild" ? "bg-emerald-400" :
                                    sev === "moderate" ? "bg-amber-400" : "bg-red-400"
                                  }`}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="border-border/60 h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Average Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-5xl font-bold">{stats.avgScore}</p>
                        <p className="text-sm text-muted-foreground mt-1">out of 3.0</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {stats.avgScore <= 1.5 ? "Excellent — mostly mild" :
                           stats.avgScore <= 2.0 ? "Good — mostly mild to moderate" :
                           "Needs attention — moderate to severe"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Monthly Bar Chart */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-8">
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Monthly Severity Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.monthlyAvg.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No monthly data available.</p>
                    ) : (
                      <>
                        <div className="flex items-end justify-around gap-2 h-40">
                          {stats.monthlyAvg.map((m, i) => {
                            const barH = (m.avg / 3) * 140
                            return (
                              <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                                <span className="text-[10px] text-muted-foreground font-medium">{m.avg.toFixed(1)}</span>
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: barH }}
                                  transition={{ duration: 0.6, delay: i * 0.1 }}
                                  className={`w-full max-w-[32px] rounded-t-lg ${
                                    m.avg <= 1.5 ? "bg-emerald-400" :
                                    m.avg <= 2.5 ? "bg-amber-400" : "bg-red-400"
                                  }`}
                                />
                                <span className="text-[10px] text-muted-foreground">{m.label}</span>
                                <span className="text-[9px] text-muted-foreground/60">{m.count}x</span>
                              </div>
                            )
                          })}
                        </div>
                        <div className="flex justify-between mt-4 text-xs text-muted-foreground border-t border-border/40 pt-3">
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Mild</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Moderate</span>
                          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Severe</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Photo Grid - Last 6 */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Camera className="h-5 w-5 text-primary" />
                      Recent Photos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {consultations.filter(c => c.image_url).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No photos yet.</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {consultations.filter(c => c.image_url).slice(-6).reverse().map((c, i) => (
                          <Link key={c.id} href={`/consult/${c.id}`}>
                            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted/50 ring-1 ring-border/40 hover:ring-primary/40 transition-all cursor-pointer group">
                              <img src={c.image_url!} alt="" className="h-full w-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute bottom-1 left-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <p className="text-[9px] text-white font-medium truncate">
                                  {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </p>
                              </div>
                              <div className={`absolute top-1 right-1 h-2 w-2 rounded-full ${
                                c.severity === "urgent" ? "bg-red-500" :
                                c.severity === "moderate" ? "bg-amber-500" : "bg-emerald-500"
                              }`} />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  )
}
