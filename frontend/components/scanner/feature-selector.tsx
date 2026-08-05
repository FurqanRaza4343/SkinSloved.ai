"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export interface Feature {
  id: string
  label: string
  description: string
}

export const SCANNER_FEATURES: Feature[] = [
  { id: "acne", label: "Acne", description: "Inflammation, pimples, blackheads, cysts" },
  { id: "blackheads", label: "Blackheads", description: "Open pores, black dots" },
  { id: "whiteheads", label: "Whiteheads", description: "Closed comedones, white bumps" },
  { id: "pigmentation", label: "Pigmentation", description: "Dark spots, uneven skin tone" },
  { id: "melasma", label: "Melasma", description: "Brown patches, hormonal discoloration" },
  { id: "rosacea", label: "Rosacea", description: "Redness, visible blood vessels, bumps" },
  { id: "psoriasis", label: "Psoriasis", description: "Thick, silvery scales, red patches" },
  { id: "eczema", label: "Eczema", description: "Dry, itchy, inflamed patches" },
  { id: "dry_skin", label: "Dry Skin", description: "Flaky, tight, dehydrated appearance" },
  { id: "oily_skin", label: "Oily Skin", description: "Shiny, greasy, enlarged pores" },
  { id: "wrinkles", label: "Wrinkles", description: "Deep lines, expression lines" },
  { id: "fine_lines", label: "Fine Lines", description: "Fine creases, mild texture changes" },
  { id: "sun_damage", label: "Sun Damage", description: "Uneven tone, spots from UV exposure" },
  { id: "dark_circles", label: "Dark Circles", description: "Dark pigmentation under eyes" },
  { id: "enlarged_pores", label: "Enlarged Pores", description: "Visible open pores on nose/cheeks" },
  { id: "redness", label: "Redness", description: "General redness, irritation, inflammation" },
  { id: "skin_tone", label: "Skin Tone", description: "Overall skin tone, glow, evenness" },
]

interface FeatureSelectorProps {
  selected: string[]
  onChange: (selected: string[]) => void
}

export function FeatureSelector({ selected, onChange }: FeatureSelectorProps) {
  const toggleFeature = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id]
    onChange(newSelected)
  }

  const toggleAll = () => {
    if (selected.length === SCANNER_FEATURES.length) {
      onChange([])
    } else {
      onChange(SCANNER_FEATURES.map((f) => f.id))
    }
  }

  const isAllSelected = selected.length === SCANNER_FEATURES.length
  const isNoneSelected = selected.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Select Concerns to Detect</h3>
        <button
          onClick={toggleAll}
          className={cn(
            "text-sm px-3 py-1 rounded-lg border font-medium transition-colors",
            isAllSelected
              ? "bg-primary text-white border-primary"
              : "bg-background text-foreground border-border hover:bg-accent"
          )}
        >
          {isAllSelected ? "Clear All" : isNoneSelected ? "Select All" : "Select All"}
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        {selected.length === 0
          ? "Koi concern select nahi kiya — poori 17 features ki checkup hogi (or tap Select All)"
          : `${selected.length} of ${SCANNER_FEATURES.length} features selected`}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SCANNER_FEATURES.map((feature, i) => {
          const isSelected = selected.includes(feature.id)
          return (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <button
                type="button"
                onClick={() => toggleFeature(feature.id)}
                className={cn(
                  "relative flex flex-col p-3 rounded-xl border text-left transition-all duration-200",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border/40 bg-background hover:border-border hover:bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{feature.label}</span>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{feature.description}</p>

                {!isSelected && selected.length > 0 && (
                  <div className="absolute inset-0 rounded-xl bg-background/80" style={{ display: "none" }} />
                )}
              </button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
