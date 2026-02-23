"use client";

import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { BookingWithRelations, RefundOption } from "@/lib/types/domain";
import { formatSlot } from "@/lib/utils/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/auth/auth-provider";
import { CountdownTimer } from "@/components/booking/countdown-timer";
import { CancelBookingModal } from "@/components/booking/cancel-booking-modal";

function paymentTone(status?: string): "neutral" | "success" | "warning" | "danger" {
  if (!status) return "neutral";
  if (["paid", "refunded", "credited"].includes(status)) return "success";
  if (["expired", "failed"].includes(status)) return "danger";
  return "warning";
}

function bookingTone(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "confirmed" || status === "booked") return "success";
  if (status === "cancelled") return "neutral";
  if (status === "expired") return "danger";
  if (status === "expired_hold") return "warning";
  return "warning";
}

export function MyBookingsList({ bookings }: { bookings: BookingWithRelations[] }) {
  const { token } = useAuth();
  const { push } = useToast();
  const queryClient = useQueryClient();
  const [activeCancelId, setActiveCancelId] = useState<string | null>(null);

  const activeEntry = useMemo(() => bookings.find((entry) => entry.booking.id === activeCancelId) || null, [bookings, activeCancelId]);

  const cancelMutation = useMutation({
    mutationFn: ({ id, refundOption }: { id: string; refundOption: RefundOption }) => apiClient.cancelBooking(token!, id, refundOption),
    onSuccess: (result) => {
      if (result.refundStatus === "credited") {
        push("Booking cancelled and amount credited to wallet.");
      } else if (result.refundStatus === "refunded") {
        push("Booking cancelled and refund initiated.");
      } else {
        push("Booking cancelled.");
      }
      setActiveCancelId(null);
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (error: Error) => push(error.message)
  });

  return (
    <>
      <div className="grid gap-4">
        {bookings.map((entry) => (
          <Card key={entry.booking.id} className="transition hover:-translate-y-[1px] hover:bg-white/[0.07]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">{entry.court.name}</h3>
                <p className="text-sm text-muted">{formatSlot(entry.booking.startDateTime)}</p>
                <p className="text-xs text-muted">
                  Start: {DateTime.fromISO(entry.booking.startDateTime).toFormat("dd LLL yyyy, HH:mm")}
                </p>
                <p className="text-xs text-muted">
                  Cancellation deadline: {DateTime.fromISO(entry.booking.cancellationDeadline).toFormat("dd LLL yyyy, HH:mm")}
                </p>
                <p className="text-xs text-muted">Ref: {entry.booking.reference} • ZAR {entry.payment?.amount || entry.court.hourlyRate}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {entry.booking.demoScenario ? <Badge tone="warning">Demo</Badge> : null}
                <Badge tone={bookingTone(entry.booking.status)}>
                  {entry.booking.status === "booked" || entry.booking.status === "confirmed" ? "Confirmed" : entry.booking.status}
                </Badge>
                <Badge tone={paymentTone(entry.payment?.status)}>{entry.payment?.status || "Payment Pending"}</Badge>
              </div>
            </div>

            <CountdownTimer targetIso={entry.booking.cancellationDeadline} className="mt-3" />
            <p className="mt-2 text-xs text-muted">
              {entry.cancellationAllowed ? "Cancellation available (button enabled)." : "Cancellation locked (button disabled)."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="danger"
                disabled={!entry.cancellationAllowed || cancelMutation.isPending}
                onClick={() => setActiveCancelId(entry.booking.id)}
                title={entry.cancellationReason}
              >
                Cancel
              </Button>
              {entry.payment && entry.payment.status === "payment_pending" ? (
                <Button variant="secondary" onClick={() => push("Individuals slot requires immediate payment during booking.")}>Pay Now</Button>
              ) : null}
            </div>
            {entry.cancellationReason ? <p className="mt-2 text-xs text-muted">{entry.cancellationReason}</p> : null}
          </Card>
        ))}
      </div>

      <CancelBookingModal
        open={Boolean(activeEntry)}
        onClose={() => setActiveCancelId(null)}
        canRefund={Boolean(activeEntry?.payment?.status === "paid")}
        loading={cancelMutation.isPending}
        onConfirm={(option) => {
          if (!activeEntry) return;
          cancelMutation.mutate({ id: activeEntry.booking.id, refundOption: option });
        }}
      />
    </>
  );
}
