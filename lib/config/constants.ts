import { Court } from "@/lib/types/domain";

export const TIMEZONE = "Africa/Johannesburg";
export const CURRENCY = "ZAR";
export const SLOT_DURATION_HOURS = 1;
export const BASE_SLOT_PRICE = 700;
export const INDIVIDUAL_SLOT_PRICE = 80;

export const COURTS: Court[] = [
  { id: 1, name: "Court 1", features: ["LED Lighting", "Night Sessions"], hourlyRate: BASE_SLOT_PRICE },
  { id: 2, name: "Court 2", features: ["Pro Surface", "Shaded Seating"], hourlyRate: BASE_SLOT_PRICE },
  { id: 3, name: "Court 3", features: ["Training Net", "Ball Machine"], hourlyRate: BASE_SLOT_PRICE },
  { id: 4, name: "Court 4", features: ["Premium Turf", "Individuals Slot 17:00"], hourlyRate: BASE_SLOT_PRICE }
];

export const SPECIAL_SLOT = {
  courtId: 4,
  startHour: 17,
  endHour: 18,
  label: "Individuals Slot",
  price: INDIVIDUAL_SLOT_PRICE
};

export const BUSINESS_HOURS = {
  opensAtHour: 12,
  closesAtHour: 22
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";
