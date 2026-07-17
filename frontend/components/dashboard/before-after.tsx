"use client"

import { useState, useRef, useCallback } from "react"
import { motion } from "framer-motion"

interface BeforeAfterProps {
  before: { imageUrl: string; date: string; label?: string }
  after: { imageUrl: string; date: string; label?: string }
}

export function BeforeAfterSlider({ before, after }: BeforeAfterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sliderPos, setSliderPos] = useState(50)
  const [dragging, setDragging] = useState(false)

  const handleMove = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setSliderPos((x / rect.width) * 100)
  }, [])

  const onMouseDown = () => setDragging(true)
  const onMouseUp = () => setDragging(false)
  const onMouseMove = (e: React.MouseEvent) => { if (dragging) handleMove(e.clientX) }
  const onTouchMove = (e: React.TouchEvent) => { handleMove(e.touches[0].clientX) }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span className="font-medium">{before.label || "Before"}</span>
          <span className="text-muted-foreground">{before.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{after.date}</span>
          <span className="font-medium">{after.label || "After"}</span>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full h-72 sm:h-96 rounded-xl overflow-hidden bg-muted select-none cursor-ew-resize"
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseUp}
      >
        {/* After image (full) */}
        <img
          src={after.imageUrl}
          alt="After"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Before image (clipped) */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
          <img
            src={before.imageUrl}
            alt="Before"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
            style={{ width: `${100 / (sliderPos / 100)}%`, maxWidth: "none" }}
          />
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
          style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow-xl flex items-center justify-center border-2 border-sky-500">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round">
              <path d="M6 3L3 8L6 13" />
              <path d="M10 3L13 8L10 13" />
            </svg>
          </div>
        </div>

        {/* Labels on image */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/50 text-white text-xs font-medium backdrop-blur-sm">
          {before.label || "Before"} — {before.date}
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/50 text-white text-xs font-medium backdrop-blur-sm">
          {after.label || "After"} — {after.date}
        </div>
      </div>
    </div>
  )
}

export function SkinTimeline({ entries }: { entries: { id: string; imageUrl: string; date: string; snippet: string }[] }) {
  if (!entries || entries.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Skin Timeline</h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-sky-500 to-teal-500 rounded-full" />
        <div className="space-y-6">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative pl-10"
            >
              <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 ring-4 ring-background" />
              <div className="p-3 rounded-xl border border-border/60 bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted/50">
                    {entry.imageUrl ? (
                      <img src={entry.imageUrl} alt="Skin" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">No photo</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{entry.date}</p>
                    <p className="text-sm mt-0.5 line-clamp-2">{entry.snippet}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
