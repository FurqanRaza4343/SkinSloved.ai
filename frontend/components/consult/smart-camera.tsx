"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Camera, CameraOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CameraGuideProps {
  onCapture: (blob: Blob) => void
  disabled?: boolean
}

export function SmartCamera({ onCapture, disabled }: CameraGuideProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const [feedback, setFeedback] = useState<string[]>([])
  const [capturing, setCapturing] = useState(false)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setActive(true)
    } catch {
      setFeedback(["Camera access denied"])
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setActive(false)
  }

  const analyzeFrame = () => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return

    const msgs: string[] = []
    const brightness = calculateBrightness(video)
    const sharpness = calculateSharpness(video)

    if (brightness < 40) msgs.push("Increase lighting")
    else if (brightness > 90) msgs.push("Too bright, reduce light")
    else msgs.push("Good lighting")

    if (sharpness < 30) msgs.push("Camera is blurry, steady your hand")
    else msgs.push("Sharp image")

    setFeedback(msgs)
  }

  useEffect(() => {
    if (!active) return
    const interval = setInterval(analyzeFrame, 1000)
    return () => clearInterval(interval)
  }, [active])

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

  return (
    <div className="space-y-3">
      {!active ? (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={startCamera}
          disabled={disabled}
        >
          <Camera className="h-4 w-4" /> Open Smart Camera
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-64 object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {feedback.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex flex-wrap gap-2">
                  {feedback.map((msg, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        msg.includes("Good") || msg.includes("Sharp")
                          ? "bg-emerald-500/80 text-white"
                          : msg.includes("Increase") || msg.includes("blurry") || msg.includes("bright")
                          ? "bg-amber-500/80 text-white"
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={stopCamera} className="gap-1">
              <CameraOff className="h-4 w-4" /> Cancel
            </Button>
            <Button size="sm" className="medical-gradient text-white gap-1" onClick={capture} disabled={capturing}>
              {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Capture Photo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function calculateBrightness(video: HTMLVideoElement): number {
  const canvas = document.createElement("canvas")
  canvas.width = 100
  canvas.height = 100
  const ctx = canvas.getContext("2d")
  if (!ctx) return 50
  ctx.drawImage(video, 0, 0, 100, 100)
  const data = ctx.getImageData(0, 0, 100, 100).data
  let sum = 0
  for (let i = 0; i < data.length; i += 4) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3
  }
  return (sum / (data.length / 4) / 255) * 100
}

function calculateSharpness(video: HTMLVideoElement): number {
  const canvas = document.createElement("canvas")
  canvas.width = 100
  canvas.height = 100
  const ctx = canvas.getContext("2d")
  if (!ctx) return 50
  ctx.drawImage(video, 0, 0, 100, 100)
  const data = ctx.getImageData(0, 0, 100, 100).data
  let sum = 0
  for (let i = 4; i < data.length - 4; i += 4) {
    const diff = Math.abs(data[i] - data[i - 4]) + Math.abs(data[i] - data[i + 4])
    sum += diff
  }
  return Math.min(100, (sum / (data.length / 4)) * 5)
}
