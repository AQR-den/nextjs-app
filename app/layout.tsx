import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Providers } from "@/app/providers";
import { PageTransition } from "@/components/layout/page-transition";

export const metadata: Metadata = {
  title: "Tekkerz | Book a court. Play tonight.",
  description: "Premium five-a-side courts in Cape Town with modern online booking and payment management.",
  openGraph: {
    title: "Tekkerz",
    description: "Book courts, manage bookings, and secure Individuals Slot payments.",
    type: "website"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-body bg-ink text-white antialiased">
        <Providers>
          <div className="relative min-h-screen flex flex-col">
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-8">
              <PageTransition>{children}</PageTransition>
            </main>
            <div className="mt-auto">
              <Footer />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
