"use client";

import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";

type Toast = { id: number; message: string };
type EventItem = { id: number; message: string; createdAt: number };

const ToastContext = createContext<{
  push: (message: string) => void;
  events: EventItem[];
  clearEvents: () => void;
}>({
  push: () => undefined,
  events: [],
  clearEvents: () => undefined
});

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const value = useMemo(
    () => ({
      push(message: string) {
        const id = Date.now();
        const createdAt = Date.now();
        setToasts((prev) => [...prev, { id, message }]);
        setEvents((prev) => [...prev, { id, message, createdAt }].slice(-10));
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
      },
      events,
      clearEvents() {
        setEvents([]);
      }
    }),
    [events]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] grid gap-2" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-xl border border-white/10 bg-black/80 px-4 py-2 text-sm text-white shadow-[0_18px_40px_-20px_rgba(0,0,0,0.8)]">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
