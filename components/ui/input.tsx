import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input({
  label,
  className,
  error,
  id,
  ...props
}, ref) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-muted">{label}</span>
      <input
        id={id}
        ref={ref}
        className={clsx(
          "rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 transition focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          error && "border-red-500",
          className
        )}
        {...props}
      />
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </label>
  );
});
