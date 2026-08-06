"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { FileDown, Volume2, BarChart3, Check, ListOrdered, ExternalLink, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface Detection {
  feature: string
  confidence: number
  severity: string
  description: string
}

export interface Recommendation {
  feature: string
  recommendation: string
  routine: string
  frequency: string
  duration: string
}

export interface SkinProfile {
  skin_type?: string
  fitzpatrick?: string
  undertone?: string
  tone_label?: string
}

export interface Product {
  brand: string
  name: string
  price_range?: string
  category?: string
  key_ingredients?: string[]
  description?: string
  image_url?: string | null
  amazon_search_url?: string
}

export interface ScanResult {
  scan_id: string
  detections: Detection[]
  skin_score: number
  severity: string
  explanation: string
  treatment: string
  recommendations?: Recommendation[]
  skin_profile?: SkinProfile
  products?: Product[]
  image_url: string | null
  audio_url: string | null
  pdf_url: string | null
  created_at: string
}

interface LiveResultsProps {
  scanResult: ScanResult | null
  isScanning: boolean
  progress: number
  currentStage: string
  onDownloadPdf: () => void
}

const SEVERITY_COLORS = {
  mild: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  moderate: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  severe: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
}

const STAGES = [
  { id: "camera", label: "Camera Ready" },
  { id: "features", label: "Feature Detection" },
  { id: "score", label: "Skin Score" },
  { id: "treatment", label: "Treatment Plan" },
  { id: "report", label: "Generating Report" },
]

