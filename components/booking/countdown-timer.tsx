"use client";

import { useEffect, useState } from "react";
import { countdownText, nowInTz, toTz } from "@/lib/utils/datetime";
import clsx from "clsx";

export function CountdownTimer({
  targetIso,
  label,
  expiredLabel,
  className
}: {
  targetIso: string;
  label?: string;
  expiredLabel?: string;
  className?: string;
}) {
  const [time, setTime] = useState(() => countdownText(targetIso));
  const [expired, setExpired] = useState(() => toTz(targetIso) <= nowInTz());

  useEffect(() => {
    const timer = setInterval(() => {
      const next = countdownText(targetIso);
      setTime(next);
      setExpired(next === "00:00:00");
    }, 1000);
    return () => clearInterval(timer);
  }, [targetIso]);

  return (
    <div
      className={clsx(
        "rounded-lg border px-3 py-2 text-xs transition",
        expired ? "border-red-400/50 bg-red-500/10 text-red-200" : "border-emerald-400/50 bg-emerald-500/10 text-emerald-100",
        className
      )}
    >
      {expired ? expiredLabel || "Cancellation window closed" : `${label || "Free cancellation ends in"}: ${time}`}
    </div>
  );
}
