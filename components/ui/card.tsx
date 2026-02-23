import { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.8)] backdrop-blur-lg",
        className
      )}
      {...props}
    />
  );
}
