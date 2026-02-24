"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Logo } from "@/components/layout/logo";
import { NotificationCenter } from "@/components/layout/notification-center";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/booking", label: "Booking" },
  { href: "/my-bookings", label: "Find Booking" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" }
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="transition hover:scale-[1.02]">
          <Logo />
        </Link>
        <div className="hidden items-center gap-4 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "rounded-md px-2 py-1 text-sm text-muted transition hover:bg-white/10 hover:text-white",
                pathname === link.href && "bg-white/10 text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <span className="hidden text-xs uppercase tracking-[0.2em] text-muted md:inline">Guest booking</span>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 md:hidden"
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            <span className="text-lg">{open ? "×" : "≡"}</span>
          </button>
        </div>
      </nav>
      {open ? (
        <div className="border-t border-white/10 bg-ink/95 md:hidden">
          <div className="mx-auto grid max-w-6xl gap-2 px-4 py-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "rounded-md px-3 py-2 text-sm text-muted transition hover:bg-white/10 hover:text-white",
                  pathname === link.href && "bg-white/10 text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 text-xs uppercase tracking-[0.2em] text-muted">Guest booking</div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
