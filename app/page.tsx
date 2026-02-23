import Link from "next/link";
import Image from "next/image";
import { AvailabilityPreview } from "@/components/booking/availability-preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DEMO_MODE } from "@/lib/config/demo";

const highlights = [
  { title: "R700 Standard Slots", text: "Flat 1-hour premium court pricing." },
  { title: "Court 4 Individuals Slot", text: "17:00-18:00 special at R80 with instant payment." },
  { title: "Automated Cancellations", text: "Live deadline countdown and instant refund/credit logic." },
  { title: "Wallet + Notifications", text: "Credits, confirmations, reminders, and status tracking." }
];

export default function HomePage() {
  return (
    <div className="grid gap-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10">
        <Image
          src="/images/hero-night.webp"
          alt="Five-a-side football match under evening lights"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1200px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/70 to-transparent" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-lime/15 blur-3xl" />
        <div className="relative z-10 max-w-3xl animate-[fadein_500ms_ease-out] p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.2em] text-electric">Cape Town Sports Club</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-6xl">Book a court. Enjoy the game!</h1>
          <p className="mt-4 max-w-xl text-base text-muted md:text-lg">
            Premium football booking with fast slot selection, live availability, immediate individual-slot payment,
            automated refunds, and wallet credits.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/booking">
              <Button>Book Now</Button>
            </Link>
            {DEMO_MODE ? (
              <Link href="/booking?demo=1">
                <Button variant="secondary">Quick Demo</Button>
              </Link>
            ) : null}
            <Link href="/pricing">
              <Button variant="ghost">Membership / Pricing</Button>
            </Link>
          </div>
        </div>
      </section>

      <AvailabilityPreview />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map((item) => (
          <Card key={item.title} className="transition hover:-translate-y-0.5 hover:bg-white/[0.08]">
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted">{item.text}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
