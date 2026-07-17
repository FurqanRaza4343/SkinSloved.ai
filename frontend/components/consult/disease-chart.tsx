"use client"

import { motion } from "framer-motion"

interface Detection {
  disease: string
  confidence: number
  severity: string
}

const severityColors: Record<string, string> = {
  mild: "bg-emerald-500",
  moderate: "bg-amber-500",
  severe: "bg-red-500",
}

const severityBg: Record<string, string> = {
  mild: "bg-emerald-100 dark:bg-emerald-950/30",
  moderate: "bg-amber-100 dark:bg-amber-950/30",
  severe: "bg-red-100 dark:bg-red-950/30",
}

export function DiseaseChart({ detections }: { detections: Detection[] }) {
  if (!detections || detections.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detected Conditions</h3>
      <div className="space-y-2">
        {detections.map((d, i) => (
          <motion.div
            key={d.disease}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{d.disease}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{d.severity}</span>
                <span className={`text-xs font-bold ${
                  d.confidence >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                  d.confidence >= 40 ? "text-amber-600 dark:text-amber-400" :
                  "text-muted-foreground"
                }`}>{d.confidence}%</span>
              </div>
            </div>
            <div className={`h-2.5 rounded-full ${severityBg[d.severity] || "bg-muted"}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${d.confidence}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 + 0.2, ease: "easeOut" }}
                className={`h-full rounded-full ${severityColors[d.severity] || "bg-primary"}`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export function SeverityGauge({ severity }: { severity: string }) {
  const score = severity === "severe" ? 75 : severity === "moderate" ? 50 : 25
  const color = severity === "severe" ? "text-red-500" : severity === "moderate" ? "text-amber-500" : "text-emerald-500"
  const bgColor = severity === "severe" ? "stroke-red-200 dark:stroke-red-900" : severity === "moderate" ? "stroke-amber-200 dark:stroke-amber-900" : "stroke-emerald-200 dark:stroke-emerald-900"
  const fillColor = severity === "severe" ? "#ef4444" : severity === "moderate" ? "#f59e0b" : "#10b981"

  const circumference = 2 * Math.PI * 40
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" className={bgColor} />
        <motion.circle
          cx="50" cy="50" r="40" fill="none" strokeWidth="8"
          stroke={fillColor}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          transform="rotate(-90 50 50)"
        />
        <motion.text
          x="50" y="50" textAnchor="middle" dy="0.35em"
          className={`text-2xl font-bold ${color}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {severity.toUpperCase()}
        </motion.text>
      </svg>
      <p className="text-xs text-muted-foreground mt-1">Severity</p>
    </div>
  )
}
