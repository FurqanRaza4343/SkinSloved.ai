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
              <Link href="/disclaimer" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">Medical Disclaimer</Link>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Connect</h4>
            <div className="flex gap-3">
              <Link href="https://twitter.com" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.213 8.263L24 21.75h-6.595l-4.93-6.26L3.457 21.75H.165l7.923-9.19L.002 2.25H3.54l7.629 9.936z" />
                </svg>
              </Link>
              <Link href="https://github.com" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 .296c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.226-.015-2.2-3.338.725-4.042-1.61-4.042-1.61C5.424 18.06 4.536 17.75 4.536 17.75c-1.087-.744.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.775.417-1.305.76-1.605-2.665-.303-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.28-1.552 3.28-1.23 3.28-1.23.645 1.653.24 2.873.115 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.62-5.475 5.92 0.42.84 1.23 2.04 1.81 2.44-.71.53-1.57.99-2.57 1.19 0 0-1.65.565-4.79 1.8A17.43 17.43 0 013 17.983c-4.68-1.54-5.57-4.2-5.57-5.18 0-.16.79-1.15.85-1.27 0 0 0 0 0 0v-0.01c1.34 2.44 3.6 4.1 6.29 4.62.91-.71 1.69-1.68 2.19-2.82 0 0 0 0 0 0v-0.01c1.34 2.44 3.6 4.1 6.29 4.62.91-.71 1.69-1.68 2.19-2.82 0 0 0 0 0 0v-0.01c1.34 2.44 3.6 4.1 6.29 4.62.91-.71 1.69-1.68 2.19-2.82 0 0 0 0 0 0v-0.01c1.34 2.44 3.6 4.1 6.29 4.62.91-.71 1.69-1.68 2.19-2.82 0 0 0 0 0 0v-0.01c1.34 2.44 3.6 4.1 6.29 4.62.91-.71 1.69-1.68 2.19-2.82 0 0 0 0 0 0v-0.01c1.34 2.44 3.6 4.1 6.29 4.62.91-.71 1.69-1.68 2.19-2.82 0 0 0 0 0 0v-0.01c1.34 2.44 3.6 4.1 6.29 4.62.91-.71 1.69-1.68 2.19-2.82z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border/40">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; 2026 AI Skin Specialist. All rights reserved.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/report" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Report an Issue
              </Link>
              <p className="text-xs text-muted-foreground text-center max-w-2xl">
                <strong>Medical Disclaimer:</strong> This tool provides informational guidance only and does not constitute a medical diagnosis.
                Always consult a licensed dermatologist or healthcare provider for medical advice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
