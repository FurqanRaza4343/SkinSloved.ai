"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Camera, CameraOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AiAvatar } from "./ai-avatar"
import { cn } from "@/lib/utils"

interface CameraFeedback {
  lighting: "poor" | "good" | "too_bright"
  blur: "blurry" | "clear"
  face_distance: "too_close" | "good" | "too_far"
  makeup: boolean
  glasses: boolean
  face_visible: boolean
}

interface ScannerCameraProps {
  onCapture: (blob: Blob) => void
  onFeedback: (feedback: CameraFeedback | null) => void
  feedback: CameraFeedback | null
  disabled?: boolean
}

export function ScannerCamera({ onCapture, onFeedback, feedback, disabled }: ScannerCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [hasError, setHasError] = useState(false)

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
    } catch (err) {
      console.error("Camera error:", err)
      setHasError(true)
      onFeedback({
        lighting: "good",
        blur: "clear",
        face_distance: "good",
        makeup: false,
        glasses: false,
        face_visible: false,
      })
    } finally {
      setStarting(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setHasError(false)
    setActive(false)
  }

  const analyzeFrame = useCallback(() => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return

    const canvas = document.createElement("canvas")
    canvas.width = 100
    canvas.height = 100
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, 100, 100)
    const data = ctx.getImageData(0, 0, 100, 100).data

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

    let lighting: CameraFeedback["lighting"] = "good"
    if (brightness < 40) lighting = "poor"
    else if (brightness > 90) lighting = "too_bright"

    let blur: CameraFeedback["blur"] = "clear"
    if (sharpness < 30) blur = "blurry"

    let face_distance: CameraFeedback["face_distance"] = "good"

    const fb: CameraFeedback = {
      lighting,
      blur,
      face_distance,
      makeup: false,
      glasses: false,
      face_visible: true,
    }
    onFeedback(fb)
  }, [onFeedback])

  useEffect(() => {
    if (!active) return
    const interval = setInterval(analyzeFrame, 500)
    return () => clearInterval(interval)
  }, [active, analyzeFrame])

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    setCapturing(true)
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob)
      setCapturing(false)
      stopCamera()
    }, "image/jpeg", 0.9)
  }, [onCapture])

  const getFeedbackMessages = () => {
    if (!feedback) return []
    const msgs: string[] = []

    if (feedback.lighting === "poor") msgs.push("Room light low hai - increase lighting")
    else if (feedback.lighting === "too_bright") msgs.push("Too bright - reduce light")

    if (feedback.blur === "blurry") msgs.push("Face blur hai - steady your hand")

    if (feedback.face_distance === "too_close") msgs.push("Camera close lao - move back thoda")
    else if (feedback.face_distance === "too_far") msgs.push("Camera move back - come closer")

    if (feedback.makeup) msgs.push("Makeup remove karo please")
    if (feedback.glasses) msgs.push("Glasses remove karo please")

    if (msgs.length === 0) msgs.push("Setting theo - taiyaar hai capture ke liye")
    return msgs
  }

  const allChecksPass = feedback &&
    feedback.lighting === "good" &&
    feedback.blur === "clear" &&
    feedback.face_distance === "good" &&
    !feedback.makeup &&
    !feedback.glasses

  const feedbackMsgs = getFeedbackMessages()
  const currentMessage = feedbackMsgs[0] || "Position face in frame"
  const avatarStatus: "idle" | "speaking" | "listening" | "warning" | "success" =
    !feedback
      ? "listening"
      : allChecksPass
      ? "success"
      : feedbackMsgs.some((m) => m.includes("low") || m.includes("blurry") || m.includes("remove"))
      ? "warning"
      : "listening"

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
          <AiAvatar message={currentMessage} status={avatarStatus} size="md" />
        </div>

        {/* Camera - Right side */}
        <div className="relative rounded-xl overflow-hidden bg-black flex-1">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-64 object-cover mirror-video"
          />
          <canvas ref={canvasRef} className="hidden" />

          {feedback && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex flex-wrap gap-1.5">
                {feedbackMsgs.map((msg, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      msg.includes("low") || msg.includes("blurry") || msg.includes("remove")
                        ? "bg-amber-500/80 text-white"
                        : msg.includes("theo") || msg.includes("setti")
                        ? "bg-emerald-500/80 text-white"
                        : "bg-blue-500/80 text-white"
                    }`}
                  >
                    {msg}
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
          <Button
            size="sm"
            className="medical-gradient text-white gap-1"
            onClick={capture}
            disabled={capturing || !allChecksPass}
            title="Capture Photo"
          >
            {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Capture
          </Button>
        </div>
      </div>
    </div>
  )
}
