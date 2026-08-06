"use client"

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react"
import { Camera, CameraOff, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AiAvatar } from "./ai-avatar"
import { cn } from "@/lib/utils"
import { useSpeech } from "@/lib/speech"
import { BACKEND_URL } from "@/lib/config"

interface CameraIssue {
  key: string
  text: string
  tip: string
  spoken: string
}

interface ScannerCameraHandle {
  getFrame: () => Promise<Blob | null>
  stopCamera: () => void
}

export type { ScannerCameraHandle }

interface ScannerCameraProps {
  disabled?: boolean
  onReadyChange?: (ready: boolean) => void
  onIssuesChange?: (issues: string[]) => void
}

const GREETING = "Hello! I am your AI skin doctor. Please bring your face in front of the camera and sit in good, even lighting so I can check your skin properly."

const READY_MSG = "Great, your setup is perfect. Now tell me what you would like to check for your skin. Acne, pigmentation, dry skin, or a full skin check? Select an option below and press Start Scan."

function buildSpoken(issues: CameraIssue[], allGood: boolean): string {
  if (allGood) return READY_MSG
  return issues.map((i) => i.spoken).join(" ")
}

export const ScannerCamera = forwardRef<ScannerCameraHandle, ScannerCameraProps>(
  function ScannerCamera({ disabled, onReadyChange, onIssuesChange }: ScannerCameraProps, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const [active, setActive] = useState(false)
    const [starting, setStarting] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [issues, setIssues] = useState<CameraIssue[]>([])
    const [ready, setReady] = useState(false)
    const greetedRef = useRef(false)
    const issuesKeyRef = useRef("")

    const { speak, stop, speaking } = useSpeech()

    const getFrame = useCallback((): Promise<Blob | null> => {
      return new Promise((resolve) => {
        let attempts = 0
        const tryGrab = () => {
          const video = videoRef.current
          const canvas = canvasRef.current
          if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
            if (attempts < 10) {
              attempts += 1
              setTimeout(tryGrab, 120)
              return
            }
            resolve(null)
            return
          }
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            resolve(null)
            return
          }
          ctx.save()
          ctx.scale(-1, 1)
          ctx.translate(-canvas.width, 0)
          ctx.drawImage(video, 0, 0)
          ctx.restore()
          canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92)
        }
        tryGrab()
      })
    }, [])

    useImperativeHandle(ref, () => ({ getFrame, stopCamera }))

    const startCamera = async () => {
      setStarting(true)
      setHasError(false)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.muted = true
          video.srcObject = stream
          try {
            await video.play()
          } catch (e) {
            console.error("Video play error:", e)
            setHasError(true)
          }
        }
        setActive(true)
        setTimeout(() => {
          if (!greetedRef.current) {
            greetedRef.current = true
            speak(GREETING)
          }
        }, 800)
      } catch (err) {
        console.error("Camera error:", err)
        setHasError(true)
      } finally {
        setStarting(false)
      }
    }

    const stopCamera = useCallback(() => {
      stop()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setHasError(false)
      setActive(false)
      setReady(false)
      setIssues([])
    }, [stop])

    // Client-side lighting + blur detection (instant)
    useEffect(() => {
      if (!active) return
      const interval = setInterval(() => {
        const video = videoRef.current
        if (!video || video.readyState < 2) return
        const c = document.createElement("canvas")
        c.width = 120
        c.height = 90
        const ctx = c.getContext("2d")
        if (!ctx) return
        ctx.drawImage(video, 0, 0, 120, 90)
        const data = ctx.getImageData(0, 0, 120, 90).data
        let brightness = 0
        for (let i = 0; i < data.length; i += 4) {
          brightness += (data[i] + data[i + 1] + data[i + 2]) / 3
        }
        brightness = (brightness / (data.length / 4) / 255) * 100
        let sharpness = 0
        for (let i = 4; i < data.length - 4; i += 4) {
          sharpness += Math.abs(data[i] - data[i - 4]) + Math.abs(data[i] - data[i + 4])
        }
        sharpness = Math.min(100, (sharpness / (data.length / 4)) * 5)

        const newIssues: CameraIssue[] = []
        if (brightness < 45) {
          newIssues.push({
            key: "light",
            text: "Lighting low",
            tip: "Turn on more light",
            spoken: "Your room light is a bit low. Please turn on more light so the scan can work properly.",
          })
        } else if (brightness > 92) {
          newIssues.push({
            key: "bright",
            text: "Too bright",
            tip: "Reduce the light",
            spoken: "It is too bright. Please move to slightly less light.",
          })
        }
        if (sharpness < 35) {
          newIssues.push({
            key: "blur",
            text: "Face blurry",
            tip: "Keep steady",
            spoken: "Your face looks a bit blurry. Please keep your phone steady.",
          })
        }

        setIssues((prev) => {
          const merged = [...newIssues]
          for (const prevIssue of prev) {
            if (prevIssue.key === "glasses" || prevIssue.key === "makeup" || prevIssue.key === "face") {
              merged.push(prevIssue)
            }
          }
          const key = merged.map((m) => m.key).sort().join(",")
          const readyState = merged.length === 0
          if (key !== issuesKeyRef.current) {
            issuesKeyRef.current = key
            setReady(readyState)
            const spoken = buildSpoken(merged, readyState)
            setTimeout(() => speak(spoken), 400)
          }
          return merged
        })
      }, 2200)
      return () => clearInterval(interval)
    }, [active, speak])

    // Backend AI frame analysis for glasses / makeup / face (throttled)
    useEffect(() => {
      if (!active) return
      let cancelled = false
      const runBackendAnalysis = async () => {
        try {
          const blob = await getFrame()
          if (!blob || cancelled) return
          const formData = new FormData()
          formData.append("image", blob, "frame.jpg")
          const response = await fetch(`${BACKEND_URL}/api/scanner/analyze-frame`, {
            method: "POST",
            body: formData,
          })
          if (!response.ok) return
          const data = await response.json()
          if (cancelled) return
          const aiIssues: CameraIssue[] = []
          if (data.glasses === true) {
            aiIssues.push({
              key: "glasses",
              text: "Glasses detected",
              tip: "Remove glasses",
              spoken:
                "Please remove your glasses so I can see your skin properly.",
            })
          }
          if (data.makeup === true) {
            aiIssues.push({
              key: "makeup",
              text: "Makeup detected",
              tip: "Remove makeup",
              spoken:
                "Please remove your makeup for an accurate skin scan.",
            })
          }
          if (data.face_visible === false) {
            aiIssues.push({
              key: "face",
              text: "Face not visible",
              tip: "Show your face",
              spoken:
                "Your face is not visible, please come in front of the camera.",
            })
          }
          if (data.face_distance === "too_close") {
            aiIssues.push({
              key: "close",
              text: "Too close",
              tip: "Move back a little",
              spoken: "A little too close, please move back.",
            })
          } else if (data.face_distance === "too_far") {
            aiIssues.push({
              key: "far",
              text: "Too far",
              tip: "Come closer",
              spoken: "A little too far, please come closer.",
            })
          }
          if (aiIssues.length) {
            setIssues((prev) => {
              const withoutAi = prev.filter((p) => p.key !== "glasses" && p.key !== "makeup" && p.key !== "face" && p.key !== "close" && p.key !== "far")
              const merged = [...withoutAi, ...aiIssues]
              const key = merged.map((m) => m.key).sort().join(",")
              if (key !== issuesKeyRef.current) {
                issuesKeyRef.current = key
                setReady(false)
                setTimeout(() => speak(buildSpoken(merged, false)), 400)
              }
              return merged
            })
          }
        } catch (e) {
          console.error("Backend frame analysis failed:", e)
        }
      }
      runBackendAnalysis()
      const interval = setInterval(runBackendAnalysis, 15000)
      return () => {
        cancelled = true
        clearInterval(interval)
      }
    }, [active, getFrame, speak])

    useEffect(() => {
      onReadyChange?.(ready)
    }, [ready, onReadyChange])

    useEffect(() => {
      onIssuesChange?.(issues.map((i) => i.text))
    }, [issues, onIssuesChange])

    const status: "idle" | "listening" | "warning" | "success" = !active
      ? "idle"
      : ready
      ? "success"
      : "warning"

    return (
      <div className="space-y-3">
        {!active && (
          <Button variant="outline" className="w-full gap-2" onClick={startCamera} disabled={disabled || starting}>
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {starting ? "Starting camera..." : hasError ? "Retry Camera" : "Open Front Camera"}
          </Button>
        )}

        <div className={cn("flex items-start gap-4", !active && "hidden")}>
          {/* AI Avatar - Left side */}
          <div className="flex flex-col items-center gap-2">
            <AiAvatar
              message={ready ? "All set! Select your options" : issues.length ? issues[0].text + " - " + issues[0].tip : "Analyzing..."}
              speaking={speaking}
              status={status}
              size="md"
            />
            {speaking && <span className="text-[10px] text-muted-foreground animate-pulse">Speaking...</span>}
          </div>

          {/* Camera - Right side */}
          <div className="relative rounded-xl overflow-hidden bg-black flex-1 min-h-[22rem]">
            <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover mirror-video" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Face guide oval - helps position full face in frame */}
            {active && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-4/5 h-3/4 max-w-sm border-2 border-dashed border-white/40 rounded-[50%] transition-colors" style={{ borderColor: ready ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.4)" }} />
              </div>
            )}

            {/* Ready overlay */}
            {ready && (
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ready to scan
              </div>
            )}

            {/* Issue badges */}
            {issues.length > 0 && !ready && (
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/85 to-transparent">
                <div className="flex flex-wrap gap-1.5">
                  {issues.map((issue) => (
                    <span
                      key={issue.key}
                      className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/85 text-white"
                      title={issue.tip}
                    >
                      {issue.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={stopCamera} className="gap-1" title="Cancel">
              <CameraOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }
)
