import { BookingWithRelations } from "@/lib/types/domain";

export function splitBookings(bookings: BookingWithRelations[]) {
  const now = new Date();
  const upcoming = bookings.filter((b) => new Date(b.booking.startDateTime) >= now);
  const past = bookings.filter((b) => new Date(b.booking.startDateTime) < now);
  return { upcoming, past };
}
