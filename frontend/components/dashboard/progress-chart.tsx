"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface Consultation {
  id: string
  created_at: string
  severity: string | null
}

export function ProgressChart({ consultations }: { consultations: Consultation[] }) {
  const stats = useMemo(() => {
    if (consultations.length === 0) return null

    const sorted = [...consultations].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const severityMap: Record<string, number> = {
      mild: 1,
      moderate: 2,
      urgent: 3,
    }

    const scores = sorted.map((c) => {
      const base = c.severity ? severityMap[c.severity] || 1 : 1
      return { date: new Date(c.created_at), score: base }
    })

    const byMonth: Record<string, number[]> = {}
    scores.forEach((s) => {
      const key = `${s.date.getMonth() + 1}/${s.date.getFullYear()}`
      if (!byMonth[key]) byMonth[key] = []
      byMonth[key].push(s.score)
    })

    const monthlyAvg = Object.entries(byMonth).map(([month, vals]) => ({
      month,
      avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
    }))

    const first = scores[0]?.score || 1
    const last = scores[scores.length - 1]?.score || 1
    const trend = last < first ? "improving" : last > first ? "worsening" : "stable"

    return { monthlyAvg, trend, total: consultations.length, first, last }
  }, [consultations])

  if (!stats || consultations.length === 0) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Complete consultations to see your progress over time.
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxScore = 3
  const barHeight = 120

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {stats.trend === "improving" ? (
            <TrendingDown className="h-5 w-5 text-emerald-500" />
          ) : stats.trend === "worsening" ? (
            <TrendingUp className="h-5 w-5 text-red-500" />
          ) : (
            <Minus className="h-5 w-5 text-amber-500" />
          )}
          Progress Overview
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            stats.trend === "improving" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
            stats.trend === "worsening" ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" :
            "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          }`}>
            {stats.trend === "improving" ? "Improving" : stats.trend === "worsening" ? "Worsening" : "Stable"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-around gap-2" style={{ height: barHeight }}>
          {stats.monthlyAvg.map((m) => {
            const barH = (m.avg / maxScore) * barHeight
            return (
              <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: barH }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`w-full max-w-[32px] rounded-t-lg ${
                    m.avg <= 1.5 ? "bg-emerald-400" :
                    m.avg <= 2.5 ? "bg-amber-400" : "bg-red-400"
                  }`}
                  style={{ height: barH }}
                />
                <span className="text-[10px] text-muted-foreground">{m.month}</span>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-4 text-xs text-muted-foreground">
          <span>Mild (1)</span>
          <span>Moderate (2)</span>
          <span>Severe (3)</span>
        </div>

      </CardContent>
    </Card>
  )
}
