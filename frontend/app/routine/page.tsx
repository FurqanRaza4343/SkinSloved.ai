"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Sun, Moon, Calendar, Sparkles, AlertTriangle, CheckCircle2, Loader2, Save, RefreshCw, Droplets } from "lucide-react"
import { BACKEND_URL } from "@/lib/config"
import { useAuth } from "@/lib/auth-context"
import type { SkinRoutine, RoutineStep } from "@/lib/types"
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/types"
import Link from "next/link"

const STEP_CATEGORY_COLORS: Record<string, string> = {
  cleanser: "border-sky-500 bg-sky-50 dark:bg-sky-950/30",
  toner: "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30",
  serum: "border-violet-500 bg-violet-50 dark:bg-violet-950/30",
  moisturizer: "border-teal-500 bg-teal-50 dark:bg-teal-950/30",
  sunscreen: "border-amber-500 bg-amber-50 dark:bg-amber-950/30",
  treatment: "border-rose-500 bg-rose-50 dark:bg-rose-950/30",
  mask: "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30",
}

function StepCard({ step, index }: { step: RoutineStep; index: number }) {
  const colorClass = STEP_CATEGORY_COLORS[step.category] || "border-gray-500 bg-gray-50 dark:bg-gray-950/30"
  const icon = CATEGORY_ICONS[step.category] || "🧴"

  return (
    <div className={`relative rounded-xl border-l-4 p-4 ${colorClass} transition-all hover:scale-[1.01]`}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-lg shadow-sm">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">Step {step.step}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{step.category}</Badge>
            <span className="text-[10px] text-muted-foreground ml-auto">{step.duration}</span>
          </div>
          <p className="font-medium text-sm">{step.product}</p>
          <p className="text-xs text-muted-foreground mt-1">{step.instruction}</p>
          {step.tips && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> {step.tips}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RoutinePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [patientText, setPatientText] = useState("")
  const [skinType, setSkinType] = useState("")
  const [routine, setRoutine] = useState<SkinRoutine | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"morning" | "evening" | "weekly">("morning")

  useEffect(() => {
    const text = searchParams.get("text")
    const condition = searchParams.get("condition")
    if (text) setPatientText(text)
    if (condition) setSkinType(condition)
  }, [searchParams])

  const generateRoutine = async () => {
    if (!patientText.trim()) return
    setLoading(true)
    setError("")
    setRoutine(null)
    setSaved(false)

    try {
      const res = await fetch(`${BACKEND_URL}/api/routine/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(user?.id ? { "X-User-Id": user.id } : {}) },
        body: JSON.stringify({ patient_text: patientText, skin_type: skinType, severity: "mild" }),
      })
      if (!res.ok) throw new Error("Failed to generate routine")
      const data = await res.json()
      setRoutine(data.routine)
    } catch (e: any) {
      setError(e.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const saveRoutine = async () => {
    if (!routine) return
    setSaving(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/routine/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(user?.id ? { "X-User-Id": user.id } : {}) },
        body: JSON.stringify({ routine, label: patientText.slice(0, 100) || "My Skin Routine" }),
      })
      if (res.ok) setSaved(true)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">My Skin Routine</h1>
            <p className="text-sm text-muted-foreground">Get a personalized AM/PM skin care routine powered by AI</p>
          </div>
        </div>

        {!routine && !loading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Droplets className="h-5 w-5" /> Tell us about your skin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Describe your skin concerns</label>
                <textarea
                  placeholder="e.g., I have oily skin with occasional breakouts on my forehead and chin. My skin gets dry in winter..."
                  value={patientText}
                  onChange={(e) => setPatientText(e.target.value)}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Skin type (optional)</label>
                <Input
                  placeholder="e.g., Oily, Dry, Combination, Sensitive, Normal"
                  value={skinType}
                  onChange={(e) => setSkinType(e.target.value)}
                />
              </div>
              <Button onClick={generateRoutine} disabled={!patientText.trim() || loading} className="w-full">
                <Sparkles className="h-4 w-4 mr-2" /> Generate My Routine
              </Button>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Creating your personalized routine...</p>
              <p className="text-sm text-muted-foreground mt-1">AI is analyzing your skin concerns</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={generateRoutine} className="ml-auto">Retry</Button>
            </CardContent>
          </Card>
        )}

        {routine && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-sky-50 to-teal-50 dark:from-sky-950/30 dark:to-teal-950/30 border-sky-200 dark:border-sky-800">
              <CardContent className="py-4">
                <p className="text-sm font-medium text-sky-700 dark:text-sky-300">{routine.skin_type_analysis}</p>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              {(["morning", "evening", "weekly"] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className="flex-1"
                >
                  {tab === "morning" && <Sun className="h-4 w-4 mr-1" />}
                  {tab === "evening" && <Moon className="h-4 w-4 mr-1" />}
                  {tab === "weekly" && <Calendar className="h-4 w-4 mr-1" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Button>
              ))}
            </div>

            {activeTab === "morning" && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2"><Sun className="h-5 w-5 text-amber-500" /> Morning Routine</h3>
                {routine.morning.map((step, i) => <StepCard key={i} step={step} index={i} />)}
              </div>
            )}

            {activeTab === "evening" && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2"><Moon className="h-5 w-5 text-indigo-500" /> Evening Routine</h3>
                {routine.evening.map((step, i) => <StepCard key={i} step={step} index={i} />)}
              </div>
            )}

            {activeTab === "weekly" && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-5 w-5 text-teal-500" /> Weekly Tasks</h3>
                {routine.weekly.map((task, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border p-3 bg-background">
                    <Badge variant="secondary" className="shrink-0">{task.day}</Badge>
                    <p className="text-sm flex-1">{task.task}</p>
                    <span className="text-xs text-muted-foreground">{task.duration}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-500" /> Key Notes</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {routine.important_notes.map((note, i) => (
                      <li key={i} className="text-xs text-muted-foreground">• {note}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-amber-500" /> Avoid</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {routine.ingredients_to_avoid.map((ing, i) => (
                      <Badge key={i} variant="destructive" className="text-[10px]">{ing}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Sparkles className="h-4 w-4 text-violet-500" /> Recommended</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {routine.recommended_ingredients.map((ing, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{ing}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={generateRoutine} className="flex-1"><RefreshCw className="h-4 w-4 mr-2" /> Regenerate</Button>
              <Button onClick={saveRoutine} disabled={saving || saved} className="flex-1">
                {saved ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Saved</> : saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Routine</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
