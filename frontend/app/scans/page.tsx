"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { BACKEND_URL } from "@/lib/config"
import { ScanHistoryEntry } from "@/lib/scan-types"
import { Camera, FileDown, Loader2, AlertCircle, ChevronRight, Activity } from "lucide-react"

const severityBadge: Record<string, string> = {
  mild: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  moderate: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  urgent: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
}

export default function ScanHistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [scans, setScans] = useState<ScanHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    const fetchScans = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/scans`, { headers: { "X-User-Id": user.id } })
        if (!res.ok) throw new Error("Failed to load scan history")
        setScans(await res.json())
      } catch (e: any) {
        setError(e.message || "Failed to load scan history")
      } finally {
        setLoading(false)
      }
    }
    fetchScans()
  }, [user, authLoading, router])

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
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Scan History</h1>
              <p className="text-muted-foreground mt-1">Every AI skin scan you&apos;ve run, with results and reports.</p>
            </div>
            <Link href="/live-detection">
              <Button className="medical-gradient text-white shadow-lg gap-2">
                <Camera className="h-4 w-4" /> New Scan
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-border/60">
                  <CardContent className="p-4 flex gap-4 items-center">
                    <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-full max-w-sm" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-semibold text-foreground">Failed to load scan history</p>
              <p className="text-sm mt-1">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => { setLoading(true); setError(""); window.location.reload() }}>Try Again</Button>
            </div>
          ) : scans.length === 0 ? (
            <Card className="border-dashed border-2 border-border/40">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-sky-100 to-teal-100 dark:from-sky-900/30 dark:to-teal-900/30 flex items-center justify-center mb-4">
                  <Activity className="h-8 w-8 text-sky-500" />
                </div>
                <h3 className="font-bold text-lg mb-2">No Scans Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                  Run your first live AI skin scan to see your skin profile, detected conditions and product recommendations here.
                </p>
                <Link href="/live-detection">
                  <Button className="medical-gradient text-white shadow-lg gap-2">
                    <Camera className="h-4 w-4" /> Start a Scan
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {scans.map((scan, i) => {
                const sp = scan.skin_profile || {}
                const top = scan.detections?.[0]
                return (
                  <motion.div
                    key={scan.scan_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="border-border/60 hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 shrink-0 rounded-xl overflow-hidden bg-muted/50 ring-1 ring-border/40 flex items-center justify-center">
                            {scan.image_url ? (
                              <img src={scan.image_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Activity className="h-5 w-5 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold">
                                {scan.skin_score != null ? `Skin Score ${scan.skin_score}/10` : "Skin Scan"}
                              </p>
                              {scan.severity && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${severityBadge[scan.severity] || severityBadge.mild}`}>
                                  {scan.severity.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 truncate">
                              {top ? `${top.feature} (${top.confidence}%)` : "No conditions flagged"}
                              {sp.skin_type ? ` · ${sp.skin_type} skin · Fitzpatrick ${sp.fitzpatrick || "?"}` : ""}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {(scan.detections || []).slice(0, 3).map((d, j) => (
                                <span key={j} className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400">
                                  {d.feature}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground/70 mt-2">
                              {new Date(scan.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} ·{" "}
                              {new Date(scan.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {scan.pdf_url && (
                              <a href={scan.pdf_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="gap-1.5">
                                  <FileDown className="h-3.5 w-3.5" /> Report
                                </Button>
                              </a>
                            )}
                            <Link href={`/scans/${scan.scan_id}`}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                Details <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
