import { DateTime } from "luxon";
import { TIMEZONE } from "@/lib/config/constants";

export function nowInTz() {
  return DateTime.now().setZone(TIMEZONE);
}

export function toTz(dateIso: string) {
  return DateTime.fromISO(dateIso, { zone: TIMEZONE });
}

export function formatSlot(iso: string) {
  return toTz(iso).toFormat("EEE, dd LLL • HH:mm");
}

export function formatDate(iso: string) {
  return toTz(iso).toFormat("cccc, dd LLLL yyyy");
}

export function getDateParam(date?: DateTime) {
  return (date || nowInTz()).toFormat("yyyy-LL-dd");
}

export function isMoreThan24hAway(startIso: string, fromIso?: string) {
  const start = toTz(startIso);
  const base = fromIso ? toTz(fromIso) : nowInTz();
  return start.diff(base, "hours").hours > 24;
}

export function paymentDeadline(startIso: string) {
  return toTz(startIso).minus({ hours: 24 });
}

export function cancellationDeadline(startIso: string) {
  return toTz(startIso).minus({ hours: 24 });
}

export function isPast(iso: string) {
  return toTz(iso) <= nowInTz();
}

export function countdownText(targetIso: string) {
  const diff = toTz(targetIso).diff(nowInTz(), ["hours", "minutes", "seconds"]);
  if (diff.toMillis() <= 0) {
    return "00:00:00";
  }

  const hours = Math.floor(diff.hours).toString().padStart(2, "0");
  const minutes = Math.floor(diff.minutes).toString().padStart(2, "0");
  const seconds = Math.floor(diff.seconds).toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
