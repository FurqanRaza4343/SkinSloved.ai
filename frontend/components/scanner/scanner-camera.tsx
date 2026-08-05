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

const GREETING = "Assalam o Alaikum! Main aap ki AI skin doctor hoon. Please apna face camera ke saamne laayein. Halki si light mein beth jayein, taake main aap ki skin ko theek se check kar sakoon."

const READY_MSG = "Bahut khoob! Aap ki skin ki setup bilkul perfect hai. Ab aap batao, aap apni skin ka kya checkup karwana chahte hain? Acne, pigmentation, dry skin, ya poori skin check? Neeche options mein se select karein, aur Start Scan dabayein."

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
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState < 2) {
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
      })
    }, [])

    useImperativeHandle(ref, () => ({ getFrame, stopCamera }))

    const startCamera = async () => {
      setStarting(true)
      setHasError(false)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
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
            tip: "Room light on karo",
            spoken:
              "Aap ke room ki light thodi low hai. Please light on karein, taake scan sahi ho sakay. Lighting is a bit low, please turn on more light.",
          })
        } else if (brightness > 92) {
          newIssues.push({
            key: "bright",
            text: "Too bright",
            tip: "Light thodi kam karo",
            spoken: "Light bohat zyada hai. Please thodi kam light mein aa jayein. It is a bit too bright.",
          })
        }
        if (sharpness < 35) {
          newIssues.push({
            key: "blur",
            text: "Face blurry",
            tip: "Hand steady rakho",
            spoken: "Aap ka face thoda blur hai. Please apna phone steady rakhein. Your face looks a bit blurry, keep steady.",
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
              tip: "Glasses utar do",
              spoken:
                "Aapne glasses pehan rakhay hain. Please glasses utar dein, taake main aap ki skin ko sahi se dekh sakoon. Please remove your glasses.",
            })
          }
          if (data.makeup === true) {
            aiIssues.push({
              key: "makeup",
              text: "Makeup detected",
              tip: "Makeup remove karo",
              spoken:
                "Aapne makeup pehen rakha hai. Please makeup remove karein, taake skin analysis sahi ho. Please remove your makeup for accurate scan.",
            })
          }
          if (data.face_visible === false) {
            aiIssues.push({
              key: "face",
              text: "Face not visible",
              tip: "Apna face dikhao",
              spoken:
                "Aap ka face frame mein nahi aa raha. Please apna face camera ke saamne laayein. Your face is not visible, please come in front of the camera.",
            })
          }
          if (data.face_distance === "too_close") {
            aiIssues.push({
              key: "close",
              text: "Too close",
              tip: "Thoda peeche ho jao",
              spoken: "Camera bohat close hai. Please thoda peeche ho jayein. A little too close, please move back.",
            })
          } else if (data.face_distance === "too_far") {
            aiIssues.push({
              key: "far",
              text: "Too far",
              tip: "Thoda qareeb aao",
              spoken: "Camera bohat door hai. Please thoda qareeb aayein. A little too far, please come closer.",
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
              message={ready ? "Sab set hai! Options mein se select karo" : issues.length ? issues[0].text + " - " + issues[0].tip : "Analyzing..."}
              speaking={speaking}
              status={status}
              size="md"
            />
            {speaking && <span className="text-[10px] text-muted-foreground animate-pulse">Speaking...</span>}
          </div>

          {/* Camera - Right side */}
          <div className="relative rounded-xl overflow-hidden bg-black flex-1">
            <video ref={videoRef} muted playsInline className="w-full h-64 object-cover mirror-video" />
            <canvas ref={canvasRef} className="hidden" />

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