export function LiveResults({ scanResult, isScanning, progress, currentStage, onDownloadPdf }: LiveResultsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 7) return "text-emerald-500"
    if (score >= 4) return "text-amber-500"
    return "text-red-500"
  }

  const getScoreBg = (score: number) => {
    if (score >= 7) return "from-emerald-400 to-green-500"
    if (score >= 4) return "from-amber-400 to-orange-500"
    return "from-red-400 to-rose-500"
  }

  if (isScanning) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Scanning Your Skin...</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {STAGES.find((s) => s.id === currentStage)?.label || "Processing"}
          </p>
          <div className="w-full bg-muted/30 rounded-full h-2 mb-4 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-sm text-muted-foreground">{Math.round(progress)}% complete</p>
        </div>

        <div className="flex justify-center">
          <div className="flex items-end gap-1 h-20">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                className="w-2 bg-sky-400/30 rounded-t-sm"
                initial={{ height: "4px" }}
                animate={{ height: `${20 + (i * progress / 100) * 30}px` }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
              />
            ))}
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>This will take up to 2 minutes...</p>
        </div>
      </div>
    )
  }

  if (!scanResult) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">No scan results yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Scan Complete</h3>
        <div className="text-xs text-muted-foreground">
          {new Date(scanResult.created_at).toLocaleString()}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 py-6">
        <div className="text-center">
          <div className="text-5xl font-bold mb-1">
            <span className={cn("bg-clip-text text-transparent bg-gradient-to-b", getScoreBg(scanResult.skin_score))}>
              {scanResult.skin_score.toFixed(1)}
            </span>
            <span className="text-3xl text-muted-foreground">/ 10</span>
          </div>
          <p className="text-sm text-muted-foreground">Skin Health Score</p>
        </div>
      </div>

      {scanResult.detections.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground mb-2">
            Detected Conditions ({scanResult.detections.length})
          </h4>
          <div className="space-y-2">
            {scanResult.detections.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-3 rounded-xl border bg-card"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{d.feature}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border", SEVERITY_COLORS[d.severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.mild)}>
                    {d.severity?.toUpperCase() || "MILD"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-teal-500 rounded-full"
                      style={{ width: `${d.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-12 text-right">{d.confidence}%</span>
                </div>
                <p className="text-xs text-muted-foreground">{d.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {scanResult.explanation && (
        <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50">
          <h4 className="font-medium mb-2 text-sky-800 dark:text-sky-300">Analysis Summary</h4>
          <p className="text-sm text-sky-700 dark:text-sky-300">{scanResult.explanation}</p>
        </div>
      )}

      {scanResult.skin_profile && (
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-950/30 border border-neutral-200 dark:border-neutral-800">
          <h4 className="font-medium mb-3 text-neutral-800 dark:text-neutral-200">Skin Profile</h4>
          <div className="flex flex-wrap gap-2">
            {scanResult.skin_profile.skin_type && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {scanResult.skin_profile.skin_type} skin
              </span>
            )}
            {scanResult.skin_profile.fitzpatrick && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                Fitzpatrick {scanResult.skin_profile.fitzpatrick}
              </span>
            )}
            {scanResult.skin_profile.undertone && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {scanResult.skin_profile.undertone} undertone
              </span>
            )}
            {scanResult.skin_profile.tone_label && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {scanResult.skin_profile.tone_label} tone
              </span>
            )}
          </div>
        </div>
      )}

      {scanResult.treatment && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
          <h4 className="font-medium mb-2 text-emerald-800 dark:text-emerald-300">Treatment & Recommendations</h4>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 whitespace-pre-wrap">{scanResult.treatment}</p>
        </div>
      )}

      {scanResult.products && scanResult.products.length > 0 && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
          <h4 className="font-medium mb-3 text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Recommended Products & Medicines
          </h4>
          <div className="grid sm:grid-cols-2 gap-3">
            {scanResult.products.map((product, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-3 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-white/60 dark:bg-white/5"
              >
                <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-contain" />
                  ) : (
                    <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate text-indigo-900 dark:text-indigo-200">{product.brand}</p>
                  <p className="text-xs text-muted-foreground truncate">{product.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {product.price_range && (
                      <span className="text-xs font-medium text-sky-600">{product.price_range}</span>
                    )}
                    {product.category && (
                      <>
                        <span className="text-xs text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground capitalize">{product.category}</span>
                      </>
                    )}
                  </div>
                  {(product.key_ingredients ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(product.key_ingredients ?? []).slice(0, 2).map((ing, j) => (
                        <span key={j} className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 truncate max-w-24">
                          {ing}
                        </span>
                      ))}
                    </div>
                  )}
                  {product.amazon_search_url && (
                    <a href={product.amazon_search_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                      <ExternalLink className="h-3 w-3" /> Search on Amazon
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {scanResult.recommendations && scanResult.recommendations.length > 0 && (
        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50">
          <h4 className="font-medium mb-3 text-purple-800 dark:text-purple-300">
            Recommended Products & Medicines
          </h4>
          <div className="space-y-3">
            {scanResult.recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-3 rounded-lg bg-white/60 dark:bg-white/5 border border-purple-100 dark:border-purple-900/50"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-purple-900 dark:text-purple-200">{rec.feature}</span>
                  {rec.frequency && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                      {rec.frequency}
                    </span>
                  )}
                </div>
                <p className="text-sm text-purple-800 dark:text-purple-300">{rec.recommendation}</p>
                {rec.routine && <p className="text-xs text-muted-foreground mt-1">{rec.routine}</p>}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {scanResult.detections.length > 0 && (
        <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/50">
          <h4 className="font-medium mb-3 text-teal-800 dark:text-teal-300 flex items-center gap-2">
            <ListOrdered className="h-4 w-4" /> Your Next Steps
          </h4>
          <ol className="space-y-2 text-sm text-teal-800 dark:text-teal-300">
            <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5 shrink-0" /> Start with the recommended products above — introduce one new product at a time, at night.</li>
            <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5 shrink-0" /> Apply sunscreen (SPF 30+) every morning, even indoors, to protect your skin.</li>
            <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5 shrink-0" /> Follow this routine consistently for two weeks and watch for changes.</li>
            <li className="flex gap-2"><Check className="h-4 w-4 mt-0.5 shrink-0" /> Rescan in two weeks to track your progress. If anything worsens, see a dermatologist.</li>
          </ol>
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        {scanResult.pdf_url && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onDownloadPdf}>
            <FileDown className="h-4 w-4" /> Download PDF Report
          </Button>
        )}
        {scanResult.audio_url && (
          <audio controls src={scanResult.audio_url} className="h-10" />
        )}
      </div>
    </div>
  )
}
