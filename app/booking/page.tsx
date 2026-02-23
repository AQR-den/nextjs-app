"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { DateTime } from "luxon";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { COURTS, INDIVIDUAL_SLOT_PRICE } from "@/lib/config/constants";
import { getDateParam, nowInTz, toTz } from "@/lib/utils/datetime";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Slot } from "@/lib/types/domain";
import { OtpInput } from "@/components/booking/otp-input";
import { DEMO_MODE } from "@/lib/config/demo";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildCalendar(month: DateTime) {
  const start = month.startOf("month");
  const startWeekday = start.weekday; // 1-7 (Mon-Sun)
  const daysInMonth = month.daysInMonth;
  const cells = [] as Array<{ date: DateTime | null; key: string }>;

  for (let i = 1; i < startWeekday; i += 1) {
    cells.push({ date: null, key: `empty-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = start.set({ day });
    cells.push({ date, key: date.toISODate()! });
  }

  return cells;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  const last = digits.slice(-4);
  return `+${digits.slice(0, 2)} ** *** ${last}`;
}

export default function BookingPage() {
  const { push } = useToast();
  const today = nowInTz();
  const [month, setMonth] = useState(() => today.startOf("month"));
  const [selectedDate, setSelectedDate] = useState(() => getDateParam(today));
  const [courtFilter, setCourtFilter] = useState<number | "all">(1);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [individualCounts, setIndividualCounts] = useState<Record<string, number>>({});

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["availability-summary", month.toFormat("yyyy-LL")],
    queryFn: () => api.getAvailabilitySummary(month.toFormat("yyyy-LL"))
  });

  const availabilityQuery = useQuery({
    queryKey: ["availability", selectedDate],
    queryFn: () => api.getAvailability(selectedDate),
    refetchInterval: 10000
  });

  const daySummaryMap = useMemo(() => {
    const map = new Map<string, { available: number; total: number; status: string }>();
    summaryQuery.data?.days.forEach((day) => map.set(day.date, day));
    return map;
  }, [summaryQuery.data]);

  const calendarCells = useMemo(() => buildCalendar(month), [month]);

  const slotsByCourt = useMemo(() => {
    const slots = availabilityQuery.data?.slots || [];
    const grouped = new Map<number, Slot[]>();
    COURTS.forEach((court) => grouped.set(court.id, []));
    slots.forEach((slot) => grouped.get(slot.courtId)?.push(slot));
    grouped.forEach((list) => list.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()));
    return grouped;
  }, [availabilityQuery.data]);

  const filteredCourts = useMemo(() => {
    if (courtFilter === "all") return COURTS;
    return COURTS.filter((court) => court.id === courtFilter);
  }, [courtFilter]);

  const minutesToStart = useMemo(() => {
    if (!selectedSlot) return null;
    return Math.round(DateTime.fromISO(selectedSlot.startDateTime).diff(DateTime.now(), "minutes").minutes);
  }, [selectedSlot]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    setSelectedSlot(null);
    setOtpSent(false);
    setBookingId(null);
    setOtpCode("");
    setDemoOtp(null);
  }, [selectedDate]);

  const selectedSlotKey = selectedSlot ? `${selectedSlot.courtId}-${selectedSlot.startDateTime}` : "";
  const selectedIndividualCount = selectedSlotKey ? individualCounts[selectedSlotKey] ?? 0 : 0;
  const selectedIndividualTotal =
    selectedSlot && selectedSlot.isSpecialIndividualsSlot ? Math.max(1, selectedIndividualCount) : selectedIndividualCount;
  const bookingSummary = selectedSlot
    ? {
        date: DateTime.fromISO(selectedSlot.startDateTime).toFormat("dd LLL yyyy"),
        time: `${DateTime.fromISO(selectedSlot.startDateTime).toFormat("HH:mm")}–${DateTime.fromISO(selectedSlot.endDateTime).toFormat("HH:mm")}`,
        court: `Court ${selectedSlot.courtId}`,
        price: selectedSlot.isSpecialIndividualsSlot
          ? `ZAR ${INDIVIDUAL_SLOT_PRICE * selectedIndividualTotal}`
          : `ZAR ${selectedSlot.price}`
      }
    : null;

  const canSendCode = Boolean(
    selectedSlot &&
      firstName &&
      surname &&
      email &&
      phone.match(/^\+?\d{10,15}$/) &&
      (!selectedSlot.isSpecialIndividualsSlot || selectedIndividualTotal > 0)
  );

  const sendCode = async () => {
    if (!selectedSlot) return;
    if (!canSendCode) {
      push("Please complete all required fields with a valid phone number.");
      return;
    }

    try {
      const payload = {
        bookingId: bookingId || undefined,
        courtId: selectedSlot.courtId,
        startDateTime: selectedSlot.startDateTime,
        endDateTime: selectedSlot.endDateTime,
        firstName,
        surname,
        email,
        phone
      };
      const result = await api.initiateBooking(payload);
      setBookingId(result.bookingId);
      setOtpSent(true);
      setOtpExpiresAt(result.expiresAt);
      setOtpCode("");
      setDemoOtp(result.demoCode || null);
      setResendCooldown(45);
      push("Verification code sent.");
    } catch (error) {
      push(error instanceof Error ? error.message : "Unable to send code");
    }
  };

  const verifyCode = async () => {
    if (!bookingId) return;
    if (otpCode.length !== 6) {
      push("Enter the 6-digit code.");
      return;
    }
    try {
      const result = await api.verifyBooking({ bookingId, code: otpCode });
      push("Booking confirmed.");
      setOtpSent(false);
      setBookingId(null);
      setOtpCode("");
      availabilityQuery.refetch();
      setSelectedSlot(null);
      setFirstName("");
      setSurname("");
      setEmail("");
      setPhone("");
      setDemoOtp(null);
      setOtpExpiresAt(null);
      setResendCooldown(0);
    } catch (error) {
      push(error instanceof Error ? error.message : "Verification failed");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="grid gap-6">
        <section className="relative overflow-hidden rounded-3xl border border-white/10">
          <Image
            src="/images/booking-banner.webp"
            alt="Five-a-side players under evening lights"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 900px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/70 to-transparent" />
          <div className="relative z-10 grid gap-2 p-5 md:p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-electric">Book a slot</p>
            <h1 className="text-3xl font-bold md:text-4xl">Pick a day. Secure your time.</h1>
            <p className="max-w-xl text-sm text-muted">
              Pick a day, then choose a vacant slot. You can book right up to kick-off if the slot is available.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">R700 standard courts</Badge>
              <Badge tone="warning">Individuals Slot: Court 4 • 17:00–18:00 • R80</Badge>
            </div>
          </div>
        </section>

        <Card className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Step A — Select a day</h2>
              <p className="text-sm text-muted">Availability loads fast with live counts.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setMonth(month.minus({ months: 1 }))}>Prev</Button>
              <Button variant="ghost" onClick={() => setMonth(month.plus({ months: 1 }))}>Next</Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-[11px] text-muted">
            {WEEKDAYS.map((day) => (
              <span key={day} className="text-center uppercase tracking-wide">{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell) => {
              if (!cell.date) {
                return <div key={cell.key} className="h-20" />;
              }
              const iso = cell.date.toFormat("yyyy-LL-dd");
              const isPast = cell.date.startOf("day") < today.startOf("day");
              const summary = daySummaryMap.get(iso);
              const isSelected = iso === selectedDate;
              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={isPast}
                  onClick={() => setSelectedDate(iso)}
                  className={`flex h-16 flex-col justify-between rounded-xl border p-2 text-left text-sm transition ${
                    isSelected ? "border-accent/60 bg-accent/10" : "border-white/10 bg-white/5"
                  } ${isPast ? "opacity-40" : "hover:bg-white/10"}`}
                >
                  <span className="font-semibold">{cell.date.day}</span>
                  <span className="text-[11px] text-muted">
                    {summary ? (summary.available === 0 ? "Fully booked" : `${summary.available} slots available`) : "Loading..."}
                  </span>
                  <div className="h-1 w-full rounded-full bg-white/10">
                    <div
                      className={`h-1 rounded-full ${summary?.available ? "bg-emerald-400" : "bg-red-400"}`}
                      style={{
                        width: summary ? `${Math.min(100, (summary.available / summary.total) * 100)}%` : "0%"
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Step B — Choose a timeslot</h2>
              <p className="text-sm text-muted">Slots are grouped by court. Choose any vacant slot.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {COURTS.map((court) => (
                <Button
                  key={court.id}
                  variant={courtFilter === court.id ? "primary" : "ghost"}
                  onClick={() => setCourtFilter(court.id)}
                  className={
                    court.id === 1
                      ? "border-emerald-300/40 text-emerald-100 hover:bg-emerald-500/10"
                      : court.id === 2
                      ? "border-sky-300/40 text-sky-100 hover:bg-sky-500/10"
                      : court.id === 3
                      ? "border-amber-300/40 text-amber-100 hover:bg-amber-500/10"
                      : "border-fuchsia-300/40 text-fuchsia-100 hover:bg-fuchsia-500/10"
                  }
                >
                  {court.name}
                </Button>
              ))}
              <Button
                variant={courtFilter === "all" ? "secondary" : "ghost"}
                onClick={() => setCourtFilter("all")}
              >
                All Courts
              </Button>
            </div>
          </div>

          {availabilityQuery.isLoading ? <p className="text-sm text-muted">Loading slots...</p> : null}
          {filteredCourts.map((court) => (
            <div key={court.id} className="grid gap-2">
              <div
                className={
                  court.id === 1
                    ? "rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100"
                    : court.id === 2
                    ? "rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-100"
                    : court.id === 3
                    ? "rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-100"
                    : "rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-sm font-semibold text-fuchsia-100"
                }
              >
                {court.name}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {(slotsByCourt.get(court.id) || []).map((slot) => {
                  const isAvailable = ["available", "individuals_slot"].includes(slot.state);
                  const isSelected = selectedSlot?.startDateTime === slot.startDateTime && selectedSlot?.courtId === slot.courtId;
                  const badge = slot.isSpecialIndividualsSlot
                    ? "Individuals Slot"
                    : slot.state === "available"
                    ? "Vacant"
                    : slot.state === "held"
                    ? "Held"
                    : "Booked";
                  const slotKey = `${slot.courtId}-${slot.startDateTime}`;
                  const individualCount = individualCounts[slotKey] ?? 0;
                  const isSlotSelected = selectedSlotKey === slotKey;
                  const displayCount = isSlotSelected ? Math.max(1, individualCount || 0) : 0;
                  const availableIndividuals = Math.max(0, 10 - (isSlotSelected ? displayCount : 0));

                  const handleSelect = () => {
                    if (!isAvailable) return;
                    setSelectedSlot(slot);
                    if (slot.isSpecialIndividualsSlot) {
                      setIndividualCounts((prev) => ({
                        ...prev,
                        [slotKey]: prev[slotKey] ? prev[slotKey] : 1
                      }));
                    }
                    push("Slot selected ✓");
                  };

                  return (
                    <div
                      key={`${slot.courtId}-${slot.startDateTime}`}
                      role="button"
                      tabIndex={isAvailable ? 0 : -1}
                      onClick={handleSelect}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelect();
                        }
                      }}
                      className={`rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                        isSelected ? "border-accent/60 bg-accent/10" : "border-white/10 bg-white/5"
                      } ${isAvailable ? "hover:bg-white/10" : "opacity-50"}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">
                          {DateTime.fromISO(slot.startDateTime).toFormat("HH:mm")}–{DateTime.fromISO(slot.endDateTime).toFormat("HH:mm")}
                        </p>
                        {isSelected ? <span className="text-xs text-accent">Selected</span> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <Badge
                          tone={
                            slot.isSpecialIndividualsSlot
                              ? "warning"
                              : slot.state === "available"
                              ? "success"
                              : slot.state === "held"
                              ? "warning"
                              : "neutral"
                          }
                        >
                          {badge}
                        </Badge>
                        <span className="text-muted">Court {slot.courtId}</span>
                        <span className="text-muted">ZAR {slot.price}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted">{isSelected ? "Selected" : "Tap to select"}</span>
                        {slot.isSpecialIndividualsSlot ? (
                          <div className="flex items-center justify-between rounded-lg border border-fuchsia-300/30 bg-fuchsia-500/10 px-2 py-1 text-xs text-fuchsia-100">
                            <span>Available: {availableIndividuals}/10</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="h-6 w-6 rounded-full border border-fuchsia-300/30 text-sm disabled:opacity-50"
                                disabled={!isSlotSelected}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setIndividualCounts((prev) => ({
                                    ...prev,
                                    [slotKey]: Math.max(1, (prev[slotKey] ?? 1) - 1)
                                  }));
                                }}
                              >
                                -
                              </button>
                              <span className="w-6 text-center">{displayCount}</span>
                              <button
                                type="button"
                                className="h-6 w-6 rounded-full border border-fuchsia-300/30 text-sm disabled:opacity-50"
                                disabled={!isSlotSelected}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setIndividualCounts((prev) => ({
                                    ...prev,
                                    [slotKey]: Math.min(10, (prev[slotKey] ?? 1) + 1)
                                  }));
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </Card>
      </div>

      <aside className="grid gap-4">
        <Card className="sticky top-20 grid gap-4">
          <div>
            <h3 className="text-lg font-semibold">Booking details</h3>
            <p className="text-xs text-muted">A verification code will be sent to your phone to confirm your booking.</p>
          </div>

          {bookingSummary ? (
            <div className="grid gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
              <p><span className="text-muted">Date:</span> {bookingSummary.date}</p>
              <p><span className="text-muted">Time:</span> {bookingSummary.time}</p>
              <p><span className="text-muted">Court:</span> {bookingSummary.court}</p>
              {selectedSlot?.isSpecialIndividualsSlot ? (
                <p><span className="text-muted">Tickets:</span> {selectedIndividualTotal} × R{INDIVIDUAL_SLOT_PRICE}</p>
              ) : null}
              <p><span className="text-muted">Total:</span> {bookingSummary.price}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-muted">
              Select a slot to see booking summary.
            </div>
          )}

          {selectedSlot && minutesToStart !== null && minutesToStart <= 15 && minutesToStart > 0 ? (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100">
              This slot starts in {minutesToStart} minutes — you can still book it if vacant.
            </div>
          ) : null}

          {selectedSlot?.isSpecialIndividualsSlot ? (
            <div className="rounded-xl border border-fuchsia-300/40 bg-fuchsia-500/10 p-3 text-xs text-fuchsia-100">
              Individuals Slot (Court 4, 17:00–18:00) — R{INDIVIDUAL_SLOT_PRICE} per person. Select how many individuals are booking (max 10).
            </div>
          ) : null}

          <div className="grid gap-3">
            <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label="Surname" value={surname} onChange={(e) => setSurname(e.target.value)} />
            <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Telephone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Button onClick={sendCode} disabled={!canSendCode || !selectedSlot}>
              {otpSent ? "Resend code" : "Send code"}
            </Button>
            {otpSent ? (
              <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                <p className="text-xs text-muted">Code sent to {maskPhone(phone)}</p>
                {demoOtp ? <p className="text-xs text-emerald-200">Demo code: {demoOtp}</p> : null}
                <OtpInput value={otpCode} onChange={setOtpCode} />
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>{otpExpiresAt ? `Expires at ${toTz(otpExpiresAt).toFormat("HH:mm")}` : null}</span>
                  <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : ""}</span>
                </div>
                <Button onClick={verifyCode} disabled={otpCode.length !== 6}>Confirm booking</Button>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-muted">
            Cancellation is available up to 24 hours before start time.
          </div>
        </Card>
      </aside>
    </div>
  );
}
