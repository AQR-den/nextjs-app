import { z } from "zod";
import { API_BASE_URL } from "@/lib/config/constants";
import { AuthResponse, BookingWithRelations, Court, RefundOption, Slot, WalletResponse } from "@/lib/types/domain";

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  })
});

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const maybeJson = await response.json().catch(() => null);
    const parsed = errorSchema.safeParse(maybeJson);
    throw new Error(parsed.success ? parsed.data.error.message : "Request failed");
  }

  return response.json();
}

export const apiClient = {
  getCourts: () => request<{ courts: Court[] }>("/courts"),
  getAvailability: (date: string, courtId?: number) =>
    request<{ slots: Slot[] }>(`/availability?date=${date}${courtId ? `&courtId=${courtId}` : ""}`),
  getAvailabilitySummary: (month: string) =>
    request<{ days: { date: string; available: number; total: number; status: "available" | "partial" | "full" }[] }>(
      `/availability/summary?month=${month}`
    ),
  signIn: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/sign-in", { method: "POST", body: JSON.stringify(payload) }),
  signUp: (payload: { name: string; email: string; phone?: string; password: string }) =>
    request<AuthResponse>("/auth/sign-up", { method: "POST", body: JSON.stringify(payload) }),
  forgotPassword: (payload: { email: string }) =>
    request<{ ok: boolean; message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  me: (token: string) => request<{ user: AuthResponse["user"] }>("/auth/me", undefined, token),
  getWallet: (token: string) => request<WalletResponse>("/wallet/me", undefined, token),
  createBooking: (
    token: string,
    payload: {
      courtId: number;
      startDateTime: string;
      endDateTime: string;
      idempotencyKey: string;
      payImmediately?: boolean;
      paymentMethod?: "card" | "wallet";
    }
  ) =>
    request<{ booking: BookingWithRelations; paymentAnimation?: boolean }>(
      "/bookings",
      {
        method: "POST",
        headers: { "Idempotency-Key": payload.idempotencyKey },
        body: JSON.stringify(payload)
      },
      token
    ),
  initiateBooking: (payload: {
    bookingId?: string;
    courtId: number;
    startDateTime: string;
    endDateTime: string;
    firstName: string;
    surname: string;
    email: string;
    phone: string;
  }) =>
    request<{ bookingId: string; expiresAt: string; demoCode?: string }>(
      "/bookings/initiate",
      { method: "POST", body: JSON.stringify(payload) }
    ),
  verifyBooking: (payload: { bookingId: string; code: string }) =>
    request<{ booking: BookingWithRelations }>("/bookings/verify", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  initiateCancellation: (payload: { reference: string; phone: string }) =>
    request<{ bookingId: string; expiresAt: string; demoCode?: string }>("/bookings/cancel/initiate", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  verifyCancellation: (payload: { bookingId: string; code: string }) =>
    request<{ booking: BookingWithRelations }>("/bookings/cancel/verify", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  initiateLookup: (payload: { phone: string }) =>
    request<{ expiresAt: string; demoCode?: string }>("/bookings/lookup/initiate", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  verifyLookup: (payload: { phone: string; code: string }) =>
    request<{ bookings: BookingWithRelations[] }>("/bookings/lookup/verify", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getMyBookings: (token: string) => request<{ bookings: BookingWithRelations[] }>("/bookings/me", undefined, token),
  cancelBooking: (token: string, bookingId: string, refundOption: RefundOption) =>
    request<{ booking: BookingWithRelations; refundStatus: "refunded" | "credited" | "none" }>(
      `/bookings/${bookingId}/cancel`,
      { method: "POST", body: JSON.stringify({ refundOption }) },
      token
    ),
  payBooking: (token: string, bookingId: string) =>
    request<{ paymentUrl: string; booking: BookingWithRelations }>(`/bookings/${bookingId}/pay`, { method: "POST" }, token),
  getAdminBookings: (token: string) => request<{ bookings: BookingWithRelations[] }>("/admin/bookings", undefined, token),
  resetDemo: () => request<{ ok: boolean; users: number; bookings: number }>("/demo/reset", { method: "POST" })
};
