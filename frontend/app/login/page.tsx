"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Stethoscope, Mail, Lock, Eye, EyeOff, Chrome, Github, Loader2, ShieldCheck, CheckCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSignup = searchParams.get("signup") === "true"
  const { signIn, signUp, signInWithGoogle, signInWithGithub, verifyEmail } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<"login" | "signup">(isSignup ? "signup" : "login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [requireVerification, setRequireVerification] = useState(false)
  const [otp, setOtp] = useState("")
  const [verified, setVerified] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (mode === "login") {
        const result = await signIn(email, password)
        if (result.error) {
          setError(result.error)
        } else {
          router.push("/dashboard")
        }
      } else {
        const result = await signUp(email, password, name || undefined)
        if (result.error) {
          setError(result.error)
        } else if (result.requireVerification) {
          setRequireVerification(true)
        } else {
          router.push("/dashboard")
        }
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setError("")
    setLoading(true)
    const result = await verifyEmail(email, otp)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setVerified(true)
      setTimeout(() => router.push("/dashboard"), 1500)
    }
  }

  const handleGoogleSignIn = async () => {
    await signInWithGoogle()
  }

  const handleGithubSignIn = async () => {
    await signInWithGithub()
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="flex justify-center mb-4"><CheckCircle className="h-16 w-16 text-emerald-500" /></div>
          <h2 className="text-2xl font-bold">Email Verified!</h2>
          <p className="text-muted-foreground mt-2">Redirecting to dashboard...</p>
        </motion.div>
      </div>
    )
  }

  if (requireVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="border-border/60">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4"><ShieldCheck className="h-12 w-12 text-sky-500" /></div>
              <CardTitle>Check Your Email</CardTitle>
              <CardDescription>We sent a 6-digit verification code to {email}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp() }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input id="otp" type="text" inputMode="numeric" placeholder="000000" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} className="text-center text-2xl tracking-[0.5em] font-mono" required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full medical-gradient text-white shadow-lg" disabled={loading || otp.length !== 6}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Email"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Didn't get the code?{" "}
                  <button type="button" onClick={() => setRequireVerification(false)} className="text-primary font-semibold hover:underline">Try again</button>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-sky-500 via-sky-600 to-teal-600 items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative text-white text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Stethoscope className="h-8 w-8" />
            </div>
          </div>
          <h2 className="text-3xl font-bold">AI Skin Specialist</h2>
          <p className="mt-4 text-white/80">Your personal AI dermatology assistant — private, instant, and always available.</p>
          <div className="mt-8 space-y-4 text-left">
            {["Free AI-powered skin analysis", "End-to-end encrypted consultations", "Instant results in seconds"].map((text, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-sm text-white/90">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-teal-500">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
          </div>

          <Card className="border-border/60">
            <CardHeader className="text-center">
              <CardTitle>{mode === "login" ? "Welcome Back" : "Create Your Account"}</CardTitle>
              <CardDescription>
                {mode === "login" ? "Sign in to access your consultations and history." : "Start your journey to better skin health."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleGoogleSignIn}>
                  <Chrome className="h-4 w-4" /> Google
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={handleGithubSignIn}>
                  <Github className="h-4 w-4" /> GitHub
                </Button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with email</span></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name (optional)</Label>
                    <Input id="name" type="text" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="you@example.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" className="pl-10 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full medical-gradient text-white shadow-lg" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Please wait...</> : mode === "login" ? "Sign In" : "Create Account"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setRequireVerification(false) }} className="text-primary font-semibold hover:underline">
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground">Terms</Link> and{" "}
            <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
