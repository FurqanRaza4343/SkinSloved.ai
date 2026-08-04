"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

export default function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const toggle = () => setShow(window.scrollY > 400)
    toggle()
    window.addEventListener("scroll", toggle, { passive: true })
    return () => window.removeEventListener("scroll", toggle)
  }, [])

  if (!show) return null

  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, scale: 0.7, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.7, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={cn(
          "fixed bottom-8 right-8 z-40 h-12 w-12 rounded-full",
          "bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/30",
          "hover:from-sky-600 hover:to-teal-600 hover:shadow-xl hover:scale-110",
          "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
        )}
        aria-label="Back to top"
      >
        <ChevronUp className="absolute inset-0 m-auto h-5 w-5" />
      </motion.button>
    </AnimatePresence>
  )
}
