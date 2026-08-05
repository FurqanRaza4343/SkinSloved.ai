"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"

interface AiAvatarProps {
  message: string
  status?: "idle" | "speaking" | "listening" | "warning" | "success"
  size?: "sm" | "md" | "lg"
}

const SIZE_CLASSES = { sm: "w-16 h-16", md: "w-24 h-24", lg: "w-32 h-32" }
const STATUS_COLORS = {
  idle: "from-sky-400 to-teal-500",
  speaking: "from-teal-400 to-cyan-500",
  listening: "from-purple-400 to-pink-500",
  warning: "from-amber-400 to-orange-500",
  success: "from-emerald-400 to-green-500",
}

export function AiAvatar({ message, status = "idle", size = "md" }: AiAvatarProps) {
  const [lipsOpen, setLipsOpen] = useState(false)

  useEffect(() => {
    if (status === "speaking" && message) {
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(message)
        utterance.rate = 0.9
        utterance.pitch = 1.1
        speechSynthesis.speak(utterance)
      }
      const interval = setInterval(() => setLipsOpen((v) => !v), 250)
      return () => clearInterval(interval)
    } else {
      speechSynthesis.cancel()
      setLipsOpen(false)
    }
  }, [message, status])

  const faceEmoji = status === "warning" ? "⚠️" : status === "success" ? "😊" : "🤖"

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`relative rounded-full overflow-hidden shadow-xl border-4 border-background bg-gradient-to-br ${STATUS_COLORS[status]} ${SIZE_CLASSES[size]}`}
        animate={{ scale: status === "speaking" ? [1, 1.03, 1] : 1 }}
        transition={{ duration: 0.5, repeat: status === "speaking" ? Infinity : 0 }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-2/3 h-2/3 flex items-center justify-center">
            <span className="text-3xl">{faceEmoji}</span>

            {status === "speaking" && (
              <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2">
                <svg width="40" height="12" viewBox="0 0 40 12">
                  <path
                    d={lipsOpen ? "M5,8 Q20,2 35,8 Q20,12 5,8 Z" : "M8,8 Q20,4 32,8 Q20,10 8,8 Z"}
                    fill="white"
                    opacity="0.7"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        {status === "listening" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/50 rounded-full animate-ping" />
          </div>
        )}

        {status === "warning" && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-300 rounded-full animate-pulse" />
        )}
      </motion.div>

      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-medium text-center text-foreground bg-background/80 px-2 py-1 rounded-lg shadow max-w-[180px]"
        >
          {message}
        </motion.p>
      )}
    </div>
  )
}
