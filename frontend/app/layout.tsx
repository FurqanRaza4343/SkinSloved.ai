import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { AuthProvider } from "@/lib/auth-context"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import BackToTop from "@/components/shared/back-to-top"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export const metadata: Metadata = {
  title: "SkinSloved.ai | AI-Powered Dermatology Consultation & Skin Routine",
  description: "Get instant AI-powered skin analysis, personalized skin care routines, and professional dermatology insights. Upload photos and describe your concerns.",
  keywords: ["skin care", "dermatology AI", "skin analysis", "acne detection", "skin concern", "tele-dermatology", "AI doctor", "skin routine", "skincare routine", "personalized routine"],
  authors: [{ name: "SkinSloved" }],
  robots: { index: true, follow: true },
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
  openGraph: {
    title: "SkinSloved.ai | AI-Powered Dermatology Consultation",
    description: "Get instant AI-powered skin analysis and recommendations from our advanced dermatology AI.",
    type: "website",
    siteName: "SkinSloved.ai",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkinSloved.ai | AI-Powered Dermatology Consultation",
    description: "Get instant AI-powered skin analysis and recommendations.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <ErrorBoundary>
              {children}
              <BackToTop />
            </ErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
