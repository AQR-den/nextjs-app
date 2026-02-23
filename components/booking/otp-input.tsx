"use client";

import { useEffect, useMemo, useRef } from "react";
import clsx from "clsx";

export function OtpInput({
  value,
  onChange,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = useMemo(() => value.split("").slice(0, 6), [value]);

  useEffect(() => {
    if (value.length >= 6) return;
    const next = inputs.current[value.length];
    if (next) next.focus();
  }, [value]);

  return (
    <div className="flex gap-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <input
          key={`otp-${index}`}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={chars[index] || ""}
          disabled={disabled}
          onChange={(event) => {
            const digit = event.target.value.replace(/\D/g, "");
            const nextValue = value.substring(0, index) + digit + value.substring(index + 1);
            onChange(nextValue.slice(0, 6));
            if (digit && inputs.current[index + 1]) {
              inputs.current[index + 1]?.focus();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !chars[index] && inputs.current[index - 1]) {
              inputs.current[index - 1]?.focus();
            }
          }}
          className={clsx(
            "h-12 w-12 rounded-xl border border-white/15 bg-white/5 text-center text-lg font-semibold text-white focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/40",
            disabled && "opacity-60"
          )}
        />
      ))}
    </div>
  );
}
