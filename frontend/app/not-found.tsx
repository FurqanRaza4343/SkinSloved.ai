"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Home, Search, Stethoscope, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-b from-sky-50/50 to-background dark:from-sky-950/10 dark:to-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-lg"
      >
        <div className="relative mb-8">
          <div className="text-[120px] font-bold bg-gradient-to-b from-sky-200 to-sky-100 dark:from-sky-800/40 dark:to-sky-900/20 bg-clip-text text-transparent select-none leading-none">
            404
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-500/25">
              <Stethoscope className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button size="lg" className="medical-gradient text-white shadow-lg gap-2 w-full sm:w-auto">
              <Home className="h-4 w-4" /> Go Home
            </Button>
          </Link>
          <Link href="/consult/new">
            <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
              <Search className="h-4 w-4" /> Start Consultation
            </Button>
          </Link>
          <Button size="lg" variant="ghost" onClick={() => window.history.back()} className="gap-2 w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
