export function Skeleton({ className = "h-10 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/10 ${className}`} aria-hidden="true" />;
}
