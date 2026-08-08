"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { useAuth } from "@/lib/auth-context"
import { BACKEND_URL } from "@/lib/config"
import { ScanHistoryEntry } from "@/lib/scan-types"
import { FileDown, Volume2, Loader2, AlertCircle, ChevronLeft, ShoppingCart, ExternalLink, Trash2 } from "lucide-react"
import Link from "next/link"

export default function ScanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [scan, setScan] = useState<ScanHistoryEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!scan || deleting) return
    if (!window.confirm("Delete this scan record? This cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/scans/${scan.scan_id}`, {
        method: "DELETE",
        headers: { "X-User-Id": user!.id },
      })
      if (!res.ok) throw new Error("Failed to delete scan")
      router.push("/scans")
    } catch (e: any) {
      setError(e.message || "Failed to delete scan")
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/login")
      return
    }
    const fetchScan = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/scans/${params.id}`, { headers: { "X-User-Id": user.id } })
        if (!res.ok) throw new Error(res.status === 404 ? "Scan not found" : "Failed to load scan")
        setScan(await res.json())
      } catch (e: any) {
        setError(e.message || "Failed to load scan")
      } finally {
        setLoading(false)
      }
    }
    fetchScan()
  }, [user, authLoading, router, params.id])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const sp = scan?.skin_profile || {}

  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link href="/scans" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ChevronLeft className="h-4 w-4" /> Back to Scan History
          </Link>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-52" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-semibold text-foreground">Cannot load this scan</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : !scan ? (
            <div className="text-center py-16 text-muted-foreground">Scan not found.</div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Skin Scan Report</h1>
                  <p className="text-sm text-muted-foreground">
                    {new Date(scan.created_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}
                  </p>
                </div>
                <div className="flex gap-2">
                  {scan.pdf_url ? (
                    <a href={scan.pdf_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <FileDown className="h-4 w-4" /> Download PDF
                      </Button>
                    </a>
                  ) : (
                    <a
                      href={`${BACKEND_URL}/api/scans/${scan.scan_id}/report`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Download PDF"
                    >
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <FileDown className="h-4 w-4" /> Download PDF
                      </Button>
                    </a>
                  )}
                  {scan.audio_url && (
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Volume2 className="h-4 w-4" /> Play Summary
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={handleDelete} disabled={deleting}>
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
                  </Button>
                </div>
              </div>

              {scan.audio_url && <audio controls src={scan.audio_url} className="w-full" />}

              {scan.skin_score != null && (
                <Card className="border-border/60">
                  <CardContent className="p-5 flex items-center gap-6">
                    <div className="text-4xl font-bold">
                      <span className={scan.skin_score >= 7 ? "text-emerald-500" : scan.skin_score >= 4 ? "text-amber-500" : "text-red-500"}>
                        {scan.skin_score.toFixed(1)}
                      </span>
                      <span className="text-2xl text-muted-foreground">/10</span>
                    </div>
                    <div>
                      <p className="font-semibold">Skin Health Score</p>
                      <p className="text-sm text-muted-foreground">
                        {scan.skin_score >= 7 ? "Your skin is in good condition!" : scan.skin_score >= 4 ? "Some concerns found. Follow your care routine." : "Your skin needs attention."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {Object.keys(sp).length > 0 && (
                <Card className="border-border/60">
                  <CardContent className="p-5">
                    <h2 className="font-semibold mb-3">Skin Profile</h2>
                    <div className="flex flex-wrap gap-2">
                      {sp.skin_type && <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">{sp.skin_type} skin</span>}
                      {sp.fitzpatrick && <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">Fitzpatrick {sp.fitzpatrick}</span>}
                      {sp.undertone && <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">{sp.undertone} undertone</span>}
                      {sp.tone_label && <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">{sp.tone_label} tone</span>}
                    </div>
                  </CardContent>
                </Card>
              )}

              {scan.detections?.length > 0 && (
                <Card className="border-border/60">
                  <CardContent className="p-5">
                    <h2 className="font-semibold mb-3">Detected Conditions</h2>
                    <div className="space-y-2">
                      {scan.detections.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-sm p-3 rounded-xl bg-muted/20">
                          <span className="font-medium">{d.feature}</span>
                          <span className="text-xs font-medium">{d.confidence}% · {d.severity}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {scan.explanation && (
                <Card className="border-border/60">
                  <CardContent className="p-5">
                    <h2 className="font-semibold mb-2">Analysis Summary</h2>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{scan.explanation}</p>
                  </CardContent>
                </Card>
              )}

              {scan.treatment && (
                <Card className="border-border/60">
                  <CardContent className="p-5">
                    <h2 className="font-semibold mb-2">Treatment & Recommendations</h2>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{scan.treatment}</p>
                  </CardContent>
                </Card>
              )}

              {scan.products?.length > 0 && (
                <Card className="border-border/60">
                  <CardContent className="p-5">
                    <h2 className="font-semibold mb-3 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-primary" /> Recommended Products
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {scan.products.map((p: any, i) =>
                        p && typeof p.name === "string" ? (
                          <div key={i} className="flex gap-3 p-3 rounded-xl border border-border/60 bg-card">
                            <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center">
                              {p.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.image_url} alt={p.name} className="h-full w-full object-contain" />
                              ) : (
                                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate">{p.brand}</p>
                              <p className="text-xs text-muted-foreground truncate">{p.name}</p>
                              {p.amazon_search_url && (
                                <a href={p.amazon_search_url as string} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                                  <ExternalLink className="h-3 w-3" /> Search on Amazon
                                </a>
                              )}
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <Link href="/live-detection" className="flex-1">
                  <Button className="w-full medical-gradient text-white shadow-lg">Run New Scan</Button>
                </Link>
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" className="w-full">View Dashboard</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}