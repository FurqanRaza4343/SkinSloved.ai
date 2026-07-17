import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { AuthProvider } from "@/lib/auth-context"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AI Skin Specialist | AI-Powered Dermatology Consultation",
  description: "Get instant AI-powered skin analysis and recommendations. Upload photos and describe your concerns for professional-grade dermatology insights.",
  keywords: "skin care, dermatology AI, skin analysis, acne detection, skin concern, tele-dermatology",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
  openGraph: {
    title: "AI Skin Specialist | AI-Powered Dermatology Consultation",
    description: "Get instant AI-powered skin analysis and recommendations from our advanced dermatology AI.",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
