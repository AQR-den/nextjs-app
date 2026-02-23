import { HTMLAttributes } from "react";
import clsx from "clsx";

const toneStyles = {
  neutral: "bg-white/10 text-white",
  success: "bg-emerald-500/20 text-emerald-200 animate-[badgepulse_6s_ease-in-out_infinite]",
  warning: "bg-amber-500/20 text-amber-200 animate-[badgepulse_6s_ease-in-out_infinite]",
  danger: "bg-red-500/20 text-red-200 animate-[badgepulse_7s_ease-in-out_infinite]"
};

export function Badge({
  className,
  children,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof toneStyles }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
        toneStyles[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
