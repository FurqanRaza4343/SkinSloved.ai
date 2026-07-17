import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold">AI Skin Specialist</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              AI-powered dermatology consultation assistant. Get instant insights about your skin concerns using advanced artificial intelligence.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="trust-badge trust-badge-hipaa">
                HIPAA Compliant
              </span>
              <span className="trust-badge trust-badge-ssl">
                256-bit Encryption
              </span>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Quick Links</h4>
            <div className="space-y-2">
              <Link href="/" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link href="/consult/new" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">New Consultation</Link>
              <Link href="/dashboard" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Legal</h4>
            <div className="space-y-2">
              <Link href="/privacy" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/40">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; 2026 AI Skin Specialist. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-2xl">
              <strong>Medical Disclaimer:</strong> This tool provides informational guidance only and does not constitute a medical diagnosis. 
              Always consult a licensed dermatologist or healthcare provider for medical advice.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
