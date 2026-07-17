"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"
import { Stethoscope, Mic, Image, Shield, Activity, FileText, ChevronRight, Sparkles, BarChart3, Brain, Clock, Download, Volume2, VolumeX, Play, Pause } from "lucide-react"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" } }),
}

const features = [
  { icon: Mic, title: "Voice Description", description: "Describe your skin concern naturally using your voice — our AI transcribes and understands every detail." },
  { icon: Image, title: "Visual Analysis", description: "Upload photos or videos of your skin for AI-powered visual assessment using advanced computer vision." },
  { icon: Brain, title: "AI Dermatologist", description: "Powered by Groq AI — analyzes your text and images together for comprehensive skin insights." },
  { icon: FileText, title: "Detailed Reports", description: "Receive written guidance and an audio explanation you can listen to anytime." },
  { icon: Clock, title: "Instant Results", description: "Get your analysis in seconds, not days. No waiting for appointments." },
  { icon: Shield, title: "Privacy First", description: "Your data is encrypted end-to-end. We never share your skin images or personal information." },
]

const stats = [
  { value: "10K+", label: "Consultations Completed" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "24/7", label: "Available Anytime" },
  { value: "50+", label: "Skin Conditions Analyzed" },
]

function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(true)

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setPlaying(true)
    } else {
      videoRef.current.pause()
      setPlaying(false)
    }
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoRef.current) return
    videoRef.current.muted = !videoRef.current.muted
    setMuted(videoRef.current.muted)
  }

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-sky-500/20 border border-border/40 group cursor-pointer" onClick={togglePlay}>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover rounded-2xl"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="h-16 w-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Play className="h-8 w-8 ml-1 text-sky-600" />
          </div>
        </div>
      )}

      <button
        onClick={toggleMute}
        className="absolute bottom-4 right-4 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors z-10"
      >
        {muted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
      </button>

      <div className="absolute bottom-4 left-4 right-16 pointer-events-none">
        <div className="glass-card rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-foreground">See how it works</p>
          <p className="text-xs text-muted-foreground">Click to pause • Toggle sound with the button</p>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-50 via-white to-white dark:from-sky-950/20 dark:via-background dark:to-background" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-sky-200/30 to-teal-200/30 dark:from-sky-500/5 dark:to-teal-500/5 rounded-full blur-3xl" />
          
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Text Content */}
              <motion.div initial="hidden" animate="visible">
                <motion.div variants={fadeInUp} custom={0}>
                  <Badge variant="outline" className="px-4 py-2 text-sm gap-2 border-sky-200 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-800">
                    <Sparkles className="h-4 w-4 text-sky-500" />
                    <span className="text-sky-700 dark:text-sky-400">AI-Powered Dermatology Assistant</span>
                  </Badge>
                </motion.div>

                <motion.h1 variants={fadeInUp} custom={1} className="mt-6 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
                  Your{" "}
                  <span className="bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">AI Skin Specialist</span>
                  <br />
                  Always in Your Pocket
                </motion.h1>

                <motion.p variants={fadeInUp} custom={2} className="mt-6 text-lg sm:text-xl text-muted-foreground text-balance">
                  Describe your skin concern using your voice, upload a photo, and get instant AI-powered insights. 
                  No appointments, no waiting rooms — just professional-grade guidance in seconds.
                </motion.p>

                <motion.div variants={fadeInUp} custom={3} className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link href="/consult/new">
                    <Button size="xl" className="medical-gradient text-white shadow-xl shadow-sky-500/25 hover:shadow-sky-500/40 w-full sm:w-auto gap-2">
                      Start Free Consultation <ChevronRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/login?signup=true">
                    <Button size="xl" variant="outline" className="w-full sm:w-auto">
                      Create Free Account
                    </Button>
                  </Link>
                </motion.div>

                <motion.div variants={fadeInUp} custom={4} className="mt-6 flex flex-wrap gap-2">
                  <span className="trust-badge trust-badge-hipaa">HIPAA Compliant</span>
                  <span className="trust-badge trust-badge-ssl">256-bit Encryption</span>
                </motion.div>
              </motion.div>

              {/* Right: Video */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.7 }} className="relative">
                <HeroVideo />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 border-y border-border/40 bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-sky-500 to-teal-500 bg-clip-text text-transparent">{stat.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Simple 3-Step Process</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">How It Works</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Get your skin analyzed in three simple steps — no medical knowledge required.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", icon: Mic, title: "Describe", desc: "Tell our AI about your skin concern using your voice or text. Describe symptoms, duration, and any triggers." },
                { step: "02", icon: Image, title: "Upload", desc: "Take a photo or video of the affected area. Good lighting and multiple angles help our AI provide better insights." },
                { step: "03", icon: Activity, title: "Analyze", desc: "Our AI analyzes your input using advanced dermatology knowledge and provides personalized guidance instantly." },
              ].map((item, i) => (
                <motion.div key={item.step} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                  <Card className="relative h-full border-border/60 hover:border-sky-200 dark:hover:border-sky-800 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <CardContent className="p-8">
                      <div className="text-5xl font-bold text-sky-100 dark:text-sky-900/50 mb-4">{item.step}</div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 mb-4">
                        <item.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                      <p className="text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-muted/30 border-y border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Premium Features</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Everything You Need for Healthy Skin</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Professional-grade AI tools designed to give you clarity about your skin health.</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                  <Card className="h-full border-border/60 hover:border-sky-200 dark:hover:border-sky-800 transition-all duration-300 hover:shadow-md group">
                    <CardContent className="p-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 mb-4 group-hover:scale-110 transition-transform">
                        <feature.icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-sky-600 to-teal-600 p-12 text-center text-white"
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-bold">Ready to Understand Your Skin Better?</h2>
                <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto">Join thousands of users who trust AI Skin Specialist for their skin health insights. No credit card required.</p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/consult/new">
                    <Button size="xl" className="bg-white text-sky-700 hover:bg-white/90 shadow-xl gap-2 w-full sm:w-auto">
                      Start Free Consultation <ChevronRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/login?signup=true">
                    <Button size="xl" variant="outline" className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                      Create Account
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Medical Disclaimer Bar */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border-y border-amber-200 dark:border-amber-900/50 py-3">
          <p className="text-xs text-amber-800 dark:text-amber-400 text-center px-4 max-w-4xl mx-auto">
            <strong>Medical Disclaimer:</strong> AI Skin Specialist provides informational guidance only and is not a substitute for professional medical advice, diagnosis, or treatment. 
            Always seek the advice of your dermatologist or other qualified health provider with any questions you may have regarding a medical condition.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
