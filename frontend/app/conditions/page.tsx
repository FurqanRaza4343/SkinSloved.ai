"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search, Stethoscope, FileText, Sparkles, AlertTriangle,
  Microscope, Droplets, Thermometer, Shield, Eye, Activity, Brain,
  ArrowRight
} from "lucide-react"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"

interface Condition {
  name: string
  description: string
  symptoms: string[]
  common_in: string
  category: "Inflammatory" | "Infectious" | "Autoimmune" | "Pigmentary" | "Growth" | "Reaction" | "Vascular" | "Genetic"
  severity: "mild" | "moderate" | "severe"
  treatment_summary: string
  icon: string
}

const conditions: Condition[] = [
  { name: "Acne Vulgaris", description: "Common skin condition causing pimples, blackheads, and inflamed lesions due to clogged hair follicles.", symptoms: ["Whiteheads", "Blackheads", "Papules", "Pustules", "Cysts", "Oily skin"], common_in: "Teenagers, young adults, hormonal fluctuations", category: "Inflammatory", severity: "moderate", treatment_summary: "Benzoyl peroxide, salicylic acid, retinoids, antibiotics for severe cases", icon: "🔴" },
  { name: "Rosacea", description: "Chronic facial redness with visible blood vessels, flushing, and sometimes acne-like bumps.", symptoms: ["Facial flushing", "Persistent redness", "Visible blood vessels", "Bumps & pimples", "Eye irritation"], common_in: "Fair-skinned adults 30-50, family history", category: "Vascular", severity: "moderate", treatment_summary: "Topical metronidazole, azelaic acid, laser therapy, sun protection", icon: "🔴" },
  { name: "Atopic Dermatitis (Eczema)", description: "Chronic inflammatory skin condition causing dry, itchy, and red patches, often with an allergic basis.", symptoms: ["Intense itching", "Dry scaly patches", "Red inflamed skin", "Cracked skin", "Oozing when scratched"], common_in: "Children, family history of allergies or asthma", category: "Inflammatory", severity: "moderate", treatment_summary: "Moisturizers, topical corticosteroids, calcineurin inhibitors, avoiding triggers", icon: "🟠" },
  { name: "Psoriasis", description: "Autoimmune condition causing rapid skin cell buildup with thick, silvery-scaled plaques.", symptoms: ["Thick red patches", "Silvery scales", "Dry cracked skin", "Itching & burning", "Joint pain (psoriatic arthritis)"], common_in: "Adults 15-35, family history, triggered by stress or infection", category: "Autoimmune", severity: "moderate", treatment_summary: "Topical steroids, vitamin D analogs, phototherapy, biologics for severe cases", icon: "🟠" },
  { name: "Contact Dermatitis", description: "Allergic or irritant reaction to substances touching the skin, like poison ivy, nickel, or fragrances.", symptoms: ["Red rash", "Itching & burning", "Blisters", "Dry cracked skin", "Swelling at contact site"], common_in: "Can affect anyone, common with jewelry, cosmetics, plants", category: "Reaction", severity: "mild", treatment_summary: "Avoid allergen, topical corticosteroids, cold compresses, antihistamines", icon: "🟡" },
  { name: "Melasma", description: "Brown or gray-brown patches on the face, triggered by sun exposure and hormonal changes.", symptoms: ["Symmetric brown patches", "Cheeks & forehead", "Upper lip & nose", "Worsens with sun"], common_in: "Women especially during pregnancy, hormonal therapy, darker skin types", category: "Pigmentary", severity: "mild", treatment_summary: "Sun protection, hydroquinone, azelaic acid, chemical peels, laser", icon: "🟤" },
  { name: "Seborrheic Dermatitis", description: "Scaly, oily patches on the scalp, face, and other sebum-rich areas, causing stubborn dandruff.", symptoms: ["Greasy yellowish scales", "Redness on scalp", "Flaking & dandruff", "Itching", "Affects eyebrows & nose folds"], common_in: "Adults 30-60, infants (cradle cap), Parkinson's disease, HIV", category: "Inflammatory", severity: "mild", treatment_summary: "Antifungal shampoos, topical corticosteroids, calcineurin inhibitors", icon: "🟡" },
  { name: "Urticaria (Hives)", description: "Raised, itchy welts caused by histamine release from allergic reactions, stress, or physical triggers.", symptoms: ["Raised red welts", "Intense itching", "Swelling (angioedema)", "Comes & goes quickly", "Can affect any body part"], common_in: "Can affect anyone, common with foods, medications, stress, heat", category: "Reaction", severity: "mild", treatment_summary: "Antihistamines, avoid triggers, corticosteroids for severe episodes, epinephrine for anaphylaxis", icon: "🔴" },
  { name: "Tinea (Ringworm, Athlete's Foot)", description: "Fungal skin infection causing ring-shaped, scaly patches on skin, feet, or nails.", symptoms: ["Circular red rash", "Scaling & peeling", "Itching", "Clear center healing", "Spread to nails"], common_in: "Warm humid climates, athletes, communal showers, pets", category: "Infectious", severity: "mild", treatment_summary: "Topical antifungals (clotrimazole, terbinafine), oral antifungals for resistant cases", icon: "🟢" },
  { name: "Herpes Simplex (Cold Sores)", description: "Viral infection causing small, painful blisters around the lips or genitals, with recurrent outbreaks.", symptoms: ["Tingling before outbreak", "Small fluid-filled blisters", "Crusting & healing", "Pain & burning", "Recurrence with stress"], common_in: "Most adults carry HSV-1, transmitted through close contact", category: "Infectious", severity: "moderate", treatment_summary: "Antiviral creams (acyclovir), oral antivirals for outbreaks, suppressive therapy if frequent", icon: "🟣" },
  { name: "Actinic Keratosis", description: "Rough, scaly precancerous patches on sun-damaged skin that can progress to squamous cell carcinoma.", symptoms: ["Rough scaly patches", "Red, brown, or flesh-colored", "Flat or raised", "Soreness or tenderness", "Common on face, hands, arms"], common_in: "Fair-skinned adults over 40, chronic sun exposure", category: "Growth", severity: "severe", treatment_summary: "Cryotherapy, topical chemotherapy (5-FU), photodynamic therapy, regular monitoring", icon: "⚠️" },
  { name: "Basal Cell Carcinoma", description: "Most common skin cancer, growing slowly on sun-exposed areas, rarely spreads but needs removal.", symptoms: ["Pearl-like bump", "Flesh-colored or pink", "Visible blood vessels", "Open sore that won't heal", "Shiny scar-like area"], common_in: "Fair-skinned adults over 50, chronic sun exposure", category: "Growth", severity: "severe", treatment_summary: "Surgical excision, Mohs surgery, cryotherapy, topical imiquimod, radiation", icon: "⚠️" },
  { name: "Squamous Cell Carcinoma", description: "Second most common skin cancer, arising from sun damage, can spread if untreated.", symptoms: ["Firm red nodule", "Scaly crusted surface", "Non-healing sore", "Elevated border", "Rapid growth"], common_in: "Fair-skinned adults over 50, chronic sun exposure, immunosuppression", category: "Growth", severity: "severe", treatment_summary: "Surgical excision, Mohs surgery, radiation, chemotherapy for advanced cases", icon: "⚠️" },
  { name: "Malignant Melanoma", description: "Most dangerous skin cancer, arising from melanocytes, requires urgent treatment.", symptoms: ["Asymmetrical mole", "Irregular borders", "Color variation", "Diameter >6mm", "Evolving shape/size/color"], common_in: "Fair skin, severe sunburns history, many moles, family history", category: "Growth", severity: "severe", treatment_summary: "Surgical excision, sentinel lymph node biopsy, immunotherapy, targeted therapy, chemotherapy", icon: "🚨" },
  { name: "Vitiligo", description: "Autoimmune condition causing white patches due to loss of pigment-producing cells (melanocytes).", symptoms: ["White depigmented patches", "Symmetric distribution", "Around mouth & eyes", "Hands & genitals", "Premature graying of hair"], common_in: "Affects all skin types, often before age 20, family history", category: "Autoimmune", severity: "mild", treatment_summary: "Topical corticosteroids, calcineurin inhibitors, phototherapy (narrowband UVB), skin grafting", icon: "⚪" },
  { name: "Alopecia Areata", description: "Autoimmune condition causing patchy hair loss on the scalp and body.", symptoms: ["Round bald patches", "Smooth scalp", "Nail pitting", "Can progress to total hair loss"], common_in: "All ages, family history of autoimmune conditions", category: "Autoimmune", severity: "moderate", treatment_summary: "Topical minoxidil, corticosteroids, diphencyprone immunotherapy, JAK inhibitors", icon: "👨‍🦲" },
  { name: "Keratosis Pilaris", description: "Harmless condition causing small, rough bumps on skin, often on arms and thighs.", symptoms: ["Small rough bumps", "Flesh-colored or red", "Upper arms & thighs", "Worse in dry weather", "Goose-flesh appearance"], common_in: "Children and adolescents, often with eczema or dry skin", category: "Genetic", severity: "mild", treatment_summary: "Moisturizers with urea or lactic acid, gentle exfoliation, topical retinoids", icon: "🔵" },
  { name: "Impetigo", description: "Contagious bacterial skin infection common in children, causing honey-colored crusted sores.", symptoms: ["Red sores around nose & mouth", "Honey-colored crusts", "Oozing blisters", "Itching", "Spreads easily"], common_in: "Children 2-5, poor hygiene, warm climates, school settings", category: "Infectious", severity: "mild", treatment_summary: "Topical antibiotics (mupirocin), oral antibiotics for widespread infection, good hygiene", icon: "🟡" },
  { name: "Cellulitis", description: "Deep bacterial skin infection requiring prompt medical treatment to prevent spread.", symptoms: ["Red swollen skin", "Warm to touch", "Pain & tenderness", "Fever & chills", "Spreading redness"], common_in: "Adults, broken skin, diabetes, immunocompromised, obesity", category: "Infectious", severity: "severe", treatment_summary: "Oral or IV antibiotics (cephalexin, clindamycin), elevation, pain management", icon: "🚨" },
  { name: "Shingles (Herpes Zoster)", description: "Painful blistering rash from reactivation of chickenpox virus, often following nerve pathways.", symptoms: ["Burning pain before rash", "Blistering along nerve", "Red rash in band/line", "Severe nerve pain", "Fever & fatigue"], common_in: "Adults over 50, immunocompromised, previous chickenpox infection", category: "Infectious", severity: "severe", treatment_summary: "Antivirals (acyclovir, valacyclovir), pain management, vaccines for prevention", icon: "🔴" },
  { name: "Molluscum Contagiosum", description: "Viral skin infection causing small, flesh-colored dome-shaped bumps with a central dimple.", symptoms: ["Small dome-shaped bumps", "Central indentation", "Flesh-colored or pearl-like", "Can spread to other areas", "Often asymptomatic"], common_in: "Children 1-10, sexually active adults, immunocompromised", category: "Infectious", severity: "mild", treatment_summary: "Often self-resolves, cryotherapy, curettage, topical cantharidin, imiquimod", icon: "⚪" },
  { name: "Lichen Planus", description: "Inflammatory skin condition causing itchy, flat-topped, purple bumps on skin and mucous membranes.", symptoms: ["Purple flat bumps", "Intense itching", "White lacy patches in mouth", "Nail ridges & grooves", "Scalp hair loss"], common_in: "Adults 30-60, associated with hepatitis C, stress triggers", category: "Inflammatory", severity: "moderate", treatment_summary: "Topical corticosteroids, antihistamines, phototherapy, oral retinoids", icon: "🟣" },
  { name: "Granuloma Annulare", description: "Benign inflammatory skin condition causing ring-shaped bumps, often on hands and feet.", symptoms: ["Ring-shaped bumps", "Flesh-colored or red", "Hands & feet", "Usually asymptomatic", "Can be widespread"], common_in: "Children and young adults, more common in women", category: "Inflammatory", severity: "mild", treatment_summary: "Often self-resolves, topical corticosteroids, intralesional steroids, cryotherapy", icon: "⭕" },
  { name: "Pityriasis Rosea", description: "Self-limiting rash with a distinctive 'herald patch' followed by smaller patches on the trunk.", symptoms: ["Large herald patch first", "Smaller patches on trunk", "Christmas-tree pattern on back", "Mild itching", "Resolves in 6-8 weeks"], common_in: "Young adults 10-35, more common in spring/fall, possibly viral cause", category: "Infectious", severity: "mild", treatment_summary: "Usually self-resolving, antihistamines for itch, topical corticosteroids, sun exposure", icon: "🎄" },
  { name: "Dyshidrotic Eczema", description: "Type of eczema causing small, itchy blisters on palms, fingers, and soles of feet.", symptoms: ["Small deep blisters", "Palms & fingers", "Intense itching", "Peeling & cracking", "Recurrent episodes"], common_in: "Adults 20-40, stress triggers, warm weather, nickel sensitivity", category: "Inflammatory", severity: "moderate", treatment_summary: "Topical corticosteroids, soaking & drying, avoiding triggers, botulinum toxin for severe cases", icon: "💧" },
  { name: "Hidradenitis Suppurativa", description: "Chronic inflammatory condition causing painful lumps under the skin in armpits, groin, and breasts.", symptoms: ["Painful deep lumps", "Armpits & groin", "Blackheads & scarring", "Draining tunnels (sinus tracts)", "Recurring flares"], common_in: "Young adults, smokers, obesity, family history, more common in women", category: "Inflammatory", severity: "severe", treatment_summary: "Antibiotics, anti-inflammatories, biologics (adalimumab), laser hair removal, surgery", icon: "🔴" },
  { name: "Erythema Nodosum", description: "Inflammatory condition causing painful red nodules on the shins, often due to underlying disease.", symptoms: ["Red tender nodules", "Shins & lower legs", "Pain & swelling", "Fever & joint pain", "Resolves with bruising"], common_in: "Young women, associated with infections, sarcoidosis, IBD, medications", category: "Inflammatory", severity: "moderate", treatment_summary: "Treat underlying cause, NSAIDs, rest & elevation, potassium iodide, corticosteroids", icon: "🔴" },
  { name: "Xerosis (Dry Skin)", description: "Extremely dry skin caused by environmental factors, aging, or underlying conditions.", symptoms: ["Dry scaly skin", "Tightness after washing", "Fine lines & cracking", "Itching", "Rough texture"], common_in: "Elderly, dry climates, frequent bathing, diabetes, thyroid conditions", category: "Inflammatory", severity: "mild", treatment_summary: "Regular moisturizing, gentle cleansers, humidifiers, avoid hot showers", icon: "🏜️" },
  { name: "Sunburn", description: "Acute skin damage from UV radiation causing redness, pain, and peeling.", symptoms: ["Red painful skin", "Warm to touch", "Swelling", "Blisters in severe cases", "Peeling after days"], common_in: "Anyone with sun exposure, fair skin more susceptible", category: "Reaction", severity: "mild", treatment_summary: "Cool compresses, aloe vera, moisturizers, NSAIDs for pain, hydration, avoid further sun", icon: "☀️" },
  { name: "Stretch Marks (Striae)", description: "Linear scars from rapid skin stretching during growth, pregnancy, or weight changes.", symptoms: ["Linear streaks on skin", "Initially red or purple", "Fade to white over time", "Abdomen, thighs, breasts", "Painless"], common_in: "Pregnancy, puberty, rapid weight gain, corticosteroid use", category: "Genetic", severity: "mild", treatment_summary: "Topical retinoids, laser therapy, microneedling, hyaluronic acid, time (fade naturally)", icon: "〰️" },
  { name: "Hyperhidrosis", description: "Excessive sweating beyond normal thermoregulation, affecting quality of life.", symptoms: ["Excessive sweating", "Palms, armpits, face", "Interferes with daily life", "Skin maceration", "Can cause infections"], common_in: "Young adults, family history, anxiety, menopause, thyroid conditions", category: "Genetic", severity: "mild", treatment_summary: "Antiperspirants, iontophoresis, botulinum toxin injections, oral anticholinergics, surgery", icon: "💦" },
  { name: "Hives (Urticaria)", description: "Raised itchy welts from allergic reactions, stress, pressure, cold, or heat.", symptoms: ["Raised red welts", "Intense itching", "Swelling (angioedema)", "Appears and disappears", "Can be chronic"], common_in: "All ages, food allergies, medications, stress, physical triggers", category: "Reaction", severity: "mild", treatment_summary: "Oral antihistamines, avoid triggers, corticosteroids for severe cases, epinephrine for anaphylaxis", icon: "🔴" },
  { name: "Folliculitis", description: "Inflammation of hair follicles caused by bacterial, fungal infection or irritation.", symptoms: ["Small red bumps", "Pus-filled blisters", "Itching & burning", "Around hair follicles", "Can spread if untreated"], common_in: "Hot tubs, shaving, tight clothing, diabetes, immunocompromised", category: "Infectious", severity: "mild", treatment_summary: "Topical antibiotics (clindamycin), antifungal washes, warm compresses, avoid irritation", icon: "🔴" },
  { name: "Sebaceous Cyst", description: "Benign, slow-growing lump under the skin filled with keratin, often on face, neck, or trunk.", symptoms: ["Round movable lump", "Flesh-colored", "Central punctum (dark dot)", "Slow-growing", "Can become inflamed"], common_in: "Adults, acne-prone skin, genetic predisposition", category: "Growth", severity: "mild", treatment_summary: "Often left alone, surgical excision for cosmetic reasons or infection, incision & drainage if inflamed", icon: "⚪" },
  { name: "Dermatofibroma", description: "Benign skin growth of fibrous tissue, often on legs, firm to touch and dimples when squeezed.", symptoms: ["Firm raised nodule", "Brownish or pink", "Dimples when pinched", "Itching or tenderness", "Slow-growing"], common_in: "Adults, more common in women, often after minor injury or insect bite", category: "Growth", severity: "mild", treatment_summary: "Benign, can be left alone, surgical excision if symptomatic or for diagnosis", icon: "🟤" },
  { name: "Skin Tag (Acrochordon)", description: "Small, soft, flesh-colored growths on a stalk, common in skin folds.", symptoms: ["Small soft growth", "Flesh-colored", "On a stalk (pedunculated)", "Neck, armpits, groin", "Painless"], common_in: "Adults over 40, obesity, diabetes, pregnancy, family history", category: "Growth", severity: "mild", treatment_summary: "Benign, can be removed by snip excision, cryotherapy, or cautery if desired", icon: "🔵" },
  { name: "Chickenpox (Varicella)", description: "Highly contagious viral infection causing itchy blisters all over the body, usually in childhood.", symptoms: ["Fever & fatigue first", "Red spots become blisters", "Intense itching", "Blisters crust over", "Can leave scars"], common_in: "Children, unvaccinated individuals, spreads through respiratory droplets", category: "Infectious", severity: "moderate", treatment_summary: "Antivirals (acyclovir), calamine lotion, antihistamines, acetaminophen for fever, vaccination prevents", icon: "🔴" },
  { name: "Warts (Verruca Vulgaris)", description: "Benign skin growths caused by HPV virus, common on hands, feet, and face.", symptoms: ["Rough raised bumps", "Flesh-colored or gray", "Black dots (clotted vessels)", "Cauliflower-like surface", "Can spread to other areas"], common_in: "Children, young adults, immunocompromised, nail biters", category: "Infectious", severity: "mild", treatment_summary: "Salicylic acid, cryotherapy, cantharidin, laser, immunotherapy, often self-resolve", icon: "🟤" },
  { name: "Candidiasis (Yeast Infection)", description: "Fungal infection in moist skin folds causing red, itchy rashes with satellite pustules.", symptoms: ["Red moist rash", "Intense itching", "Satellite pustules", "Skin folds affected", "White discharge in vaginal"], common_in: "Infants (diaper rash), diabetics, antibiotic use, immunocompromised, obesity", category: "Infectious", severity: "mild", treatment_summary: "Topical antifungals (clotrimazole, nystatin), oral fluconazole, keep skin dry, manage diabetes", icon: "🟠" },
  { name: "Lupus Erythematosus", description: "Autoimmune disease with skin involvement causing butterfly rash, photosensitivity, and systemic symptoms.", symptoms: ["Butterfly rash on face", "Photosensitivity", "Scaly red patches", "Joint pain & swelling", "Fatigue & fever"], common_in: "Women 15-45, African American & Hispanic, family history, triggered by sun", category: "Autoimmune", severity: "severe", treatment_summary: "Sun protection, antimalarials (hydroxychloroquine), corticosteroids, immunosuppressants, biologics", icon: "🦋" },
  { name: "Scleroderma", description: "Autoimmune condition causing hardening and tightening of the skin and connective tissues.", symptoms: ["Hardening of skin", "Tight shiny skin", "Raynaud's phenomenon", "Joint pain", "Difficulty swallowing"], common_in: "Women 30-50, family history, more common in certain ethnic groups", category: "Autoimmune", severity: "severe", treatment_summary: "Immunosuppressants, physical therapy, blood pressure medications, manage organ involvement", icon: "🔵" },
  { name: "Keloid", description: "Excessive scar tissue growth beyond the original wound boundary, often genetic.", symptoms: ["Raised thick scar", "Extends beyond injury", "Shiny smooth surface", "Itching & tenderness", "Can be disfiguring"], common_in: "Darker skin types, family history, young adults, chest & shoulders common", category: "Growth", severity: "mild", treatment_summary: "Corticosteroid injections, cryotherapy, silicone sheets, laser therapy, surgical revision (high recurrence)", icon: "〰️" },
  { name: "Intertrigo", description: "Inflammatory rash in skin folds caused by friction, moisture, and secondary infection.", symptoms: ["Red raw rash", "Skin folds affected", "Burning & itching", "Odor if infected", "Maceration of skin"], common_in: "Infants, obese individuals, diabetics, hot humid climates, bedridden patients", category: "Inflammatory", severity: "mild", treatment_summary: "Keep skin folds dry, barrier creams, antifungal powders, topical steroids for inflammation", icon: "🔴" },
  { name: "Miliaria (Heat Rash)", description: "Blocked sweat ducts causing tiny red bumps or blisters in hot, humid conditions.", symptoms: ["Tiny red bumps", "Prickling sensation", "No sweating in affected area", "Neck, chest, groin", "Worse with heat & humidity"], common_in: "Infants, athletes, tropical climates, bedridden patients, heavy clothing", category: "Reaction", severity: "mild", treatment_summary: "Cool environment, loose clothing, calamine lotion, cool compresses, anhydrous lanolin", icon: "🌡️" },
  { name: "Poison Ivy/Oak/Sumac Dermatitis", description: "Allergic contact dermatitis from urushiol oil in these plants, causing severe blistering rash.", symptoms: ["Linear red blisters", "Intense itching", "Swelling", "Streaks where plant touched", "Can spread if oil not washed"], common_in: "Outdoor workers, hikers, campers, gardeners", category: "Reaction", severity: "moderate", treatment_summary: "Immediate washing with soap, topical/oral corticosteroids, antihistamines, cool compresses", icon: "🌿" },
  { name: "Nail Fungus (Onychomycosis)", description: "Fungal infection of the nail causing thickening, discoloration, and crumbling.", symptoms: ["Thickened nail", "Yellow or white discoloration", "Brittle crumbling nail", "Debris under nail", "Foul odor"], common_in: "Adults, athletes, diabetics, immunocompromised, communal showers", category: "Infectious", severity: "mild", treatment_summary: "Oral terbinafine, topical antifungal lacquer, laser therapy, nail debridement, prolonged treatment needed", icon: "💅" },
]

