"use client";

export function PaymentSuccess() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-400/50 bg-emerald-500/10 p-4 text-sm text-emerald-100">
      <div className="absolute -left-16 top-0 h-full w-10 animate-[shimmer_1.6s_linear_infinite] bg-white/30" />
      Payment confirmed. Your slot is secured.
    </div>
  );
}
