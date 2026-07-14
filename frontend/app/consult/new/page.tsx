"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Stethoscope, Mic, StopCircle, Upload, Image, Video, Send, Loader2, AlertTriangle, CheckCircle2, Heart, Play, FileDown, ShoppingCart, ExternalLink, Sparkles } from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { useAuth } from "@/lib/auth-context"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

type Stage = "input" | "processing" | "result"

export default function NewConsultationPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [stage, setStage] = useState<Stage>("input")
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecorded, setHasRecorded] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [result, setResult] = useState<{ id: string; transcript: string; response: string; products_text: string; audioUrl: string | null; imageUrl: string | null } | null>(null)
  const [error, setError] = useState("")
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
    } catch (err) {
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
    }
  }

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
      setVideoPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async () => {
    if (!audioBlob) {
      setError("Please record your voice first.")
      return
    }
    if (!imageFile) {
      setError("Please upload a skin image.")
      return
    }
    setStage("processing")
    setError("")

    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")
      formData.append("image", imageFile)
      if (videoFile) formData.append("video", videoFile)

      const response = await fetch(`${BACKEND}/api/consultations`, {
        method: "POST",
        headers: { "X-User-Id": user!.id },
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.detail || "Evaluation failed")
      }

      const data = await response.json()
      setResult({
        id: data.consultation_id,
        transcript: data.transcript,
        response: data.doctor_response,
        products_text: data.products_text || "",
        audioUrl: data.audio_url,
        imageUrl: data.image_url,
      })
      setStage("result")
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
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Describe Your Skin Concern</h1>
            <p className="text-muted-foreground mt-2">Record your voice and upload images for AI-powered analysis.</p>
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
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer group"
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
                        <button onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null) }} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-xs font-bold hover:bg-background">✕</button>
                      )}
                    </div>
                    <div
                      onClick={() => videoInputRef.current?.click()}
                      className="relative flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer group"
                    >
                      {videoPreview ? (
                        <video src={videoPreview} className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                      ) : (
                        <>
                          <Video className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                          <p className="text-sm text-muted-foreground mt-2">Upload Skin Video</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">MP4, MOV up to 50MB</p>
                        </>
                      )}
                      <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                      {videoPreview && (
                        <button onClick={(e) => { e.stopPropagation(); setVideoFile(null); setVideoPreview(null) }} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-xs font-bold hover:bg-background">✕</button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button variant="outline" size="lg" onClick={resetForm}>Reset</Button>
                <Button size="xl" className="medical-gradient text-white shadow-lg gap-2" disabled={!hasRecorded} onClick={handleSubmit}>
                  <Send className="h-5 w-5" /> Analyze Concern
                </Button>
              </div>
            </motion.div>
          )}

          {stage === "processing" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
              <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
              <h2 className="text-2xl font-bold mt-6">Analyzing Your Skin Concern</h2>
              <p className="text-muted-foreground mt-2">Our AI is reviewing your voice description and images...</p>
              <div className="max-w-sm mx-auto mt-8 space-y-3 text-left">
                {["Transcribing voice...", "Analyzing images...", "Generating guidance..."].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                    <span className="text-muted-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {stage === "result" && result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mic className="h-5 w-5 text-primary" />
                    Your Speech Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-xl bg-muted/50 italic text-muted-foreground">&ldquo;{result.transcript}&rdquo;</div>
                </CardContent>
              </Card>

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

              {result.products_text && (
                <Card className="border-border/60">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                      Recommended Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50 to-teal-50 dark:from-sky-950/20 dark:to-teal-950/20 border border-sky-100 dark:border-sky-900/50">
                      <div className="flex items-start gap-2 mb-3">
                        <Sparkles className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">Based on your skin analysis, these products may help:</p>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{result.products_text}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/70">
                        <ExternalLink className="h-3 w-3" />
                        <span>Search these on Amazon or your local pharmacy</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                {result.audioUrl && (
                  <Card className="flex-1 border-border/60">
                    <CardContent className="p-4 flex items-center gap-4">
                      <audio controls src={result.audioUrl} className="w-full" />
                    </CardContent>
                  </Card>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" size="lg" onClick={downloadPdf} className="gap-2">
                    <FileDown className="h-4 w-4" /> Download PDF
                  </Button>
                  <Button size="lg" className="medical-gradient text-white shadow-lg" onClick={() => router.push("/dashboard")}>
                    View Dashboard
                  </Button>
                  <Button variant="outline" size="lg" onClick={resetForm}>New Consultation</Button>
                </div>
              </div>

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
