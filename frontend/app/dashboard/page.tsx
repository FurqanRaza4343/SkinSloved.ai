"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Stethoscope, Plus, History, Activity, ChevronRight, Clock, Download, Trash2, Calendar, Search, Loader2, AlertCircle } from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

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
      const response = await fetch("http://localhost:8000/api/consultations", {
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage your consultations and track progress.</p>
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
              { icon: Clock, label: "This Month", value: String(consultations.filter(c => new Date(c.created_at).getMonth() === new Date().getMonth()).length), color: "from-violet-500 to-purple-500" },
              { icon: Calendar, label: "Last Visit", value: consultations.length > 0 ? new Date(consultations[0].created_at).toLocaleDateString() : "N/A", color: "from-rose-500 to-pink-500" },
              { icon: Activity, label: "Conditions Analyzed", value: String(new Set(consultations.map(c => getSeverity(c.patient_text))).size), color: "from-amber-500 to-orange-500" },
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
                  <p className="font-semibold text-foreground">{consultations.length === 0 ? "No consultations yet" : "No results found"}</p>
                  <p className="text-sm mt-1">{consultations.length === 0 ? "Start your first skin analysis today." : "Try a different search term."}</p>
                  {consultations.length === 0 && (
                    <Link href="/consult/new"><Button className="mt-4">Start Consultation</Button></Link>
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
                      <motion.div key={consultation.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4 p-4 sm:p-6 hover:bg-muted/30 transition-colors group"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          severity === "urgent" ? "bg-red-100 dark:bg-red-900/30" : 
                          severity === "moderate" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
                        }`}>
                          <Activity className={`h-5 w-5 ${
                            severity === "urgent" ? "text-red-600 dark:text-red-400" : 
                            severity === "moderate" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">{severity.charAt(0).toUpperCase() + severity.slice(1)} Concern</p>
                            <Badge variant={severityColors[severity]} className="shrink-0">{severity}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">{snippet}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">{new Date(consultation.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {consultation.audio_url && (
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => new Audio(consultation.audio_url!).play()}>
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Link href={`/consult/${consultation.id}`}>
                            <Button variant="ghost" size="icon" className="h-9 w-9"><ChevronRight className="h-4 w-4" /></Button>
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
