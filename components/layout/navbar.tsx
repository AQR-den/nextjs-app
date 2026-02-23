"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Logo } from "@/components/layout/logo";
import { NotificationCenter } from "@/components/layout/notification-center";

const links = [
  { href: "/", label: "Home" },
  { href: "/booking", label: "Booking" },
  { href: "/my-bookings", label: "Find Booking" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" }
];

export function Navbar() {
  const pathname = usePathname();

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
        </div>
      </nav>
    </header>
  );
}
