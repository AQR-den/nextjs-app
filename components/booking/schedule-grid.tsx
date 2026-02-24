"use client";

import clsx from "clsx";
import { Slot } from "@/lib/types/domain";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";

const stateStyles = {
  available: "border-emerald-300/50 bg-emerald-500/10 hover:scale-[1.02] hover:bg-emerald-500/20",
  booked: "border-white/10 bg-white/5 opacity-60",
  pending_payment: "border-amber-300/40 bg-amber-500/10",
  individuals_slot:
    "border-fuchsia-300/70 bg-fuchsia-500/15 shadow-[0_0_0_1px_rgba(244,114,182,0.35)] hover:scale-[1.02]",
  held: "border-amber-300/40 bg-amber-500/10 opacity-70",
  unavailable: "border-white/10 bg-white/5 opacity-40"
};

const stateLabel = {
  available: "Vacant",
  booked: "Booked",
  pending_payment: "Pending payment",
  individuals_slot: "Individuals slot",
  held: "Held",
  unavailable: "Past"
};

export function ScheduleGrid({
  slots,
  onSelect,
  selectedSlotId
}: {
  slots: Slot[];
  onSelect: (slot: Slot) => void;
  selectedSlotId?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {slots.map((slot) => {
        const id = `${slot.courtId}-${slot.startDateTime}`;
        const label = `${DateTime.fromISO(slot.startDateTime).toFormat("HH:mm")}-${DateTime.fromISO(slot.endDateTime).toFormat("HH:mm")}`;
        const isDisabled = !["available", "individuals_slot"].includes(slot.state);

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(slot)}
            disabled={isDisabled}
            aria-label={`Slot ${label} ${slot.state}`}
            aria-pressed={selectedSlotId === id}
            className={clsx(
              "group rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
              stateStyles[slot.state],
              selectedSlotId === id && "ring-2 ring-accent shadow-[0_18px_30px_-18px_rgba(245,200,76,0.7)] scale-[1.01]"
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{label}</p>
              {selectedSlotId === id ? (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-ink text-xs font-bold">✓</span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {slot.state === "available" ? <Badge tone="success">Vacant</Badge> : null}
              {slot.isSpecialIndividualsSlot ? (
                <Badge tone="warning">Individuals Slot (R80) — Court 4 — 17:00–18:00</Badge>
              ) : null}
              {slot.isSpecialIndividualsSlot ? <Badge tone="danger">Payment required upon booking</Badge> : null}
              {slot.state === "booked" ? <Badge tone="neutral">Booked</Badge> : null}
              {slot.state === "pending_payment" ? <Badge tone="warning">Pending payment</Badge> : null}
              <span className="text-xs text-muted">ZAR {slot.price}</span>
            </div>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted">{stateLabel[slot.state]}</p>
          </button>
        );
      })}
    </div>
  );
}
