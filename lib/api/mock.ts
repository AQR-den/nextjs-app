import { DateTime } from "luxon";
import { Slot, BookingWithRelations, Booking, Court } from "@/lib/types/domain";
import { COURTS, BASE_SLOT_PRICE, INDIVIDUAL_SLOT_PRICE, BUSINESS_HOURS } from "@/lib/config/constants";
import { TIMEZONE } from "@/lib/config/constants";

const STORAGE_KEY = "tekkerz_mock_state";
const OTP_TTL_MINUTES = 10;
const HOLD_MINUTES = 5;

type Verification = {
  id: string;
  bookingId: string;
  phone: string;
  code: string;
  otpExpiresAt: string;
  attempts: number;
  lastSentAt: string;
  type: "confirm_booking" | "cancel_booking" | "lookup";
};

type MockState = {
  bookings: Booking[];
  verifications: Verification[];
};

const defaultState: MockState = {
  bookings: [],
  verifications: []
};

function now() {
  return DateTime.now().setZone(TIMEZONE);
}

function loadState(): MockState {
  if (typeof window === "undefined") return defaultState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState;
  try {
    return JSON.parse(raw) as MockState;
  } catch {
    return defaultState;
  }
}

function saveState(state: MockState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isHeldActive(booking: Booking) {
  if (!booking.holdExpiresAt) return false;
  return DateTime.fromISO(booking.holdExpiresAt, { zone: TIMEZONE }) > now();
}

function courtById(id: number): Court {
  return COURTS.find((court) => court.id === id)!;
}

function serialize(booking: Booking): BookingWithRelations {
  return {
    booking,
    court: courtById(booking.courtId),
    payment: undefined,
    cancellationAllowed:
      (DateTime.fromISO(booking.startDateTime, { zone: TIMEZONE }).diff(now(), "hours").hours > 24) &&
      booking.status === "confirmed",
    cancellationReason: undefined
  };
}

function cleanExpiredHolds(state: MockState) {
  state.bookings = state.bookings.map((booking) => {
    if (booking.status === "pending_verification" && booking.holdExpiresAt && !isHeldActive(booking)) {
      return { ...booking, status: "expired_hold" };
    }
    return booking;
  });
}

export const mockApi = {
  getAvailabilitySummary(month: string) {
    const state = loadState();
    cleanExpiredHolds(state);
    saveState(state);
    const target = DateTime.fromFormat(month, "yyyy-MM", { zone: TIMEZONE });
    const start = target.startOf("month");
    const days = [] as Array<{ date: string; available: number; total: number; status: "available" | "partial" | "full" }>;
    const totalSlots = (BUSINESS_HOURS.closesAtHour - BUSINESS_HOURS.opensAtHour) * COURTS.length;

    const daysInMonth = target.daysInMonth ?? start.daysInMonth ?? 30;
    for (let i = 0; i < daysInMonth; i += 1) {
      const date = start.plus({ days: i });
      let available = 0;
      for (const court of COURTS) {
        for (let hour = BUSINESS_HOURS.opensAtHour; hour < BUSINESS_HOURS.closesAtHour; hour += 1) {
          const slotStart = date.set({ hour, minute: 0, second: 0, millisecond: 0 });
          if (slotStart <= now()) continue;
          const conflict = state.bookings.find(
            (b) =>
              b.courtId === court.id &&
              b.startDateTime === slotStart.toISO() &&
              (b.status === "confirmed" || b.status === "pending_verification")
          );
          if (!conflict || (conflict.status === "pending_verification" && !isHeldActive(conflict))) {
            available += 1;
          }
        }
      }
      const status = available === 0 ? "full" : available >= totalSlots * 0.6 ? "available" : "partial";
      days.push({ date: date.toFormat("yyyy-LL-dd"), available, total: totalSlots, status });
    }
    return Promise.resolve({ days });
  },

  getAvailability(date: string) {
    const state = loadState();
    cleanExpiredHolds(state);
    saveState(state);
    const target = DateTime.fromFormat(date, "yyyy-MM-dd", { zone: TIMEZONE });
    const slots: Slot[] = [];

    for (const court of COURTS) {
      for (let hour = BUSINESS_HOURS.opensAtHour; hour < BUSINESS_HOURS.closesAtHour; hour += 1) {
        const start = target.set({ hour, minute: 0, second: 0, millisecond: 0 });
        const end = start.plus({ hours: 1 });
        const isSpecial = court.id === 4 && start.hour === 17 && start.minute === 0;
        const past = start <= now();
        const booking = state.bookings.find(
          (b) => b.courtId === court.id && b.startDateTime === start.toISO() && b.status === "confirmed"
        );
        const held = state.bookings.find(
          (b) => b.courtId === court.id && b.startDateTime === start.toISO() && b.status === "pending_verification"
        );

        let stateLabel: Slot["state"] = "available";
        if (past) stateLabel = "unavailable";
        else if (booking) stateLabel = "booked";
        else if (held && isHeldActive(held)) stateLabel = "held";
        else if (isSpecial) stateLabel = "individuals_slot";

        slots.push({
          courtId: court.id,
          startDateTime: start.toISO(),
          endDateTime: end.toISO(),
          isSpecialIndividualsSlot: isSpecial,
          state: stateLabel,
          price: isSpecial ? INDIVIDUAL_SLOT_PRICE : BASE_SLOT_PRICE
        });
      }
    }
    return Promise.resolve({ slots });
  },

  initiateBooking(payload: {
    bookingId?: string;
    courtId: number;
    startDateTime: string;
    endDateTime: string;
    firstName: string;
    surname: string;
    email: string;
    phone: string;
  }) {
    const state = loadState();
    cleanExpiredHolds(state);

    const start = DateTime.fromISO(payload.startDateTime, { zone: TIMEZONE });
    if (start <= now()) {
      return Promise.reject(new Error("Cannot book past slots."));
    }

    if (payload.bookingId) {
      const existing = state.bookings.find((b) => b.id === payload.bookingId);
      if (!existing) return Promise.reject(new Error("Booking not found."));
      const code = generateCode();
      const verification: Verification = {
        id: `v_${Date.now()}`,
        bookingId: existing.id,
        phone: existing.phone,
        code,
        otpExpiresAt: now().plus({ minutes: OTP_TTL_MINUTES }).toISO(),
        attempts: 0,
        lastSentAt: now().toISO(),
        type: "confirm_booking"
      };
      state.verifications.push(verification);
      saveState(state);
      return Promise.resolve({ bookingId: existing.id, expiresAt: verification.otpExpiresAt, demoCode: code });
    }

    const conflict = state.bookings.find(
      (b) =>
        b.courtId === payload.courtId &&
        b.startDateTime === payload.startDateTime &&
        (b.status === "confirmed" || (b.status === "pending_verification" && isHeldActive(b)))
    );
    if (conflict) return Promise.reject(new Error("Slot is already booked or held."));

    const booking: Booking = {
      id: `b_${Date.now()}`,
      reference: `TKZ-${Date.now().toString().slice(-6)}`,
      userId: `guest_${payload.phone}`,
      firstName: payload.firstName,
      surname: payload.surname,
      email: payload.email,
      phone: payload.phone,
      courtId: payload.courtId,
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      status: "pending_verification",
      createdAt: now().toISO(),
      cancellationDeadline: start.minus({ hours: 24 }).toISO(),
      holdExpiresAt: now().plus({ minutes: HOLD_MINUTES }).toISO()
    };

    const code = generateCode();
    const verification: Verification = {
      id: `v_${Date.now()}`,
      bookingId: booking.id,
      phone: payload.phone,
      code,
      otpExpiresAt: now().plus({ minutes: OTP_TTL_MINUTES }).toISO(),
      attempts: 0,
      lastSentAt: now().toISO(),
      type: "confirm_booking"
    };

    state.bookings.push(booking);
    state.verifications.push(verification);
    saveState(state);

    return Promise.resolve({ bookingId: booking.id, expiresAt: verification.otpExpiresAt, demoCode: code });
  },

  verifyBooking(payload: { bookingId: string; code: string }) {
    const state = loadState();
    const booking = state.bookings.find((b) => b.id === payload.bookingId);
    if (!booking) return Promise.reject(new Error("Booking not found."));

    const verification = state.verifications
      .filter((v) => v.bookingId === booking.id && v.type === "confirm_booking")
      .sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime())[0];

    if (!verification) return Promise.reject(new Error("Verification not found."));
    if (DateTime.fromISO(verification.otpExpiresAt, { zone: TIMEZONE }) <= now()) {
      return Promise.reject(new Error("Verification code expired."));
    }
    if (verification.attempts >= 5) return Promise.reject(new Error("Too many attempts."));
    if (verification.code !== payload.code) {
      verification.attempts += 1;
      saveState(state);
      return Promise.reject(new Error("Incorrect verification code."));
    }

    booking.status = "confirmed";
    booking.holdExpiresAt = undefined;
    saveState(state);
    return Promise.resolve({ booking: serialize(booking) });
  },

  initiateCancellation(payload: { reference: string; phone: string }) {
    const state = loadState();
    const booking = state.bookings.find((b) => b.reference === payload.reference && b.phone === payload.phone);
    if (!booking) return Promise.reject(new Error("Booking not found."));
    if (DateTime.fromISO(booking.startDateTime, { zone: TIMEZONE }).diff(now(), "hours").hours <= 24) {
      return Promise.reject(new Error("Cancellation is only allowed more than 24h before start."));
    }
    const code = generateCode();
    const verification: Verification = {
      id: `v_${Date.now()}`,
      bookingId: booking.id,
      phone: payload.phone,
      code,
      otpExpiresAt: now().plus({ minutes: OTP_TTL_MINUTES }).toISO(),
      attempts: 0,
      lastSentAt: now().toISO(),
      type: "cancel_booking"
    };
    state.verifications.push(verification);
    saveState(state);
    return Promise.resolve({ bookingId: booking.id, expiresAt: verification.otpExpiresAt, demoCode: code });
  },

  verifyCancellation(payload: { bookingId: string; code: string }) {
    const state = loadState();
    const booking = state.bookings.find((b) => b.id === payload.bookingId);
    if (!booking) return Promise.reject(new Error("Booking not found."));

    const verification = state.verifications
      .filter((v) => v.bookingId === booking.id && v.type === "cancel_booking")
      .sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime())[0];

    if (!verification) return Promise.reject(new Error("Verification not found."));
    if (DateTime.fromISO(verification.otpExpiresAt, { zone: TIMEZONE }) <= now()) {
      return Promise.reject(new Error("Verification code expired."));
    }
    if (verification.attempts >= 5) return Promise.reject(new Error("Too many attempts."));
    if (verification.code !== payload.code) {
      verification.attempts += 1;
      saveState(state);
      return Promise.reject(new Error("Incorrect verification code."));
    }

    booking.status = "cancelled";
    saveState(state);
    return Promise.resolve({ booking: serialize(booking) });
  },

  initiateLookup(payload: { phone: string }) {
    const state = loadState();
    const code = generateCode();
    const verification: Verification = {
      id: `v_${Date.now()}`,
      bookingId: `lookup_${payload.phone}`,
      phone: payload.phone,
      code,
      otpExpiresAt: now().plus({ minutes: OTP_TTL_MINUTES }).toISO(),
      attempts: 0,
      lastSentAt: now().toISO(),
      type: "lookup"
    };
    state.verifications.push(verification);
    saveState(state);
    return Promise.resolve({ expiresAt: verification.otpExpiresAt, demoCode: code });
  },

  verifyLookup(payload: { phone: string; code: string }) {
    const state = loadState();
    const verification = state.verifications
      .filter((v) => v.phone === payload.phone && v.type === "lookup")
      .sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime())[0];
    if (!verification) return Promise.reject(new Error("Verification not found."));
    if (DateTime.fromISO(verification.otpExpiresAt, { zone: TIMEZONE }) <= now()) {
      return Promise.reject(new Error("Verification code expired."));
    }
    if (verification.code !== payload.code) {
      verification.attempts += 1;
      saveState(state);
      return Promise.reject(new Error("Incorrect verification code."));
    }

    const bookings = state.bookings
      .filter((b) => b.phone === payload.phone && b.status === "confirmed")
      .filter((b) => DateTime.fromISO(b.startDateTime, { zone: TIMEZONE }) >= now())
      .map(serialize);
    return Promise.resolve({ bookings });
  }
};
