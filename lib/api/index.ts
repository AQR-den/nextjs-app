import { apiClient as backendClient } from "@/lib/api/client";
import { mockApi } from "@/lib/api/mock";

const useMock = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").toLowerCase() === "mock" ||
  String(process.env.NEXT_PUBLIC_USE_MOCK || "false") === "true";

export const api = useMock
  ? {
      getAvailability: mockApi.getAvailability,
      getAvailabilitySummary: mockApi.getAvailabilitySummary,
      initiateBooking: mockApi.initiateBooking,
      verifyBooking: mockApi.verifyBooking,
      initiateCancellation: mockApi.initiateCancellation,
      verifyCancellation: mockApi.verifyCancellation,
      initiateLookup: mockApi.initiateLookup,
      verifyLookup: mockApi.verifyLookup
    }
  : {
      getAvailability: backendClient.getAvailability,
      getAvailabilitySummary: backendClient.getAvailabilitySummary,
      initiateBooking: backendClient.initiateBooking,
      verifyBooking: backendClient.verifyBooking,
      initiateCancellation: backendClient.initiateCancellation,
      verifyCancellation: backendClient.verifyCancellation,
      initiateLookup: backendClient.initiateLookup,
      verifyLookup: backendClient.verifyLookup
    };
