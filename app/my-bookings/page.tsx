"use client";

import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OtpInput } from "@/components/booking/otp-input";
import { BookingWithRelations } from "@/lib/types/domain";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { DEMO_MODE } from "@/lib/config/demo";

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `+${digits.slice(0, 2)} ** *** ${digits.slice(-4)}`;
}

export default function MyBookingsPage() {
  const { push } = useToast();
  const [phone, setPhone] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupExpires, setLookupExpires] = useState<string | null>(null);
  const [lookupDemoCode, setLookupDemoCode] = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [activeCancelId, setActiveCancelId] = useState<string | null>(null);
  const [cancelCode, setCancelCode] = useState("");
  const [cancelDemoCode, setCancelDemoCode] = useState<string | null>(null);
  const [cancelExpires, setCancelExpires] = useState<string | null>(null);

  const sendLookupCode = async () => {
    if (!phone.match(/^\+?\d{10,15}$/)) {
      push("Enter a valid phone number with country code.");
      return;
    }
    try {
      const result = await api.initiateLookup({ phone });
      setLookupExpires(result.expiresAt);
      setLookupDemoCode(result.demoCode || null);
      push("Code sent to your phone.");
    } catch (error) {
      push(error instanceof Error ? error.message : "Unable to send code");
    }
  };

  const verifyLookup = async () => {
    try {
      const result = await api.verifyLookup({ phone, code: lookupCode });
      setBookings(result.bookings);
      push("Bookings loaded.");
    } catch (error) {
      push(error instanceof Error ? error.message : "Unable to verify code");
    }
  };

  const initiateCancel = async (booking: BookingWithRelations) => {
    try {
      const result = await api.initiateCancellation({ reference: booking.booking.reference, phone: booking.booking.phone });
      setActiveCancelId(booking.booking.id);
      setCancelExpires(result.expiresAt);
      setCancelDemoCode(result.demoCode || null);
      setCancelCode("");
      push("Cancellation code sent.");
    } catch (error) {
      push(error instanceof Error ? error.message : "Unable to send cancellation code");
    }
  };

  const verifyCancel = async () => {
    if (!activeCancelId) return;
    try {
      const result = await api.verifyCancellation({ bookingId: activeCancelId, code: cancelCode });
      setBookings((prev) => prev.map((entry) => (entry.booking.id === result.booking.booking.id ? result.booking : entry)));
      setActiveCancelId(null);
      setCancelCode("");
      push("Booking cancelled.");
    } catch (error) {
      push(error instanceof Error ? error.message : "Unable to cancel booking");
    }
  };

  useEffect(() => {
    if (!phone) {
      setLookupCode("");
      setLookupExpires(null);
      setLookupDemoCode(null);
      setBookings([]);
    }
  }, [phone]);

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <h1 className="text-2xl font-bold">Find my booking</h1>
        <p className="text-sm text-muted">Enter your phone number to retrieve upcoming bookings.</p>
        <Input label="Telephone number" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <Button onClick={sendLookupCode}>Send code</Button>
        {lookupExpires ? (
          <div className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
            <p className="text-xs text-muted">Code sent to {maskPhone(phone)}</p>
            {DEMO_MODE && lookupDemoCode ? <p className="text-xs text-emerald-200">Demo code: {lookupDemoCode}</p> : null}
            <OtpInput value={lookupCode} onChange={setLookupCode} />
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{lookupExpires ? `Expires at ${DateTime.fromISO(lookupExpires).toFormat("HH:mm")}` : null}</span>
            </div>
            <Button onClick={verifyLookup} disabled={lookupCode.length !== 6}>View bookings</Button>
          </div>
        ) : null}
      </Card>

      <Card className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Upcoming bookings</h2>
          <Badge tone="neutral">{bookings.length}</Badge>
        </div>
        {bookings.length ? (
          <div className="grid gap-3">
            {bookings.map((entry) => {
              const canCancel = entry.cancellationAllowed;
              return (
                <div key={entry.booking.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">{entry.court.name}</h3>
                      <p className="text-xs text-muted">
                        {DateTime.fromISO(entry.booking.startDateTime).toFormat("dd LLL yyyy, HH:mm")}
                      </p>
                      <p className="text-xs text-muted">Ref: {entry.booking.reference}</p>
                    </div>
                    <Badge tone={entry.booking.status === "confirmed" ? "success" : "neutral"}>Confirmed</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button variant="ghost" disabled={!canCancel} onClick={() => initiateCancel(entry)}>
                      {canCancel ? "Cancel booking" : "Cancellation locked"}
                    </Button>
                    {!canCancel ? (
                      <span className="text-xs text-muted">Cancellation is only allowed more than 24h before start.</span>
                    ) : null}
                  </div>
                  {activeCancelId === entry.booking.id ? (
                    <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                      <p className="text-xs text-muted">Code sent to {maskPhone(entry.booking.phone)}</p>
                      {DEMO_MODE && cancelDemoCode ? <p className="text-xs text-emerald-200">Demo code: {cancelDemoCode}</p> : null}
                      <OtpInput value={cancelCode} onChange={setCancelCode} />
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>{cancelExpires ? `Expires at ${DateTime.fromISO(cancelExpires).toFormat("HH:mm")}` : null}</span>
                      </div>
                      <Button onClick={verifyCancel} disabled={cancelCode.length !== 6}>Confirm cancellation</Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No bookings yet"
            description="Search by phone to see your upcoming bookings."
            image="/images/empty-bookings.webp"
          />
        )}
      </Card>
    </div>
  );
}
