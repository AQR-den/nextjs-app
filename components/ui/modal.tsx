"use client";

import { PropsWithChildren } from "react";

export function Modal({ open, onClose, title, children }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string }>) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 animate-[fadein_200ms_ease-out]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-panel p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="rounded-md px-2 py-1 hover:bg-white/10" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
