"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Sparkles, FileText, Shield, Play, Loader2, Volume2 } from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { AiAvatar } from "@/components/scanner/ai-avatar"
import { ScannerCamera } from "@/components/scanner/scanner-camera"
import type { ScannerCameraHandle } from "@/components/scanner/scanner-camera"
import { FeatureSelector, SCANNER_FEATURES } from "@/components/scanner/feature-selector"
import { LiveResults, ScanResult } from "@/components/scanner/live-results"
import { useSpeech } from "@/lib/speech"
import { BACKEND_URL } from "@/lib/config"
import { useAuth } from "@/lib/auth-context"

type Stage = "landing" | "camera" | "scan" | "results"

export default function LiveDetectionPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("landing")
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [issues, setIssues] = useState<string[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState("")
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState("")
  const cameraRef = useRef<ScannerCameraHandle>(null)
  const { user } = useAuth()
  const { speak: speakResult, stop: stopSpeech, speaking: resultSpeaking } = useSpeech()

  const startScan = useCallback(async () => {
    if (isScanning) return
    setError("")
    setIsScanning(true)
    setProgress(0)
    setCurrentStage("analyze")
    setStage("scan")

    if (selectedFeatures.length > 0) {
      stopSpeech()
      const names = SCANNER_FEATURES.filter((f) => selectedFeatures.includes(f.id))
        .map((f) => f.label)
        .slice(0, 3)
        .join(", ")
      setTimeout(() => {
        speakResult(
          `Theek hai! Aapne ${selectedFeatures.length} concern select kiye hain: ${names}. Ab main aap ki skin scan kar rahi hoon, thodi der ruko. Analysis starting now.`
        )
      }, 100)
    }

    const frame = await cameraRef.current?.getFrame()
    if (!frame) {
      setError("Could not grab live frame. Please ensure the camera is on.")
      setIsScanning(false)
      setStage("camera")
      return
    }

    cameraRef.current?.stopCamera()

    const formData = new FormData()
    formData.append("image", frame, "skin_live.jpg")
    if (selectedFeatures.length > 0 && selectedFeatures.length < SCANNER_FEATURES.length) {
      formData.append("features", selectedFeatures.join(","))
    }

    const stageTimings = [
      { stage: "features", progress: 15 },
      { stage: "features", progress: 30 },
      { stage: "score", progress: 45 },
      { stage: "treatment", progress: 70 },
      { stage: "report", progress: 90 },
    ]
    let idx = 0
    const interval = setInterval(() => {
      if (idx < stageTimings.length && !scanResult) {
        setCurrentStage(stageTimings[idx].stage)
        setProgress(stageTimings[idx].progress)
        idx++
      }
    }, 2000)

    try {
      const headers: Record<string, string> = {}
      if (user?.id) {
        headers["X-User-Id"] = user.id
      }
      const response = await fetch(`${BACKEND_URL}/api/scanner/analyze`, {
        method: "POST",
        headers,
        body: formData,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || "Analysis failed")
      }
      const data = await response.json()
      const result: ScanResult = {
        scan_id: data.scan_id,
        detections: data.detections || [],
        skin_score: data.skin_score || 5.0,
        severity: data.severity || "mild",
        explanation: data.explanation || "",
        treatment: data.treatment || "",
        image_url: data.image_url || null,
        audio_url: data.audio_url || null,
        pdf_url: data.pdf_url || null,
        created_at: data.created_at || new Date().toISOString(),
      }
      setScanResult(result)
      setProgress(100)
      setCurrentStage("report")
      setTimeout(() => {
        setIsScanning(false)
        setStage("results")
      }, 800)
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
      setIsScanning(false)
      setStage("camera")
    } finally {
      clearInterval(interval)
    }
  }, [isScanning, scanResult, selectedFeatures, user, speakResult, stopSpeech])

  const reset = () => {
    stopSpeech()
    cameraRef.current?.stopCamera()
    setStage("landing")
    setSelectedFeatures([])
    setReady(false)
    setIssues([])
    setIsScanning(false)
    setProgress(0)
    setCurrentStage("")
    setScanResult(null)
    setError("")
  }

  const downloadPdf = () => {
    if (scanResult?.pdf_url) {
      window.open(scanResult.pdf_url, "_blank")
    }
  }

  const buildDoctorSpeech = useCallback((result: ScanResult): string => {
    const detections = result.detections || []
    const score = result.skin_score ?? 5.0
    let speech = `Assalam o Alaikum! Aap ka skin checkup complete ho gaya hai. Aap ki skin health score ${score.toFixed(1)} out of 10 hai. `

    if (detections.length === 0) {
      speech +=
        "Koi bari masla nahi mila. Aap ki skin theek hai. Magar rozana cleanser, moisturizer aur SPF lagana na bhoolein. Your skin looks healthy, keep up the good routine."
      return speech
    }

    const names = detections.slice(0, 3).map((d) => d.feature).join(", ")
    speech += `Aap ki skin mein yeh masail detected hue hain: ${names}. `

    const main = detections[0]
    speech += `${main.feature} ${main.severity} level ka hai. ${main.description}. `

    const advice = result.treatment
      ? result.treatment
      : `Rozana SPF lagayein, hydrating moisturizer use karein, aur apna chehra roz dhoo lein.`

    speech += `Ab main aap ko kuch next steps bata rahi hoon. Pehla, ${advice} Doosra, rozana sun protection zaroor use karein. Teesra, 2 haftay baad dobara scan karein aur progress dekhein. Aur agar masla zyada ho to dermatologist se zaroor milein.`
    return speech
  }, [])

  useEffect(() => {
    if (stage === "results" && scanResult) {
      stopSpeech()
      setTimeout(() => speakResult(buildDoctorSpeech(scanResult)), 600)
    }
  }, [stage, scanResult, speakResult, stopSpeech, buildDoctorSpeech])

  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <AnimatePresence>
            {stage === "landing" && (
              <motion.div
                key="landing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center py-16"
              >
                <Badge variant="outline" className="gap-1.5 mb-6">
                  <Sparkles className="h-4 w-4" /> Live Skin Scanner
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  AI Skin <span className="bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">Scanner</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                  Live camera scan. Aap ki AI skin doctor aapko guide karegi voice mein — Urdu aur English mein. Perfect skin checkup live streaming pe.
                </p>
                <div className="mb-8 flex justify-center">
                  <AiAvatar message="Assalam o Alaikum! Main aap ki AI skin doctor hoon. Live scan karte hain!" status="idle" size="lg" />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="medical-gradient text-white shadow-lg gap-2" onClick={() => setStage("camera")}>
                    <Camera className="h-5 w-5" /> Start Live Scan
                  </Button>
                </div>
                <div className="mt-8 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400 text-left">
                      <strong>Medical Disclaimer:</strong> This AI scan is for informational purposes only and does not
                      constitute a medical diagnosis. Always consult a licensed dermatologist for medical concerns.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {stage === "camera" && (
              <motion.div key="camera" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-1">Live Skin Scan</h2>
                  <p className="text-sm text-muted-foreground">
                    AI doctor aapko guide kar rahi hai. Camera ke saamne beth jayein — glasses/makeup agar ho to utar dein.
                  </p>
                </div>

                <ScannerCamera
                  ref={cameraRef}
                  onReadyChange={setReady}
                  onIssuesChange={setIssues}
                />

                {ready ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <Card className="p-4">
                      <FeatureSelector selected={selectedFeatures} onChange={setSelectedFeatures} />
                    </Card>
                    <Button
                      size="lg"
                      className="w-full medical-gradient text-white gap-2"
                      onClick={startScan}
                      disabled={isScanning}
                    >
                      {isScanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
                      Start Scan
                    </Button>
                  </motion.div>
                ) : (
                  issues.length > 0 && (
                    <div className="space-y-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-sm text-amber-700 dark:text-amber-400">
                      <p className="font-semibold">Fix these to start:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        {issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </motion.div>
            )}

            {stage === "scan" && (
              <motion.div key="scan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="text-center py-4">
                  <h2 className="text-xl font-semibold mb-2">AI is Scanning Your Skin</h2>
                  <p className="text-sm text-muted-foreground mb-6">Live frame captured. Analysis may take up to 2 minutes.</p>
                </div>
                <LiveResults scanResult={scanResult} isScanning={isScanning} progress={progress} currentStage={currentStage} onDownloadPdf={downloadPdf} />
                {error && <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>}
              </motion.div>
            )}

            {stage === "results" && scanResult && (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Scan Results</h2>
                    <p className="text-sm text-muted-foreground">Analysis complete. Aap ki professional skin report taiyaar hai.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setStage("scan")} disabled={isScanning}>
                      <Sparkles className="h-4 w-4 mr-1" /> Re-scan
                    </Button>
                    <Button variant="outline" size="sm" onClick={reset}>New Scan</Button>
                  </div>
                </div>
                <div className="flex justify-center">
                  <AiAvatar
                    message="Doctor ki report taiyaar hai! Main aap ko results samjha rahi hoon."
                    speaking={resultSpeaking}
                    status="success"
                    size="md"
                  />
                </div>
                {resultSpeaking && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Volume2 className="h-4 w-4" /> Listening to doctor's guidance...
                  </div>
                )}
                <LiveResults scanResult={scanResult} isScanning={false} progress={100} currentStage="report" onDownloadPdf={downloadPdf} />
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => router.push("/dashboard")}>
                    <FileText className="h-4 w-4" /> View Dashboard
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2" onClick={reset}>Another Scan</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </>
  )
}