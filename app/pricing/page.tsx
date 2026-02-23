import Image from "next/image";
import { Card } from "@/components/ui/card";

const memberships = [
  { name: "Social Pass", price: "ZAR 1,299/mo", perks: "2 premium slots + discounted extras" },
  { name: "Competitive", price: "ZAR 2,499/mo", perks: "5 slots, league priority, locker perks" },
  { name: "Club Elite", price: "ZAR 3,499/mo", perks: "10 slots + event entry + partner discounts" }
];

export default function PricingPage() {
  return (
    <div className="grid gap-8">
      <section>
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="mt-2 text-sm text-muted">Currency: ZAR • 1-hour slot model</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="relative mb-4 h-36 w-full overflow-hidden rounded-2xl border border-white/10">
            <Image
              src="/images/pricing-standard.webp"
              alt="Team celebrating a premium court booking"
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              className="object-cover"
            />
          </div>
          <h2 className="text-xl font-semibold">Standard Court Booking</h2>
          <p className="mt-2 text-4xl font-bold text-accent">R700</p>
          <p className="mt-2 text-sm text-muted">Per court, per 1-hour slot (Courts 1-4 standard times).</p>
        </Card>

        <Card className="border-fuchsia-300/40 bg-fuchsia-500/10">
          <div className="relative mb-4 h-36 w-full overflow-hidden rounded-2xl border border-fuchsia-300/30">
            <Image
              src="/images/pricing-individual.webp"
              alt="Individual players practicing on Court 4"
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              className="object-cover"
            />
          </div>
          <h2 className="text-xl font-semibold">Individuals Slot (Court 4, 17:00-18:00)</h2>
          <p className="mt-2 text-4xl font-bold text-fuchsia-100">R80</p>
          <p className="mt-2 text-sm text-fuchsia-100/90">Per person • payment required immediately upon booking.</p>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {memberships.map((membership) => (
          <Card key={membership.name}>
            <div className="relative mb-4 h-24 w-full overflow-hidden rounded-2xl border border-white/10">
              <Image
                src="/images/pricing-membership.webp"
                alt="Members gathering for a football session"
                fill
                sizes="(max-width: 768px) 100vw, 360px"
                className="object-cover"
              />
            </div>
            <h3 className="text-lg font-semibold">{membership.name}</h3>
            <p className="mt-1 text-xl font-bold">{membership.price}</p>
            <p className="mt-2 text-sm text-muted">{membership.perks}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
