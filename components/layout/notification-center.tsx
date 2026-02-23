"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import clsx from "clsx";

export function NotificationCenter() {
  const { events, clearEvents } = useToast();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className={clsx(
          "relative grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10",
          open && "bg-white/10"
        )}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notification center"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M15.5 17H8.5M17 17H7M18 17v-5a6 6 0 10-12 0v5l-2 2h16l-2-2z" />
          <path d="M10 19a2 2 0 004 0" />
        </svg>
        {events.length ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400" />
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-80">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={clearEvents}>Clear</Button>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-muted">
              {events.length ? (
                events
                  .slice()
                  .reverse()
                  .map((event) => (
                    <div key={event.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                      {event.message}
                    </div>
                  ))
              ) : (
                <p>No events yet. Start a booking to see updates here.</p>
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
