"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, Bot, User, Sparkles } from "lucide-react"

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface FollowUpQuestionsProps {
  patientText: string
  onComplete: (answers: { q: string; a: string }[]) => void
  onBack: () => void
}

export function FollowUpQuestions({ patientText, onComplete, onBack }: FollowUpQuestionsProps) {
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${BACKEND}/api/consultations/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: patientText }),
      })
      if (!response.ok) throw new Error("Failed to generate questions")
      const data = await response.json()
      setQuestions(data.questions || [])
      setAnswers(new Array(data.questions?.length || 0).fill(""))
    } catch (err) {
      setQuestions(["How long have you had this skin concern?", "Does it itch or burn?", "What products do you currently use?"])
      setAnswers(new Array(3).fill(""))
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    const newAnswers = [...answers]
    newAnswers[currentIndex] = currentAnswer
    setAnswers(newAnswers)
    setCurrentAnswer("")

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleSubmit = () => {
    const finalAnswers = [...answers]
    finalAnswers[currentIndex] = currentAnswer
    setAnswers(finalAnswers)

    const pairs = questions.map((q, i) => ({
      q,
      a: finalAnswers[i] || "No answer provided",
    }))
    onComplete(pairs)
  }

  if (loading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-8 text-center">
          <Sparkles className="h-10 w-10 mx-auto mb-4 text-primary animate-pulse" />
          <p className="font-semibold">AI is preparing questions...</p>
          <p className="text-sm text-muted-foreground mt-1">Analyzing your description to ask relevant follow-ups.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          AI Follow-up Questions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
            <Bot className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              I have a few quick questions to understand your skin concern better.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50">
            <p className="text-xs text-muted-foreground mb-2">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <p className="text-sm font-semibold">{questions[currentIndex]}</p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <Input
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (currentIndex < questions.length - 1) handleNext()
                    else handleSubmit()
                  }
                }}
                autoFocus
              />
              <Button
                size="icon"
                className="shrink-0"
                disabled={!currentAnswer.trim()}
                onClick={currentIndex < questions.length - 1 ? handleNext : handleSubmit}
              >
                {currentIndex < questions.length - 1 ? (
                  <Send className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-6 rounded-full transition-colors ${
                    i === currentIndex ? "bg-primary" :
                    answers[i] ? "bg-primary/50" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
