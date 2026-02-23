"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h1 className="text-2xl font-bold">Contact & Location</h1>
        <p className="mt-2 text-sm text-muted">17 Marine Drive, Cape Town, South Africa</p>
        <p className="mt-1 text-sm text-muted">WhatsApp: +27 71 555 0101</p>
        <a className="mt-2 inline-block text-sm text-accent underline" href="https://wa.me/27715550101" target="_blank" rel="noreferrer">
          Chat on WhatsApp
        </a>
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <iframe
            title="Tekkerz map"
            src="https://www.google.com/maps?q=Cape%20Town&output=embed"
            className="h-72 w-full"
            loading="lazy"
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Send a message</h2>
        <form
          className="mt-3 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
        >
          <Input label="Name" required />
          <Input label="Email" type="email" required />
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-muted">Message</span>
            <textarea
              required
              className="min-h-28 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            />
          </label>
          <Button type="submit">Send</Button>
          {submitted ? <p className="text-sm text-emerald-300">Message queued. We will contact you soon.</p> : null}
        </form>
      </Card>
    </div>
  );
}
