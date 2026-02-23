export type BookingStatus = "pending_verification" | "confirmed" | "cancelled" | "expired_hold";
export type PaymentStatus =
  | "payment_pending"
  | "paid"
  | "failed"
  | "expired"
  | "refunded"
  | "credited";
export type SlotState =
  | "available"
  | "booked"
  | "pending_payment"
  | "individuals_slot"
  | "unavailable"
  | "held";
export type RefundOption = "refund" | "wallet";
export type WalletTransactionType = "refund" | "booking_payment" | "credit";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  walletBalance: number;
}

export interface Court {
  id: number;
  name: string;
  features: string[];
  hourlyRate: number;
}

export interface Slot {
  courtId: number;
  startDateTime: string;
  endDateTime: string;
  isSpecialIndividualsSlot: boolean;
  state: SlotState;
  price: number;
}

export interface Booking {
  id: string;
  reference: string;
  userId: string;
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  courtId: number;
  startDateTime: string;
  endDateTime: string;
  status: BookingStatus;
  createdAt: string;
  cancellationDeadline: string;
  holdExpiresAt?: string;
  demoScenario?: "standard_cancellable" | "standard_locked" | "individual_paid";
}

export interface Payment {
  id: string;
  bookingId: string;
  status: PaymentStatus;
  amount: number;
  currency: "ZAR";
  dueAt?: string;
  paidAt?: string;
  providerRef?: string;
  method?: "card" | "wallet";
}

export interface WalletTransaction {
  id: string;
  userId: string;
  amount: number;
  type: WalletTransactionType;
  bookingId?: string;
  createdAt: string;
  description: string;
}

export interface BookingWithRelations {
  booking: Booking;
  court: Court;
  payment?: Payment;
  cancellationAllowed: boolean;
  cancellationReason?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface WalletResponse {
  walletBalance: number;
  transactions: WalletTransaction[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
