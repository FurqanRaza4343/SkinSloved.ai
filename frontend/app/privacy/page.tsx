import Link from "next/link"
import Navbar from "@/components/shared/navbar"
import Footer from "@/components/shared/footer"

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: July 2026</p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">Information We Collect</h2>
              <p className="text-muted-foreground">We collect information you provide when using our service:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Voice recordings and transcripts of your skin concern descriptions</li>
                <li>Images and videos of skin conditions you upload</li>
                <li>Account information (email, name) when you register</li>
                <li>Usage data to improve our service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>To provide AI-powered skin analysis and guidance</li>
                <li>To improve our AI models and service quality</li>
                <li>To communicate with you about your consultations</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">Data Protection</h2>
              <p className="text-muted-foreground">
                We implement industry-standard security measures including 256-bit encryption, secure data storage, 
                and strict access controls. Your medical information is treated with the highest level of confidentiality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">Your Rights</h2>
              <p className="text-muted-foreground">
                You have the right to access, modify, or delete your personal data at any time. 
                You can request a copy of your data or ask us to remove your account and associated information 
                through your account settings or by contacting us.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
