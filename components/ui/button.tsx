import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary: "bg-accent text-ink hover:bg-accent-strong hover:shadow-[0_12px_24px_-12px_rgba(245,200,76,0.9)]",
  secondary: "bg-electric text-ink hover:brightness-105 hover:shadow-[0_12px_24px_-16px_rgba(93,228,255,0.8)]",
  ghost: "bg-transparent text-white hover:bg-white/10 border border-white/20",
  danger: "bg-red-600 text-white hover:bg-red-700 hover:shadow-[0_12px_24px_-16px_rgba(239,68,68,0.5)]"
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        styles[variant],
        className
      )}
      {...props}
    />
  );
});
