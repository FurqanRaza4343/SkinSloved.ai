"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Sparkles, FileText, Shield, Upload } from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { AiAvatar } from "@/components/scanner/ai-avatar"
import { ScannerCamera } from "@/components/scanner/scanner-camera"
import { FeatureSelector, SCANNER_FEATURES } from "@/components/scanner/feature-selector"
import { LiveResults, ScanResult } from "@/components/scanner/live-results"
import { BACKEND_URL } from "@/lib/config"
import { useAuth } from "@/lib/auth-context"

type Stage = "landing" | "camera" | "select" | "scan" | "results"

const AI_AVATAR_MESSAGES: Record<Stage, string> = {
  landing: "Hello! I am your AI skin specialist. Let us scan your skin together!",
  camera: "Please position your face in the frame. Let me guide you.",
  select: "Which skin concerns would you like me to check?",
  scan: "Scanning your skin now... analyzing detected features.",
  results: "Scan complete! Here are your results.",
}

export default function LiveDetectionPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>("landing")
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<any>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState("")
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const handleCapture = (blob: Blob) => {
    setImageBlob(blob)
    const url = URL.createObjectURL(blob)
    setImagePreview(url)
    setStage("select")
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageBlob(file)
      const url = URL.createObjectURL(file)
      setImagePreview(url)
      setStage("select")
    }
  }

  const startScan = async () => {
    if (!imageBlob) return
    setError("")
    setIsScanning(true)
    setProgress(0)
    setCurrentStage("camera")
    setStage("scan")

    const formData = new FormData()
    formData.append("image", imageBlob, "skin_photo.jpg")
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
        const err = await response.json()
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
    } finally {
      clearInterval(interval)
    }
  }

  const reset = () => {
    setStage("landing")
    setSelectedFeatures([])
    setImageBlob(null)
    setImagePreview(null)
    setFeedback(null)
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

  const avatarMessage = AI_AVATAR_MESSAGES[stage]

  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
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
                  <Sparkles className="h-4 w-4" /> Live Detection
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  AI Skin <span className="bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">Scanner</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                  Use your front camera for real-time skin analysis. Our AI will guide you through the scan
                  and detect up to 17 skin conditions instantly.
                </p>
                <div className="mb-8 flex justify-center">
                  <AiAvatar message={avatarMessage} status="idle" size="lg" />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="medical-gradient text-white shadow-lg gap-2" onClick={() => setStage("camera")}>
                    <Camera className="h-5 w-5" /> Start Skin Scan
                  </Button>
                  <Button size="lg" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-5 w-5" /> Upload Photo
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
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
                 <div className="mb-4">
                   <h2 className="text-xl font-semibold mb-2">Position Your Face</h2>
                   <p className="text-sm text-muted-foreground">AI avatar gives you real-time feedback for best scan.</p>
                 </div>
                 <ScannerCamera onCapture={handleCapture} onFeedback={setFeedback} feedback={feedback} />
               </motion.div>
             )}

            {stage === "select" && imagePreview && (
              <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold mb-2">Select Skin Concerns</h2>
                  <p className="text-sm text-muted-foreground mb-4">Choose which conditions to detect, or select all to scan for everything.</p>
                </div>
                <div className="mb-4 flex justify-center">
                  <AiAvatar message={avatarMessage} status="speaking" size="sm" />
                </div>
                <Card className="p-4 mb-4">
                  <img src={imagePreview} alt="Captured" className="w-full h-48 object-cover rounded-lg" />
                </Card>
                <FeatureSelector selected={selectedFeatures} onChange={setSelectedFeatures} />
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setStage("camera")} className="flex-1">Retake Photo</Button>
                  <Button className="flex-1 medical-gradient text-white" onClick={startScan} disabled={isScanning}>
                    {isScanning ? "Scanning..." : "Start Scan"}
                  </Button>
                </div>
              </motion.div>
            )}

            {stage === "scan" && (
              <motion.div key="scan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="text-center py-8">
                  <h2 className="text-xl font-semibold mb-2">AI is Scanning Your Skin</h2>
                  <p className="text-sm text-muted-foreground mb-6">This will take up to 2 minutes. Please wait patiently.</p>
                </div>
                <div className="mb-4 flex justify-center">
                  <AiAvatar message={avatarMessage} status="speaking" size="md" />
                </div>
                <LiveResults scanResult={scanResult} isScanning={isScanning} progress={progress} currentStage={currentStage} onDownloadPdf={downloadPdf} />
                {error && <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">{error}</div>}
                {!isScanning && !scanResult && <div className="text-center"><Button variant="outline" onClick={reset}>Try Again</Button></div>}
              </motion.div>
            )}

            {stage === "results" && scanResult && (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Scan Results</h2>
                    <p className="text-sm text-muted-foreground">Analysis complete. Your professional skin report is ready.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setStage("scan")}>
                      <Sparkles className="h-4 w-4 mr-1" /> Re-scan
                    </Button>
                    <Button variant="outline" size="sm" onClick={reset}>New Scan</Button>
                  </div>
                </div>
                <div className="mb-4 flex justify-center">
                  <AiAvatar message={avatarMessage} status="success" size="md" />
                </div>
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
