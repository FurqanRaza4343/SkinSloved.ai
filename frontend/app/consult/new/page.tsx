"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Stethoscope, Mic, StopCircle, Upload, Image, Video, Loader2,
  AlertTriangle, CheckCircle2, Heart, FileDown, ShoppingCart,
  ExternalLink, Sparkles, Volume2, VolumeX, Bot, MessageSquare,
  Camera, Play
} from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { useAuth } from "@/lib/auth-context"
import { DiseaseChart, SeverityGauge } from "@/components/consult/disease-chart"
import { FollowUpQuestions } from "@/components/consult/followup-questions"
import { SmartCamera } from "@/components/consult/smart-camera"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

type Stage = "input" | "questions" | "processing" | "result"

interface Detection {
  disease: string
  confidence: number
  severity: string
}

interface Product {
  brand: string
  name: string
  category: string
  key_ingredients: string[]
  description: string
  price_range: string
  image_url: string | null
  amazon_search_url: string
}

interface ResultData {
  id: string
  transcript: string
  response: string
  products_text?: string
  products: Product[]
  detections: Detection[]
  explanation: string
  audioUrl: string | null
  imageUrl: string | null
  severity: string
}

const AGENTS = [
  { id: "transcription", icon: Mic, label: "Transcribing Voice", color: "bg-sky-500" },
  { id: "vision", icon: Image, label: "Analyzing Images", color: "bg-violet-500" },
  { id: "diagnosis", icon: Stethoscope, label: "Detecting Conditions", color: "bg-amber-500" },
  { id: "treatment", icon: Sparkles, label: "Treatment Plan", color: "bg-emerald-500" },
  { id: "products", icon: ShoppingCart, label: "Product Recommendations", color: "bg-rose-500" },
] as const

function ConsultationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conditionParam = searchParams.get("condition") || ""
  const { user, loading: authLoading } = useAuth()
  const [stage, setStage] = useState<Stage>("input")
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecorded, setHasRecorded] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoMuted, setVideoMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [result, setResult] = useState<ResultData | null>(null)
  const [error, setError] = useState("")
  const [transcript, setTranscript] = useState("")
  const [transcribing, setTranscribing] = useState(false)
  const [followupAnswers, setFollowupAnswers] = useState<{ q: string; a: string }[]>([])
  const [agentStatus, setAgentStatus] = useState<Record<string, "pending" | "processing" | "done" | "error">>({})
  const [agentLabels, setAgentLabels] = useState<Record<string, string>>({})
  const [showCamera, setShowCamera] = useState(false)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) router.push("/login")
  }, [user, authLoading, router])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } })
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })
      chunks.current = []
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm;codecs=opus" })
        setAudioBlob(blob)
        setHasRecorded(true)
        stream.getTracks().forEach((t) => t.stop())
      }
      mediaRecorder.current.start()
      setIsRecording(true)
    } catch {
      setError("Microphone access denied. Please allow microphone permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop()
      setIsRecording(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setShowCamera(false)
    }
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(file))
    }
  }

  const handleCameraCapture = (blob: Blob) => {
    const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" })
    setImageFile(file)
    setImagePreview(URL.createObjectURL(blob))
  }

  const proceedToQuestions = async () => {
    if (!audioBlob) {
      setError("Please record your voice first.")
      return
    }
    if (!imageFile) {
      setError("Please upload a skin image.")
      return
    }
    setError("")
    setTranscribing(true)

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")
      const resp = await fetch(`${BACKEND}/api/transcribe`, { method: "POST", body: formData })
      if (!resp.ok) throw new Error("Transcription failed")
      const data = await resp.json()
      setTranscript(data.text || "")
    } catch {
      setTranscript("")
    }

    setTranscribing(false)
    setStage("questions")
  }

  const submitDirect = async () => {
    if (!audioBlob || !imageFile) return
    setTranscribing(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")
      const resp = await fetch(`${BACKEND}/api/transcribe`, { method: "POST", body: formData })
      if (!resp.ok) throw new Error("Transcription failed")
      const data = await resp.json()
      setTranscript(data.text || "")
    } catch {
      setTranscript("")
    }

    setTranscribing(false)
    submitConsultation([])
  }

  const handleFollowupComplete = (answers: { q: string; a: string }[]) => {
    setFollowupAnswers(answers)
    submitConsultation(answers)
  }

  const submitConsultation = async (answers: { q: string; a: string }[]) => {
    if (!audioBlob || !imageFile) return

    setStage("processing")
    setError("")
    setAgentStatus({})

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")
      formData.append("image", imageFile)
      if (videoFile) formData.append("video", videoFile)
      formData.append("answers", JSON.stringify(answers.map(a => `Q: ${a.q}\nA: ${a.a}`).join("\n")))
      if (conditionParam) formData.append("condition", conditionParam)

      const response = await fetch(`${BACKEND}/api/consultations/process`, {
        method: "POST",
        headers: { "X-User-Id": user!.id },
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || "Evaluation failed")
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === "result") {
              const d = event.data
              setResult({
                id: d.consultation_id,
                transcript: d.transcript,
                response: d.doctor_response,
                products_text: d.products_text || "",
                products: d.products || [],
                detections: d.detections || [],
                explanation: d.explanation || "",
                audioUrl: d.audio_url,
                imageUrl: d.image_url,
                severity: d.severity || "mild",
              })
              setStage("result")
              return
            }
            if (event.type === "error") {
              throw new Error(event.detail || "Analysis failed")
            }
            if (event.agent) {
              setAgentStatus(prev => ({ ...prev, [event.agent]: event.status }))
              if (event.label) {
                setAgentLabels(prev => ({ ...prev, [event.agent]: event.label }))
              }
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setError(err.message)
      setStage("input")
    }
  }

  const downloadPdf = () => {
    if (result) window.open(`${BACKEND}/api/consultations/${result.id}/report`, "_blank")
  }

  const resetForm = () => {
    setStage("input")
    setHasRecorded(false)
    setAudioBlob(null)
    setImageFile(null)
    setImagePreview(null)
    setVideoFile(null)
    setVideoPreview(null)
    setResult(null)
    setError("")
    setTranscript("")
    setFollowupAnswers([])
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="gap-1.5">
                <Heart className="h-3.5 w-3.5 text-primary" /> New Consultation
              </Badge>
              {conditionParam && (
                <Badge variant="secondary" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> {conditionParam.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Describe Your Skin Concern</h1>
            <p className="text-muted-foreground mt-2">
              {conditionParam
                ? `We see you're interested in ${conditionParam.replace(/-/g, " ")}. Tell us more about your specific concerns.`
                : "Record your voice, answer AI questions, and get a detailed analysis."}
            </p>
          </motion.div>

          {error && stage === "input" && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          )}

          {stage === "input" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    Record Your Voice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4 py-6">
                    {!hasRecorded ? (
                      <>
                        <p className="text-sm text-muted-foreground text-center max-w-md">
                          Describe your skin concern — symptoms, duration, triggers, and any products you&apos;ve tried.
                        </p>
                        <Button
                          size="xl"
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`gap-3 ${isRecording ? "bg-destructive hover:bg-destructive/90 animate-pulse" : "medical-gradient text-white shadow-lg"}`}
                        >
                          {isRecording ? (
                            <><StopCircle className="h-6 w-6" /> Stop Recording</>
                          ) : (
                            <><Mic className="h-6 w-6" /> Start Recording</>
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className="text-center">
                        <div className="flex items-center justify-center h-16 w-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="font-semibold">Recording Captured</p>
                        <p className="text-sm text-muted-foreground mt-1">Audio recorded successfully.</p>
                        <div className="flex gap-2 mt-4 justify-center">
                          <Button variant="outline" size="sm" onClick={() => { setHasRecorded(false); setAudioBlob(null) }}>
                            Re-record
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Upload Images & Video
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button variant={showCamera ? "default" : "outline"} size="sm" onClick={() => setShowCamera(true)} className="gap-1">
                        <Camera className="h-4 w-4" /> Smart Camera
                      </Button>
                      <Button variant={!showCamera ? "default" : "outline"} size="sm" onClick={() => setShowCamera(false)} className="gap-1">
                        <Upload className="h-4 w-4" /> Upload File
                      </Button>
                    </div>

                    {showCamera ? (
                      <SmartCamera onCapture={handleCameraCapture} />
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="relative flex flex-col items-center justify-center h-48 sm:h-72 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer group"
                        >
                          {imagePreview ? (
                            <img src={imagePreview} alt="Uploaded" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                          ) : (
                            <>
                              <Image className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                              <p className="text-sm text-muted-foreground mt-2">Upload Skin Image</p>
                              <p className="text-xs text-muted-foreground/60 mt-1">JPG, PNG up to 10MB</p>
                            </>
                          )}
                          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                          {imagePreview && (
                            <button onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); setShowCamera(false) }} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-xs font-bold hover:bg-background">
                              ✕
                            </button>
                          )}
                        </div>
                        <div
                          onClick={() => !videoPreview && videoInputRef.current?.click()}
                          className="relative flex flex-col items-center justify-center h-48 sm:h-72 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer group"
                        >
                          {videoPreview ? (
                            <div className="absolute inset-0 w-full h-full rounded-xl overflow-hidden bg-black">
                              <video
                                ref={videoRef}
                                src={videoPreview}
                                className="w-full h-full object-cover"
                                onClick={(e) => { e.stopPropagation(); if (videoRef.current) { if (videoRef.current.paused) { videoRef.current.play() } else { videoRef.current.pause() } }}}
                              />
                              {!videoRef.current?.paused && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
                                  <div className="h-full bg-primary" style={{ width: '30%' }} />
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); if (videoRef.current) { if (videoRef.current.paused) { videoRef.current.play() } else { videoRef.current.pause() } }}}
                              >
                                <div className="h-12 w-12 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center">
                                  <Play className="h-6 w-6 ml-0.5" />
                                </div>
                              </div>
                              <div className="absolute top-2 right-2 flex gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); const v = videoRef.current; if (v) { v.muted = !v.muted; setVideoMuted(v.muted) }}}
                                  className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background/90 transition-colors"
                                >
                                  {videoRef.current?.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <Video className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                              <p className="text-sm text-muted-foreground mt-2">Upload Skin Video</p>
                              <p className="text-xs text-muted-foreground/60 mt-1">MP4, MOV up to 50MB</p>
                            </>
                          )}
                          <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                          {videoPreview && (
                            <button onClick={(e) => { e.stopPropagation(); setVideoFile(null); setVideoPreview(null) }} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-xs font-bold hover:bg-background z-10">
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <Button variant="outline" size="lg" onClick={resetForm}>Reset</Button>
                <div className="flex gap-3">
                  <Button
                    size="xl"
                    variant="outline"
                    className="border-primary/40 text-primary hover:bg-primary/5 gap-2"
                    disabled={!hasRecorded || !imageFile}
                    onClick={submitDirect}
                  >
                    <Sparkles className="h-5 w-5" /> Direct Research
                  </Button>
                  <Button
                    size="xl"
                    className="medical-gradient text-white shadow-lg gap-2"
                    disabled={!hasRecorded || !imageFile}
                    onClick={proceedToQuestions}
                  >
                    <MessageSquare className="h-5 w-5" /> Continue to Q&A
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {stage === "questions" && transcript !== "" && (
            <FollowUpQuestions
              patientText={transcript}
              onComplete={handleFollowupComplete}
              onBack={() => setStage("input")}
            />
          )}

          {stage === "questions" && !transcript && (
            <FollowUpQuestions
              patientText="Patient has a skin concern described in their audio recording."
              onComplete={handleFollowupComplete}
              onBack={() => setStage("input")}
            />
          )}

          {stage === "processing" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-16">
              <div className="text-center mb-12">
                <div className="relative mx-auto w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                  <Stethoscope className="absolute inset-0 m-auto h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">AI Agents at Work</h2>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  Our multi-agent AI system is analyzing your skin concern in real-time.
                </p>
              </div>

              <div className="max-w-lg mx-auto space-y-4">
                {AGENTS.map((agent, i) => {
                  const status = agentStatus[agent.id] || "pending"
                  const isActive = status === "processing"
                  const isDone = status === "done"
                  const isError = status === "error"
                  const isWaiting = status === "pending"

                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 ${
                        isDone
                          ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20"
                          : isActive
                          ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/5"
                          : isError
                          ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20"
                          : "border-border/40 bg-muted/20"
                      }`}
                    >
                      <div className={`relative shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                        isDone
                          ? "bg-emerald-100 dark:bg-emerald-900/40"
                          : isActive
                          ? "bg-primary/10"
                          : "bg-muted/50"
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <agent.icon className={`h-5 w-5 transition-colors ${
                            isActive ? "text-primary" : "text-muted-foreground"
                          }`} />
                        )}
                        {isActive && (
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3">
                            <span className="animate-ping absolute inset-0 rounded-full bg-primary/60" />
                            <span className="rounded-full bg-primary h-full w-full block" />
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          isDone ? "text-emerald-700 dark:text-emerald-300" :
                          isActive ? "text-foreground" :
                          isError ? "text-red-600 dark:text-red-400" :
                          "text-muted-foreground"
                        }`}>
                          {agentLabels[agent.id] || agent.label}
                        </p>
                        {isActive && (
                          <div className="flex gap-1 mt-1.5">
                            <motion.span className="h-1.5 w-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0 }} />
                            <motion.span className="h-1.5 w-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} />
                            <motion.span className="h-1.5 w-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} />
                          </div>
                        )}
                        {isDone && (
                          <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">Completed</p>
                        )}
                        {isWaiting && (
                          <p className="text-xs text-muted-foreground/50 mt-0.5">Waiting...</p>
                        )}
                      </div>

                      {isDone && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="shrink-0 h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </motion.div>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Processing in real-time...</span>
                </div>
              </div>
            </motion.div>
          )}

          {stage === "result" && result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Severity + Detections Header */}
              <div className="grid sm:grid-cols-5 gap-4">
                <Card className="sm:col-span-1 border-border/60">
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <SeverityGauge severity={result.severity} />
                  </CardContent>
                </Card>
                <Card className="sm:col-span-4 border-border/60">
                  <CardContent className="p-4">
                    <DiseaseChart detections={result.detections} />
                  </CardContent>
                </Card>
              </div>

              {/* AI Explanation */}
              {result.explanation && (
                <Card className="border-border/60 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-sky-500 to-teal-500" />
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      AI Analysis & Reasoning
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 dark:from-sky-950/20 dark:to-teal-950/20 border border-sky-100 dark:border-sky-900/50">
                      <Sparkles className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                      <p className="text-sm leading-relaxed">{result.explanation}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transcript */}
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    Your Speech Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-xl bg-muted/50 italic text-muted-foreground">
                    &ldquo;{result.transcript}&rdquo;
                  </div>
                </CardContent>
              </Card>

              {/* Treatment Plan */}
              <Card className="border-border/60 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-sky-500 to-teal-500" />
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    Doctor&apos;s Guidance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{result.response}</p>
                </CardContent>
              </Card>

              {/* Products */}
              {(result.products?.length > 0) && (
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                      Recommended Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {result.products.map((product, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl border border-border/60 bg-card hover:shadow-md transition-shadow">
                          <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="h-full w-full object-contain" />
                            ) : (
                              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{product.brand}</p>
                            <p className="text-xs text-muted-foreground truncate">{product.name}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs font-medium text-sky-600">{product.price_range}</span>
                              <span className="text-xs text-muted-foreground/50">•</span>
                              <span className="text-xs text-muted-foreground capitalize">{product.category}</span>
                            </div>
                            {product.key_ingredients?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {product.key_ingredients.slice(0, 2).map((ing: string, j: number) => (
                                  <span key={j} className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 truncate max-w-24">{ing}</span>
                                ))}
                              </div>
                            )}
                            <a href={product.amazon_search_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                            >
                              <ExternalLink className="h-3 w-3" /> Search on Amazon
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Audio + Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                {result.audioUrl && (
                  <Card className="flex-1 border-border/60">
                    <CardContent className="p-4">
                      <audio controls src={result.audioUrl} className="w-full" />
                    </CardContent>
                  </Card>
                )}
                <div className="flex gap-3 flex-wrap">
                  <Button variant="outline" size="lg" onClick={downloadPdf} className="gap-2">
                    <FileDown className="h-4 w-4" /> Download PDF
                  </Button>
                  <Button size="lg" className="medical-gradient text-white shadow-lg" onClick={() => router.push("/dashboard")}>
                    View Dashboard
                  </Button>
                  <Button variant="outline" size="lg" onClick={resetForm}>New Consultation</Button>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-400">
                  <strong>Important:</strong> This analysis is generated by AI and is for informational purposes only.
                  It does not constitute a medical diagnosis. Please consult a licensed dermatologist for professional medical advice.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

export default function NewConsultationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ConsultationForm />
    </Suspense>
  )
}
