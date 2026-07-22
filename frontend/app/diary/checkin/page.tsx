"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, Camera, Image as ImageIcon, Sparkles, Loader2,
  CheckCircle2, Sun, CloudSun, Bot, Send, ChevronDown, ChevronUp
} from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://skin-sloved-api-d147cddd-7969-4814-a9d5-165f122a1278.fly.dev"

function CheckinChat({
  consultationId, onReset
}: {
  consultationId: string
  onReset: () => void
}) {
  const router = useRouter()
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [chatInit, setChatInit] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!chatInit) {
      setChatInit(true)
      const stored = localStorage.getItem("diary_ids")
      let ids = [consultationId]
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) ids = [...new Set([...parsed, consultationId])]
        } catch {}
      }
      localStorage.setItem("diary_ids", JSON.stringify(ids))
      setTimeout(() => sendMessage("Tell me about my skin today and compare it with my previous check-ins. Be conversational and encouraging.", ids), 500)
    }
  }, [chatInit, consultationId])

  const sendMessage = async (msg?: string, overrideIds?: string[]) => {
    const text = msg || input
    if (!text.trim() || loading) return
    const userMsg = text.trim()
    setMessages(prev => [...prev, { role: "user", content: userMsg }])
    if (!msg) setInput("")
    setLoading(true)
    try {
      const stored = localStorage.getItem("diary_ids")
      let ids = overrideIds || [consultationId]
      if (!overrideIds && stored) {
        try { ids = [...new Set([...JSON.parse(stored), consultationId])] } catch {}
      }
      const res = await fetch(`${BACKEND}/api/diary/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          consultation_ids: ids,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      })
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.response }])
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't analyze your check-in right now. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    "How is my skin doing?",
    "What changed since yesterday?",
    "Rate my skin 1-10",
    "What should I change?",
    "Give me a skincare routine",
    "Any concerns I should watch?",
  ]

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          AI Skin Coach
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => { setMessages([]); setChatInit(false) }} className="h-8 text-xs gap-1">
          <Sparkles className="h-3 w-3" /> New Chat
        </Button>
      </CardHeader>
      <CardContent>
        <div className="h-72 sm:h-96 overflow-y-auto mb-3 space-y-3 rounded-xl bg-muted/30 p-3 border border-border/40">
          {messages.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Starting your AI Coach...</p>
              <p className="text-xs mt-1">Analyzing your skin check-in</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border/60 text-card-foreground rounded-bl-md"
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl px-4 py-2.5 bg-card border border-border/60 rounded-bl-md">
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {quickActions.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-accent border border-border/60 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendMessage() }}
            placeholder="Ask about your skin..."
            className="flex-1 h-10 px-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0 medical-gradient text-white"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DiaryCheckinPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ id: string; ai_response: string } | null>(null)
  const [error, setError] = useState("")
  const [cameraActive, setCameraActive] = useState(false)

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 720 }, height: { ideal: 1280 } },
      })
      setStream(s)
      setCameraActive(true)
      if (videoRef.current) videoRef.current.srcObject = s
    } catch {
      setError("Camera access denied. Please use photo upload instead.")
    }
  }

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
      setStream(null)
    }
    setCameraActive(false)
  }, [stream])

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.85))
    stopCamera()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCapturedImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setCapturedImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async () => {
    if (!capturedImage && !note.trim()) {
      setError("Please add a photo or a note before submitting.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`${BACKEND}/api/diary/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_data: capturedImage?.split(",")[1] || null,
          note: note.trim(),
          user_id: null,
        }),
      })
      if (!res.ok) throw new Error("Check-in failed")
      const data = await res.json()
      setResult(data)
    } catch {
      setError("Failed to save check-in. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setCapturedImage(null)
    setNote("")
  }

  if (result) {
    return (
      <>
        <Navbar />
        <main className="pt-24 min-h-screen pb-16">
          <div className="mx-auto max-w-2xl px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold mb-1">Check-In Complete!</h1>
                <p className="text-muted-foreground">Your daily skin diary entry has been saved.</p>
              </div>

              {result.ai_response && (
                <Card className="mb-6 text-left border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> AI Coach Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.ai_response}</p>
                  </CardContent>
                </Card>
              )}

              <div className="mb-6">
                <CheckinChat consultationId={result.id} onReset={handleReset} />
              </div>

              <div className="flex gap-3 justify-center">
                <Button onClick={() => router.push("/diary")} className="gap-1.5">
                  View My Diary
                </Button>
                <Button variant="outline" onClick={handleReset} className="gap-1.5">
                  Another Check-In
                </Button>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen pb-16">
        <div className="mx-auto max-w-lg px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Button variant="ghost" onClick={() => router.push("/diary")} className="mb-4 gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to Diary
            </Button>

            <div className="flex items-center gap-2 mb-2">
              <CloudSun className="h-5 w-5 text-primary" />
              <Badge variant="outline">Daily Skin Check-In</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">How is your skin today?</h1>
            <p className="text-muted-foreground mb-6">Take a photo and add a note to track your skin journey.</p>

            <div className="space-y-4 mb-6">
              {!capturedImage ? (
                <div className="space-y-3">
                  {cameraActive ? (
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4] max-h-96">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                        <Button size="sm" onClick={capturePhoto} className="gap-1.5">
                          <Camera className="h-4 w-4" /> Capture
                        </Button>
                        <Button size="sm" variant="secondary" onClick={stopCamera} className="gap-1.5">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button onClick={startCamera} className="flex-1 gap-2 h-20 rounded-xl" variant="outline">
                        <Camera className="h-6 w-6" />
                        <div className="text-left">
                          <p className="font-semibold text-sm">Open Camera</p>
                          <p className="text-xs text-muted-foreground">Take a photo now</p>
                        </div>
                      </Button>
                      <Button onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2 h-20 rounded-xl" variant="outline">
                        <ImageIcon className="h-6 w-6" />
                        <div className="text-left">
                          <p className="font-semibold text-sm">Upload Photo</p>
                          <p className="text-xs text-muted-foreground">From your gallery</p>
                        </div>
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden border border-border/60">
                  <img src={capturedImage} alt="Check-in" className="w-full object-cover max-h-80" />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={removePhoto}
                    className="absolute top-2 right-2"
                  >
                    Remove
                  </Button>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">How are you feeling?</label>
                <textarea
                  placeholder="Any changes today? New breakouts? How does your skin feel? (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 resize-none"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 mb-4">{error}</p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting || (!capturedImage && !note.trim())}
              className="w-full gap-1.5 medical-gradient text-white"
              size="lg"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Save Check-In</>
              )}
            </Button>

            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}