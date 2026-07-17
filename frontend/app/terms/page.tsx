import Link from "next/link"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: July 2026</p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">Medical Disclaimer</h2>
              <p className="text-muted-foreground">
                AI Skin Specialist provides informational guidance only and is not a substitute for professional medical advice, 
                diagnosis, or treatment. Always seek the advice of your dermatologist or other qualified health provider 
                with any questions you may have regarding a medical condition. Never disregard professional medical advice 
                or delay in seeking it because of something you have read or been told by this AI service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">Service Description</h2>
              <p className="text-muted-foreground">
                AI Skin Specialist is an AI-powered tool that provides general skin care information based on user-provided 
                descriptions and images. The service uses artificial intelligence to analyze input and generate responses. 
                Results are not guaranteed to be accurate and should be used for informational purposes only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">User Responsibilities</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Provide accurate and truthful information about your skin concerns</li>
                <li>Not use the service for emergency medical situations</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">Limitation of Liability</h2>
              <p className="text-muted-foreground">
                AI Skin Specialist and its operators shall not be liable for any damages arising from the use or inability 
                to use this service. The service is provided &ldquo;as is&rdquo; without any warranty, express or implied.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
