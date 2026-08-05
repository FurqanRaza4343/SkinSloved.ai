"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface SpeechOptions {
  rate?: number
  pitch?: number
}

function pickFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null

  const femaleUrdu =
    voices.find((v) => (v.lang.toLowerCase().startsWith("ur") || v.lang.toLowerCase().startsWith("hi")) && /female|zira|ravi|heera|lekha/i.test(v.name)) ||
    voices.find((v) => v.lang.toLowerCase().startsWith("ur")) ||
    voices.find((v) => v.lang.toLowerCase().startsWith("hi") && v.lang.toLowerCase() !== "hi-in") ||
    voices.find((v) => v.lang.toLowerCase().startsWith("hi"))

  const femaleEnglish =
    voices.find((v) => /female|zira|susan|aria|jenny|samantha|victoria|karen|moira|tessa|female/i.test(v.name) && v.lang.toLowerCase().startsWith("en")) ||
    voices.find((v) => /female|zira|susan|aria|jenny|samantha|female/i.test(v.name))

  const hindiFallback =
    voices.find((v) => v.name === "Microsoft Zira - English (United States)" || v.name === "Google UK English Female" || v.name === "Samantha") ||
    voices.find((v) => v.lang.toLowerCase().startsWith("en-in"))

  const defaultVoice = voices.find((v) => v.lang.toLowerCase().startsWith("en-us")) || voices[0]

  return femaleUrdu || femaleEnglish || hindiFallback || defaultVoice
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const speakingRef = useRef(false)

  useEffect(() => {
    if (!("speechSynthesis" in window)) return
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices()
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }
    speakingRef.current = false
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    (text: string, opts: SpeechOptions = {}) => {
      if (!("speechSynthesis" in window) || !text) return
      window.speechSynthesis.cancel()
      const voices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices()
      const voice = pickFemaleVoice(voices)

      const chunks = text.match(/[\s\S]{1,180}/g) || [text]
      speakingRef.current = true
      setSpeaking(true)

      chunks.forEach((chunk, i) => {
        const utterance = new SpeechSynthesisUtterance(chunk)
        if (voice) {
          utterance.voice = voice
          utterance.lang = voice.lang
        } else {
          utterance.lang = "en-US"
        }
        utterance.rate = opts.rate ?? 0.9
        utterance.pitch = opts.pitch ?? 1.15
        utterance.onend = () => {
          if (i === chunks.length - 1) {
            speakingRef.current = false
            setSpeaking(false)
          }
        }
        utterance.onerror = () => {
          if (i === chunks.length - 1) {
            speakingRef.current = false
            setSpeaking(false)
          }
        }
        window.speechSynthesis.speak(utterance)
      })
    },
    []
  )

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return { speak, stop, speaking }
}