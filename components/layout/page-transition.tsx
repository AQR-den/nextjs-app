"use client";

import { PropsWithChildren } from "react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: PropsWithChildren) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-[pagefade_320ms_ease-out]">
      {children}
    </div>
  );
}