const categories = [
  { key: "all", label: "All", icon: Search },
  { key: "Inflammatory", label: "Inflammatory", icon: Activity },
  { key: "Infectious", label: "Infectious", icon: Microscope },
  { key: "Autoimmune", label: "Autoimmune", icon: Shield },
  { key: "Pigmentary", label: "Pigmentary", icon: Droplets },
  { key: "Growth", label: "Growths", icon: AlertTriangle },
  { key: "Reaction", label: "Reactions", icon: Thermometer },
  { key: "Vascular", label: "Vascular", icon: Eye },
  { key: "Genetic", label: "Genetic", icon: Brain },
]

function makeSlug(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[()'"\/,]/g, "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

const severityColors: Record<string, string> = {
  mild: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  moderate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  severe: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

export default function ConditionsPage() {
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [symptomMode, setSymptomMode] = useState(false)

  const allSymptoms = useMemo(() => {
    const set = new Set<string>()
    conditions.forEach(c => c.symptoms.forEach(s => set.add(s)))
    return Array.from(set).sort()
  }, [])

  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])

  const filtered = useMemo(() => {
    let result = conditions

    if (activeCategory !== "all") {
      result = result.filter(c => c.category === activeCategory)
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.symptoms.some(s => s.toLowerCase().includes(q))
      )
    }

    if (symptomMode && selectedSymptoms.length > 0) {
      result = result
        .map(c => ({
          ...c,
          _matchScore: c.symptoms.filter(s =>
            selectedSymptoms.some(ss => s.toLowerCase().includes(ss.toLowerCase()))
          ).length
        }))
        .filter(c => c._matchScore > 0)
        .sort((a, b) => (b as any)._matchScore - (a as any)._matchScore)
    }

    return result
  }, [activeCategory, search, symptomMode, selectedSymptoms])

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom)
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    )
  }

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
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Explore {conditions.length} skin conditions. Search by name, symptom, or category — or select your symptoms to find matching conditions.
            </p>
          </motion.div>

          {/* Search + Symptom Checker Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conditions, symptoms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={symptomMode ? "default" : "outline"}
              onClick={() => setSymptomMode(!symptomMode)}
              className="gap-2 shrink-0"
            >
              <Activity className="h-4 w-4" />
              {symptomMode ? "Exit Symptom Checker" : "Symptom Checker"}
            </Button>
          </div>

          {/* Symptom Checker Panel */}
          <AnimatePresence>
            {symptomMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <Card className="border-sky-200 dark:border-sky-800">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Symptom Checker
                    </CardTitle>
                    <CardDescription>
                      Select your symptoms below to find matching skin conditions. {selectedSymptoms.length > 0 && `${filtered.length} condition(s) matching.`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4 max-h-48 overflow-y-auto">
                      {allSymptoms.map(symptom => (
                        <button
                          key={symptom}
                          onClick={() => toggleSymptom(symptom)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            selectedSymptoms.includes(symptom)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted/50 border-border/60"
                          }`}
                        >
                          {symptom}
                        </button>
                      ))}
                    </div>
                    {selectedSymptoms.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelectedSymptoms([])}>
                          Clear all
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {filtered.length} condition{filtered.length !== 1 ? "s" : ""} match your symptoms
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category Tabs */}
          <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
            <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
              {categories.map(cat => (
                <TabsTrigger
                  key={cat.key}
                  value={cat.key}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4 py-1.5 text-xs gap-1.5"
                >
                  <cat.icon className="h-3.5 w-3.5" />
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Results Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((condition, i) => (
              <motion.div
                key={condition.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card className="border-border/60 h-full hover:shadow-md transition-shadow group relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg">{condition.name}</CardTitle>
                          <span className={severityColors[condition.severity]}><Badge variant="outline" className={`text-[10px] px-2 py-0 ${severityColors[condition.severity]}`}>{condition.severity}</Badge></span>
                        </div>
                        <CardDescription className="mt-1">{condition.description}</CardDescription>
                      </div>
                      <div className="flex flex-col items-center gap-1 shrink-0 ml-3">
                        <span className="text-2xl">{condition.icon}</span>
                        <Badge variant="secondary" className="text-[10px]">{condition.category}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex gap-2">
                        <span className="font-semibold text-foreground shrink-0 text-xs">Symptoms:</span>
                        <div className="flex flex-wrap gap-1">
                          {condition.symptoms.slice(0, 4).map(s => (
                            <span key={s} className="text-[11px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                              {s}
                            </span>
                          ))}
                          {condition.symptoms.length > 4 && (
                            <span className="text-[11px] text-muted-foreground/60">+{condition.symptoms.length - 4} more</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-foreground shrink-0 text-xs">Treatment:</span>
                        <span className="text-muted-foreground text-xs">{condition.treatment_summary}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-semibold text-foreground shrink-0 text-xs">Common in:</span>
                        <span className="text-muted-foreground text-xs">{condition.common_in}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/conditions/${makeSlug(condition.name)}`} className="flex-1">
                        <Button size="sm" variant="default" className="w-full gap-1.5 text-xs medical-gradient text-white">
                          <Sparkles className="h-3.5 w-3.5" /> Learn More
                        </Button>
                      </Link>
                      <Link href={`/consult/new?condition=${makeSlug(condition.name)}`}>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0">
                          AI Analyze
                        </Button>
                      </Link>
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
              <p className="text-sm text-muted-foreground mt-1">Try a different search term or select different symptoms.</p>
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-sky-50 to-teal-50 dark:from-sky-950/20 dark:to-teal-950/20 border border-sky-100 dark:border-sky-900/50">
            <h2 className="text-xl font-bold mb-2">Not sure what you have?</h2>
            <p className="text-muted-foreground mb-4">Use the Symptom Checker above, or let our AI analyze your skin directly.</p>
            <Link href="/consult/new">
              <Button size="lg" className="medical-gradient text-white shadow-lg">
                Start Free Consultation <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
