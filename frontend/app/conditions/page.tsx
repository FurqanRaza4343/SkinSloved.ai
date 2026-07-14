"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Stethoscope, FileText, ExternalLink } from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"

const conditions = [
  { name: "Acne Vulgaris", description: "Common skin condition causing pimples, blackheads, and inflamed lesions.", symptoms: "Whiteheads, blackheads, papules, pustules, cysts", common: "Teenagers and young adults", icon: "🔴" },
  { name: "Rosacea", description: "Chronic facial redness with visible blood vessels and sometimes bumps.", symptoms: "Facial flushing, persistent redness, visible veins, thickened skin", common: "Fair-skinned adults 30-50", icon: "🔴" },
  { name: "Eczema (Atopic Dermatitis)", description: "Inflammatory skin condition causing dry, itchy, and red patches.", symptoms: "Dry skin, intense itching, red patches, cracked skin", common: "Children and adults with allergies", icon: "🟠" },
  { name: "Psoriasis", description: "Autoimmune condition causing rapid skin cell buildup and silvery scales.", symptoms: "Thick red patches with silvery scales, dry cracked skin, itching", common: "Adults 15-35", icon: "🟠" },
  { name: "Contact Dermatitis", description: "Allergic or irritant reaction to substances touching the skin.", symptoms: "Red rash, itching, burning, blisters, dry cracked skin", common: "Can affect anyone", icon: "🟡" },
  { name: "Melasma", description: "Brown or gray-brown patches on the face, often triggered by sun or hormones.", symptoms: "Symmetric brown patches on cheeks, forehead, nose, upper lip", common: "Women, especially during pregnancy", icon: "🟤" },
  { name: "Seborrheic Dermatitis", description: "Scaly, oily patches on the scalp, face, and other oily areas.", symptoms: "Greasy yellowish scales, redness, dandruff, itching", common: "Adults 30-60, infants", icon: "🟡" },
  { name: "Hives (Urticaria)", description: "Raised, itchy welts caused by allergic reactions or stress.", symptoms: "Raised red welts, intense itching, swelling, comes and goes quickly", common: "Can affect anyone", icon: "🔴" },
  { name: "Fungal Infections", description: "Ringworm, athlete's foot, and yeast infections caused by fungi.", symptoms: "Red circular rash, itching, scaling, cracking skin", common: "Warm humid climates", icon: "🟢" },
  { name: "Cold Sores (Herpes)", description: "Small, painful blisters around the lips caused by HSV-1 virus.", symptoms: "Tingling before outbreak, small fluid-filled blisters, crusting", common: "Most adults carry the virus", icon: "🟣" },
]

const categories = [
  { key: "all", label: "All Conditions" },
  { key: "mild", label: "Common" },
  { key: "moderate", label: "Moderate" },
  { key: "chronic", label: "Chronic" },
]

export default function ConditionsPage() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")

  const filtered = conditions.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" /> Knowledge Base
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Skin Condition Library</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">Learn about common skin conditions, their symptoms, and typical management approaches.</p>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search conditions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((condition, i) => (
              <motion.div key={condition.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="border-border/60 h-full hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{condition.name}</CardTitle>
                        <CardDescription className="mt-1">{condition.description}</CardDescription>
                      </div>
                      <span className="text-2xl">{condition.icon}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="font-semibold text-foreground shrink-0">Symptoms:</span>
                        <span className="text-muted-foreground">{condition.symptoms}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-foreground shrink-0">Common in:</span>
                        <span className="text-muted-foreground">{condition.common}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Stethoscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="font-semibold">No conditions found</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>
            </div>
          )}

          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-sky-50 to-teal-50 dark:from-sky-950/20 dark:to-teal-950/20 border border-sky-100 dark:border-sky-900/50">
            <h2 className="text-xl font-bold mb-2">Not sure what you have?</h2>
            <p className="text-muted-foreground mb-4">Describe your symptoms and our AI will help identify possible skin conditions.</p>
            <Link href="/consult/new">
              <Button size="lg" className="medical-gradient text-white shadow-lg">Start Free Consultation</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
