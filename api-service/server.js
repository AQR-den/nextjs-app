const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { DateTime } = require("luxon");
const { z } = require("zod");
const { Pool } = require("pg");

const app = express();
const PORT = Number(process.env.API_PORT || 4000);
const TZ = process.env.APP_TIMEZONE || "Africa/Johannesburg";
const CURRENCY = "ZAR";
const BASE_PRICE = 700;
const INDIVIDUAL_PRICE = 80;
const SCHEDULE_START_HOUR = 12;
const SCHEDULE_END_HOUR = 22;
const USE_POSTGRES = Boolean(process.env.DATABASE_URL);
const DEMO_MODE = String(process.env.DEMO_MODE || "true") === "true";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "DemoPass123!";
const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 45;
const OTP_MAX_ATTEMPTS = 5;
const HOLD_MINUTES = 5;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const courts = [
  { id: 1, name: "Court 1", features: ["LED Lighting", "Night Sessions"], hourlyRate: BASE_PRICE },
  { id: 2, name: "Court 2", features: ["Pro Surface", "Shaded Seating"], hourlyRate: BASE_PRICE },
  { id: 3, name: "Court 3", features: ["Training Net", "Ball Machine"], hourlyRate: BASE_PRICE },
  { id: 4, name: "Court 4", features: ["Premium Turf", "Individual Slot 17:00"], hourlyRate: BASE_PRICE }
];

const state = {
  users: [],
  bookings: [],
  payments: [],
  walletTransactions: [],
  notifications: [],
  idempotency: {},
  verifications: []
};

let pool = null;
let persistTimer = null;

function now() {
  return DateTime.now().setZone(TZ);
}

function isSpecialSlot(start, courtId) {
  return courtId === 4 && start.hour === 17 && start.minute === 0;
}

function slotPrice(start, courtId) {
  return isSpecialSlot(start, courtId) ? INDIVIDUAL_PRICE : BASE_PRICE;
}

function cancellationDeadline(startIso) {
  return DateTime.fromISO(startIso, { zone: TZ }).minus({ hours: 24 }).toISO();
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(code, salt) {
  return crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

function maskPhone(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  const last = digits.slice(-4);
  return `+${digits.slice(0, 2)} ** *** ${last}`;
}

function createVerification({ bookingId, phone, type }) {
  const nowIso = now().toISO();
  const salt = crypto.randomBytes(8).toString("hex");
  const code = generateOtp();
  const record = {
    id: `v_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    bookingId,
    phone,
    type,
    otpHash: hashOtp(code, salt),
    otpSalt: salt,
    otpExpiresAt: now().plus({ minutes: OTP_TTL_MINUTES }).toISO(),
    attempts: 0,
    lastSentAt: nowIso
  };
  state.verifications.push(record);
  schedulePersist();
  return { record, code };
}

function canResendOtp(existing) {
  if (!existing?.lastSentAt) return true;
  const diff = now().diff(DateTime.fromISO(existing.lastSentAt), "seconds").seconds;
  return diff >= OTP_RESEND_COOLDOWN_SECONDS;
}

function verificationExpired(record) {
  return DateTime.fromISO(record.otpExpiresAt, { zone: TZ }) <= now();
}

function createToken(userId) {
  return Buffer.from(`uid:${userId}`).toString("base64");
}

function decodeToken(token) {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const id = decoded.replace("uid:", "");
    return state.users.find((user) => user.id === id) || null;
  } catch {
    return null;
  }
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    walletBalance: user.walletBalance || 0,
    role: user.role
  };
}

function schedulePersist() {
  if (!USE_POSTGRES || !pool) return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    try {
      await pool.query(
        `INSERT INTO app_state (id, data, updated_at)
         VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [JSON.stringify(state)]
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("State persist failed", error.message);
    }
  }, 50);
}

async function initState() {
  if (!USE_POSTGRES) {
    seedData();
    return;
  }

  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const result = await pool.query("SELECT data FROM app_state WHERE id = 1");
  if (!result.rowCount) {
    seedData();
    await pool.query("INSERT INTO app_state (id, data) VALUES (1, $1::jsonb)", [JSON.stringify(state)]);
    return;
  }

  const dbState = result.rows[0].data;
  state.users = dbState.users || [];
  state.bookings = dbState.bookings || [];
  state.payments = dbState.payments || [];
  state.walletTransactions = dbState.walletTransactions || [];
  state.notifications = dbState.notifications || [];
  state.idempotency = dbState.idempotency || {};
  state.verifications = dbState.verifications || [];
}

function notifyUser({ user, booking, type, message }) {
  const providers = ["whatsapp", "telegram"];
  for (const channel of providers) {
    const record = {
      id: `n_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId: user.id,
      bookingId: booking?.id,
      channel,
      type,
      message,
      status: "delivered",
      createdAt: now().toISO()
    };

    if (channel === "whatsapp" && process.env.WHATSAPP_PROVIDER === "mock") {
      record.status = "mocked";
    }
    if (channel === "telegram" && process.env.TELEGRAM_BOT_TOKEN ? false : true) {
      record.status = "mocked";
    }

    state.notifications.push(record);
  }
  schedulePersist();
}

function addWalletTransaction({ userId, amount, type, bookingId, description }) {
  const user = state.users.find((entry) => entry.id === userId);
  if (!user) return;

  state.walletTransactions.push({
    id: `wt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId,
    amount,
    type,
    bookingId,
    description,
    createdAt: now().toISO()
  });

  if (type === "credit" || type === "booking_payment") {
    user.walletBalance += amount;
  }

  schedulePersist();
}

function processLifecycle() {
  const current = now();

  for (const booking of state.bookings) {
    if (booking.status === "pending_verification" && booking.holdExpiresAt) {
      const holdExpiry = DateTime.fromISO(booking.holdExpiresAt, { zone: TZ });
      if (current >= holdExpiry) {
        booking.status = "expired_hold";
        schedulePersist();
      }
      continue;
    }

    if (booking.status !== "booked" && booking.status !== "confirmed") continue;

    const start = DateTime.fromISO(booking.startDateTime, { zone: TZ });
    const reminderThreshold = start.minus({ hours: 24 });
    if (!booking.reminderSent && current >= reminderThreshold && current < start) {
      const user = state.users.find((entry) => entry.id === booking.userId);
      if (user) {
        notifyUser({
          user,
          booking,
          type: "reminder_24h",
          message: `Reminder: ${booking.reference} starts in less than 24h on ${start.toFormat("dd LLL HH:mm")}.`
        });
      }
      booking.reminderSent = true;
      schedulePersist();
    }
  }
}

function serializeBooking(booking) {
  const court = courts.find((item) => item.id === booking.courtId);
  const payment = state.payments.find((item) => item.bookingId === booking.id);
  const start = DateTime.fromISO(booking.startDateTime, { zone: TZ });
  const cancellationAllowed =
    (booking.manualCancellationOverride || start.diff(now(), "hours").hours > 24) &&
    (booking.status === "booked" || booking.status === "confirmed");

  return {
    booking,
    court,
    payment,
    cancellationAllowed,
    cancellationReason: cancellationAllowed
      ? undefined
      : "Cancellation disabled within 24 hours of start time."
  };
}

function error(res, status, code, message, details) {
  return res.status(status).json({ error: { code, message, details } });
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  const user = decodeToken(token);
  if (!user) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
  }
  req.user = user;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return error(res, 403, "FORBIDDEN", "Admin access required");
  }
  next();
}

function resetState() {
  state.users = [];
  state.bookings = [];
  state.payments = [];
  state.walletTransactions = [];
  state.notifications = [];
  state.idempotency = {};
  state.verifications = [];
}

function nextSlotWithin(hoursAhead) {
  let slot = now().plus({ hours: 4 }).set({ minute: 0, second: 0, millisecond: 0 });
  for (let i = 0; i < hoursAhead; i += 1) {
    if (slot > now() && slot.hour >= SCHEDULE_START_HOUR && slot.hour < SCHEDULE_END_HOUR) {
      return slot;
    }
    slot = slot.plus({ hours: 1 });
  }
  return now().plus({ hours: 6 }).set({ minute: 0, second: 0, millisecond: 0 });
}

function seedDemoData() {
  const demoCourtUser = {
    id: "u_demo_court",
    name: "Demo Court Booker",
    email: "demo.court@tekkerz.test",
    phone: "+27715550102",
    password: DEMO_PASSWORD,
    role: "member",
    walletBalance: 120
  };

  const demoIndividualUser = {
    id: "u_demo_individual",
    name: "Demo Individual Booker",
    email: "demo.individual@tekkerz.test",
    phone: "+27715550103",
    password: DEMO_PASSWORD,
    role: "member",
    walletBalance: 180
  };

  state.users.push(demoCourtUser, demoIndividualUser);

  state.walletTransactions.push(
    {
      id: "wt_seed_court",
      userId: demoCourtUser.id,
      amount: 120,
      type: "credit",
      description: "Demo wallet credit",
      createdAt: now().toISO()
    },
    {
      id: "wt_seed_individual",
      userId: demoIndividualUser.id,
      amount: 180,
      type: "credit",
      description: "Demo wallet credit",
      createdAt: now().toISO()
    }
  );

  const cancellableStandard = now().plus({ days: 3 }).startOf("day").set({ hour: 18 });
  const nonCancellableStandard = nextSlotWithin(22);

  const standardBookingCancellable = (user, suffix, courtId) => ({
    id: `b_seed_standard_future_${suffix}`,
    reference: `TKZ-DEMO-COURT-${suffix}01`,
    userId: user.id,
    firstName: user.name.split(" ")[0] || "Demo",
    surname: user.name.split(" ").slice(1).join(" ") || "User",
    email: user.email,
    phone: user.phone,
    courtId,
    startDateTime: cancellableStandard.toISO(),
    endDateTime: cancellableStandard.plus({ hours: 1 }).toISO(),
    status: "confirmed",
    createdAt: now().toISO(),
    cancellationDeadline: cancellationDeadline(cancellableStandard.toISO()),
    reminderSent: false,
    manualCancellationOverride: false,
    demoScenario: "standard_cancellable"
  });

  const standardBookingLocked = (user, suffix, courtId) => ({
    id: `b_seed_standard_near_${suffix}`,
    reference: `TKZ-DEMO-COURT-${suffix}02`,
    userId: user.id,
    firstName: user.name.split(" ")[0] || "Demo",
    surname: user.name.split(" ").slice(1).join(" ") || "User",
    email: user.email,
    phone: user.phone,
    courtId,
    startDateTime: nonCancellableStandard.toISO(),
    endDateTime: nonCancellableStandard.plus({ hours: 1 }).toISO(),
    status: "confirmed",
    createdAt: now().toISO(),
    cancellationDeadline: cancellationDeadline(nonCancellableStandard.toISO()),
    reminderSent: false,
    manualCancellationOverride: false,
    demoScenario: "standard_locked"
  });

  const individualStart = now().plus({ days: 4 }).startOf("day").set({ hour: 17 });
  const individualBooking = {
    id: "b_seed_individual_paid",
    reference: "TKZ-DEMO-IND-01",
    userId: demoIndividualUser.id,
    firstName: demoIndividualUser.name.split(" ")[0] || "Demo",
    surname: demoIndividualUser.name.split(" ").slice(1).join(" ") || "User",
    email: demoIndividualUser.email,
    phone: demoIndividualUser.phone,
    courtId: 4,
    startDateTime: individualStart.toISO(),
    endDateTime: individualStart.plus({ hours: 1 }).toISO(),
    status: "confirmed",
    createdAt: now().toISO(),
    cancellationDeadline: cancellationDeadline(individualStart.toISO()),
    reminderSent: false,
    manualCancellationOverride: false
  };

  const courtStandardFuture = standardBookingCancellable(demoCourtUser, "A", 2);
  const courtStandardLocked = standardBookingLocked(demoCourtUser, "A", 1);
  const individualStandardFuture = standardBookingCancellable(demoIndividualUser, "B", 3);
  const individualStandardLocked = standardBookingLocked(demoIndividualUser, "B", 2);

  state.bookings.push(
    courtStandardFuture,
    courtStandardLocked,
    individualStandardFuture,
    individualStandardLocked,
    individualBooking
  );

  state.payments.push(
    {
      id: "p_seed_standard_future_a",
      bookingId: courtStandardFuture.id,
      status: "payment_pending",
      amount: BASE_PRICE,
      currency: CURRENCY,
      dueAt: cancellableStandard.toISO(),
      method: "card"
    },
    {
      id: "p_seed_standard_near_a",
      bookingId: courtStandardLocked.id,
      status: "payment_pending",
      amount: BASE_PRICE,
      currency: CURRENCY,
      dueAt: nonCancellableStandard.toISO(),
      method: "card"
    },
    {
      id: "p_seed_standard_future_b",
      bookingId: individualStandardFuture.id,
      status: "payment_pending",
      amount: BASE_PRICE,
      currency: CURRENCY,
      dueAt: cancellableStandard.toISO(),
      method: "card"
    },
    {
      id: "p_seed_standard_near_b",
      bookingId: individualStandardLocked.id,
      status: "payment_pending",
      amount: BASE_PRICE,
      currency: CURRENCY,
      dueAt: nonCancellableStandard.toISO(),
      method: "card"
    },
    {
      id: "p_seed_individual_paid",
      bookingId: individualBooking.id,
      status: "paid",
      amount: INDIVIDUAL_PRICE,
      currency: CURRENCY,
      dueAt: individualStart.toISO(),
      paidAt: now().toISO(),
      method: "card",
      providerRef: "MOCK-DEMO-PAID"
    }
  );
}

function seedData() {
  if (!DEMO_MODE) return;
  seedDemoData();
}

const signInSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const signUpSchema = z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().optional(), password: z.string().min(8) });
const bookingSchema = z.object({
  courtId: z.number().int().min(1).max(4),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  idempotencyKey: z.string().min(8),
  payImmediately: z.boolean().optional(),
  paymentMethod: z.enum(["card", "wallet"]).optional()
});
const cancelSchema = z.object({ refundOption: z.enum(["refund", "wallet"]).default("wallet") });
const phoneSchema = z.string().regex(/^\+?\d{10,15}$/, "Phone number must include country code and digits only.");
const initiateBookingSchema = z.object({
  bookingId: z.string().min(3).optional(),
  courtId: z.number().int().min(1).max(4),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  firstName: z.string().min(2),
  surname: z.string().min(2),
  email: z.string().email(),
  phone: phoneSchema
});
const verifyBookingSchema = z.object({
  bookingId: z.string().min(3),
  code: z.string().regex(/^\d{6}$/)
});
const cancelInitiateSchema = z.object({
  reference: z.string().min(4),
  phone: phoneSchema
});
const lookupInitiateSchema = z.object({
  phone: phoneSchema
});

app.use((_req, _res, next) => {
  processLifecycle();
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "tekkerz-api", postgres: USE_POSTGRES });
});

app.post("/api/demo/reset", (_req, res) => {
  if (!DEMO_MODE) {
    return error(res, 403, "DEMO_DISABLED", "Demo mode is disabled.");
  }

  resetState();
  seedDemoData();
  schedulePersist();
  return res.json({ ok: true, users: state.users.length, bookings: state.bookings.length });
});

app.post("/api/auth/sign-in", (req, res) => {
  const parsed = signInSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 422, "VALIDATION_ERROR", "Invalid sign in payload", parsed.error.flatten());
  }

  const user = state.users.find((entry) => entry.email === parsed.data.email && entry.password === parsed.data.password);
  if (!user) {
    return error(res, 401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  return res.json({ token: createToken(user.id), user: publicUser(user) });
});

app.post("/api/auth/sign-up", (req, res) => {
  const parsed = signUpSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 422, "VALIDATION_ERROR", "Invalid sign up payload", parsed.error.flatten());
  }

  if (state.users.some((entry) => entry.email === parsed.data.email)) {
    return error(res, 409, "EMAIL_EXISTS", "Email already registered");
  }

  const user = {
    id: `u_${Date.now()}`,
    ...parsed.data,
    role: "member",
    walletBalance: 0
  };

  state.users.push(user);
  schedulePersist();
  return res.status(201).json({ token: createToken(user.id), user: publicUser(user) });
});

app.post("/api/auth/forgot-password", (req, res) => {
  const email = z.string().email().safeParse(req.body?.email);
  if (!email.success) {
    return error(res, 422, "VALIDATION_ERROR", "A valid email is required");
  }

  return res.json({ ok: true, message: "If the account exists, reset instructions were sent (mocked)." });
});

app.get("/api/auth/me", auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.get("/api/courts", (_req, res) => {
  res.json({ courts });
});

app.get("/api/availability/summary", (req, res) => {
  const monthParam = String(req.query.month || "");
  const month = DateTime.fromFormat(monthParam, "yyyy-MM", { zone: TZ });
  if (!month.isValid) {
    return error(res, 422, "VALIDATION_ERROR", "month must be YYYY-MM");
  }

  const startOfMonth = month.startOf("month");
  const daysInMonth = month.daysInMonth;
  const days = [];
  const totalSlotsPerDay = (SCHEDULE_END_HOUR - SCHEDULE_START_HOUR) * courts.length;

  for (let i = 0; i < daysInMonth; i += 1) {
    const day = startOfMonth.plus({ days: i });
    let available = 0;

    for (const court of courts) {
      for (let hour = SCHEDULE_START_HOUR; hour < SCHEDULE_END_HOUR; hour += 1) {
        const slotStart = day.set({ hour, minute: 0, second: 0, millisecond: 0 });
        if (slotStart <= now()) continue;

        const isBooked = state.bookings.some(
          (entry) =>
            entry.courtId === court.id &&
            entry.startDateTime === slotStart.toISO() &&
            (entry.status === "booked" || entry.status === "confirmed")
        );
        const isHeld = state.bookings.some(
          (entry) =>
            entry.courtId === court.id &&
            entry.startDateTime === slotStart.toISO() &&
            entry.status === "pending_verification" &&
            entry.holdExpiresAt &&
            DateTime.fromISO(entry.holdExpiresAt, { zone: TZ }) > now()
        );

        if (!isBooked && !isHeld) {
          available += 1;
        }
      }
    }

    const status = available === 0 ? "full" : available >= totalSlotsPerDay * 0.6 ? "available" : "partial";
    days.push({
      date: day.toFormat("yyyy-LL-dd"),
      available,
      total: totalSlotsPerDay,
      status
    });
  }

  res.json({ days });
});

app.get("/api/availability", (req, res) => {
  const date = DateTime.fromFormat(String(req.query.date || ""), "yyyy-MM-dd", { zone: TZ });
  if (!date.isValid) {
    return error(res, 422, "VALIDATION_ERROR", "date must be YYYY-MM-DD");
  }

  const requestedCourtId = req.query.courtId ? Number(req.query.courtId) : null;
  const list = [];

  for (const court of courts) {
    if (requestedCourtId && court.id !== requestedCourtId) {
      continue;
    }

    for (let hour = SCHEDULE_START_HOUR; hour < SCHEDULE_END_HOUR; hour += 1) {
      const start = date.set({ hour, minute: 0, second: 0, millisecond: 0 });
      const end = start.plus({ hours: 1 });
      const special = isSpecialSlot(start, court.id);

      const activeBooking = state.bookings.find(
        (entry) =>
          entry.courtId === court.id &&
          entry.startDateTime === start.toISO() &&
          (entry.status === "booked" || entry.status === "confirmed")
      );
      const heldBooking = state.bookings.find(
        (entry) =>
          entry.courtId === court.id &&
          entry.startDateTime === start.toISO() &&
          entry.status === "pending_verification" &&
          entry.holdExpiresAt &&
          DateTime.fromISO(entry.holdExpiresAt, { zone: TZ }) > now()
      );
      const payment = activeBooking ? state.payments.find((item) => item.bookingId === activeBooking.id) : null;
      const past = start <= now();

      let slotState = "available";
      if (past) {
        slotState = "unavailable";
      } else if (heldBooking) {
        slotState = "held";
      } else if (activeBooking && payment && payment.status === "payment_pending") {
        slotState = "pending_payment";
      } else if (activeBooking) {
        slotState = "booked";
      } else if (special) {
        slotState = "individuals_slot";
      }

      list.push({
        courtId: court.id,
        startDateTime: start.toISO(),
        endDateTime: end.toISO(),
        isSpecialIndividualsSlot: special,
        state: slotState,
        price: slotPrice(start, court.id)
      });
    }
  }

  res.json({ slots: list });
});

app.post("/api/bookings/initiate", (req, res) => {
  const parsed = initiateBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 422, "VALIDATION_ERROR", "Invalid booking payload", parsed.error.flatten());
  }

  if (parsed.data.bookingId) {
    const existingBooking = state.bookings.find((entry) => entry.id === parsed.data.bookingId);
    if (!existingBooking) {
      return error(res, 404, "NOT_FOUND", "Booking not found.");
    }
    if (existingBooking.status !== "pending_verification") {
      return error(res, 409, "INVALID_STATE", "Booking is not awaiting verification.");
    }
    if (existingBooking.holdExpiresAt && DateTime.fromISO(existingBooking.holdExpiresAt, { zone: TZ }) <= now()) {
      return error(res, 410, "HOLD_EXPIRED", "Booking hold expired. Please restart booking.");
    }

    const existingVerification = state.verifications
      .filter((entry) => entry.bookingId === existingBooking.id && entry.type === "confirm_booking")
      .sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime())[0];

    if (existingVerification && !canResendOtp(existingVerification)) {
      return error(res, 429, "OTP_RATE_LIMIT", "Please wait before requesting another code.");
    }

    const { record, code } = createVerification({
      bookingId: existingBooking.id,
      phone: existingBooking.phone,
      type: "confirm_booking"
    });

    if (DEMO_MODE) {
      // eslint-disable-next-line no-console
      console.log(`Demo OTP for ${maskPhone(existingBooking.phone)}: ${code}`);
    }

    return res.status(201).json({
      bookingId: existingBooking.id,
      expiresAt: record.otpExpiresAt,
      demoCode: DEMO_MODE ? code : undefined
    });
  }

  const start = DateTime.fromISO(parsed.data.startDateTime, { zone: TZ });
  const end = DateTime.fromISO(parsed.data.endDateTime, { zone: TZ });
  if (!start.isValid || !end.isValid || end.diff(start, "hours").hours !== 1) {
    return error(res, 422, "VALIDATION_ERROR", "Bookings must be exactly one hour.");
  }

  if (start <= now()) {
    return error(res, 422, "INVALID_TIME", "Cannot book past slots.");
  }

  const conflict = state.bookings.find(
    (entry) =>
      entry.courtId === parsed.data.courtId &&
      entry.startDateTime === start.toISO() &&
      (entry.status === "booked" || entry.status === "confirmed")
  );
  const heldConflict = state.bookings.find(
    (entry) =>
      entry.courtId === parsed.data.courtId &&
      entry.startDateTime === start.toISO() &&
      entry.status === "pending_verification" &&
      entry.holdExpiresAt &&
      DateTime.fromISO(entry.holdExpiresAt, { zone: TZ }) > now()
  );
  if (conflict || heldConflict) {
    return error(res, 409, "SLOT_CONFLICT", "Slot is already booked or held.");
  }

  const booking = {
    id: `b_${Date.now()}`,
    reference: `TKZ-${Date.now().toString().slice(-6)}`,
    userId: `guest_${parsed.data.phone}`,
    firstName: parsed.data.firstName,
    surname: parsed.data.surname,
    email: parsed.data.email,
    phone: parsed.data.phone,
    courtId: parsed.data.courtId,
    startDateTime: start.toISO(),
    endDateTime: end.toISO(),
    status: "pending_verification",
    createdAt: now().toISO(),
    cancellationDeadline: cancellationDeadline(start.toISO()),
    holdExpiresAt: now().plus({ minutes: HOLD_MINUTES }).toISO()
  };

  state.bookings.push(booking);

  const existing = state.verifications
    .filter((entry) => entry.bookingId === booking.id && entry.type === "confirm_booking")
    .sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime())[0];

  if (existing && !canResendOtp(existing)) {
    return error(res, 429, "OTP_RATE_LIMIT", "Please wait before requesting another code.");
  }

  const { record, code } = createVerification({
    bookingId: booking.id,
    phone: parsed.data.phone,
    type: "confirm_booking"
  });

  // Demo-only OTP exposure for local testing.
  if (DEMO_MODE) {
    // eslint-disable-next-line no-console
    console.log(`Demo OTP for ${maskPhone(parsed.data.phone)}: ${code}`);
  }

  schedulePersist();
  return res.status(201).json({
    bookingId: booking.id,
    expiresAt: record.otpExpiresAt,
    demoCode: DEMO_MODE ? code : undefined
  });
});

app.post("/api/bookings/verify", (req, res) => {
  const parsed = verifyBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 422, "VALIDATION_ERROR", "Invalid verification payload", parsed.error.flatten());
  }

  const booking = state.bookings.find((entry) => entry.id === parsed.data.bookingId);
  if (!booking) {
    return error(res, 404, "NOT_FOUND", "Booking not found.");
  }

  if (booking.status !== "pending_verification") {
    return error(res, 409, "INVALID_STATE", "Booking is not awaiting verification.");
  }

  const verification = state.verifications
    .filter((entry) => entry.bookingId === booking.id && entry.type === "confirm_booking")
    .sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime())[0];

  if (!verification) {
    return error(res, 404, "OTP_NOT_FOUND", "Verification code not found.");
  }

  if (verificationExpired(verification)) {
    return error(res, 410, "OTP_EXPIRED", "Verification code expired.");
  }

  if (verification.attempts >= OTP_MAX_ATTEMPTS) {
    return error(res, 429, "OTP_MAX_ATTEMPTS", "Too many attempts.");
  }

  const isValid = verification.otpHash === hashOtp(parsed.data.code, verification.otpSalt);
  if (!isValid) {
    verification.attempts += 1;
    schedulePersist();
    return error(res, 401, "OTP_INVALID", "Incorrect verification code.");
  }

  booking.status = "confirmed";
  booking.holdExpiresAt = null;
  schedulePersist();

  return res.json({ booking: serializeBooking(booking) });
});

app.post("/api/bookings/cancel/initiate", (req, res) => {
  const parsed = cancelInitiateSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 422, "VALIDATION_ERROR", "Invalid cancellation payload", parsed.error.flatten());
  }

  const booking = state.bookings.find(
    (entry) => entry.reference === parsed.data.reference && entry.phone === parsed.data.phone
  );
  if (!booking) {
    return error(res, 404, "NOT_FOUND", "Booking not found.");
  }

  const start = DateTime.fromISO(booking.startDateTime, { zone: TZ });
  if (start.diff(now(), "hours").hours <= 24) {
    return error(res, 403, "CANCELLATION_WINDOW_CLOSED", "Cancellation is only allowed more than 24h before start.");
  }

  if (booking.status !== "confirmed" && booking.status !== "booked") {
    return error(res, 409, "INVALID_STATE", "Booking is not active.");
  }

  const existing = state.verifications
    .filter((entry) => entry.bookingId === booking.id && entry.type === "cancel_booking")
    .sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime())[0];

  if (existing && !canResendOtp(existing)) {
    return error(res, 429, "OTP_RATE_LIMIT", "Please wait before requesting another code.");
  }

  const { record, code } = createVerification({
    bookingId: booking.id,
    phone: booking.phone,
    type: "cancel_booking"
  });

  if (DEMO_MODE) {
    // eslint-disable-next-line no-console
    console.log(`Demo cancellation OTP for ${maskPhone(booking.phone)}: ${code}`);
  }

  return res.json({
    bookingId: booking.id,
    expiresAt: record.otpExpiresAt,
    demoCode: DEMO_MODE ? code : undefined
  });
});

app.post("/api/bookings/cancel/verify", (req, res) => {
  const parsed = verifyBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 422, "VALIDATION_ERROR", "Invalid verification payload", parsed.error.flatten());
  }

  const booking = state.bookings.find((entry) => entry.id === parsed.data.bookingId);
  if (!booking) {
    return error(res, 404, "NOT_FOUND", "Booking not found.");
  }

  if (booking.status !== "confirmed" && booking.status !== "booked") {
    return error(res, 409, "INVALID_STATE", "Booking is not active.");
  }

  const verification = state.verifications
    .filter((entry) => entry.bookingId === booking.id && entry.type === "cancel_booking")
    .sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime())[0];

  if (!verification) {
    return error(res, 404, "OTP_NOT_FOUND", "Verification code not found.");
  }

  if (verificationExpired(verification)) {
    return error(res, 410, "OTP_EXPIRED", "Verification code expired.");
  }

  if (verification.attempts >= OTP_MAX_ATTEMPTS) {
    return error(res, 429, "OTP_MAX_ATTEMPTS", "Too many attempts.");
  }

  const isValid = verification.otpHash === hashOtp(parsed.data.code, verification.otpSalt);
  if (!isValid) {
    verification.attempts += 1;
    schedulePersist();
    return error(res, 401, "OTP_INVALID", "Incorrect verification code.");
  }

  booking.status = "cancelled";
  schedulePersist();
  return res.json({ booking: serializeBooking(booking) });
});

app.post("/api/bookings/lookup/initiate", (req, res) => {
  const parsed = lookupInitiateSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 422, "VALIDATION_ERROR", "Invalid lookup payload", parsed.error.flatten());
  }

  const existing = state.verifications
    .filter((entry) => entry.phone === parsed.data.phone && entry.type === "lookup")
    .sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime())[0];

  if (existing && !canResendOtp(existing)) {
    return error(res, 429, "OTP_RATE_LIMIT", "Please wait before requesting another code.");
  }

  const { record, code } = createVerification({
    bookingId: `lookup_${parsed.data.phone}`,
    phone: parsed.data.phone,
    type: "lookup"
  });

  if (DEMO_MODE) {
    // eslint-disable-next-line no-console
    console.log(`Demo lookup OTP for ${maskPhone(parsed.data.phone)}: ${code}`);
  }

  return res.json({
    expiresAt: record.otpExpiresAt,
    demoCode: DEMO_MODE ? code : undefined
  });
});

app.post("/api/bookings/lookup/verify", (req, res) => {
  const parsed = z.object({ phone: phoneSchema, code: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
  if (!parsed.success) {
    return error(res, 422, "VALIDATION_ERROR", "Invalid lookup verification", parsed.error.flatten());
  }

  const verification = state.verifications
    .filter((entry) => entry.phone === parsed.data.phone && entry.type === "lookup")
    .sort((a, b) => new Date(b.lastSentAt).getTime() - new Date(a.lastSentAt).getTime())[0];

  if (!verification) {
    return error(res, 404, "OTP_NOT_FOUND", "Verification code not found.");
  }

  if (verificationExpired(verification)) {
    return error(res, 410, "OTP_EXPIRED", "Verification code expired.");
  }

  if (verification.attempts >= OTP_MAX_ATTEMPTS) {
    return error(res, 429, "OTP_MAX_ATTEMPTS", "Too many attempts.");
  }

  const isValid = verification.otpHash === hashOtp(parsed.data.code, verification.otpSalt);
  if (!isValid) {
    verification.attempts += 1;
    schedulePersist();
    return error(res, 401, "OTP_INVALID", "Incorrect verification code.");
  }

  const bookings = state.bookings
    .filter((entry) => entry.phone === parsed.data.phone && entry.status === "confirmed")
    .filter((entry) => DateTime.fromISO(entry.startDateTime, { zone: TZ }) >= now())
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
    .map(serializeBooking);

  return res.json({ bookings });
});

app.post("/api/bookings", auth, (req, res) => {
  const parsed = bookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return error(res, 422, "VALIDATION_ERROR", "Invalid booking payload", parsed.error.flatten());
  }

  const start = DateTime.fromISO(parsed.data.startDateTime, { zone: TZ });
  const end = DateTime.fromISO(parsed.data.endDateTime, { zone: TZ });
  const idempotencyKey = String(req.headers["idempotency-key"] || parsed.data.idempotencyKey);

  if (state.idempotency[idempotencyKey]) {
    const booking = state.bookings.find((entry) => entry.id === state.idempotency[idempotencyKey]);
    if (booking) {
      return res.status(200).json({ booking: serializeBooking(booking) });
    }
  }

  if (!start.isValid || !end.isValid || end.diff(start, "hours").hours !== 1) {
    return error(res, 422, "VALIDATION_ERROR", "Bookings must be exactly one hour.");
  }

  if (start <= now()) {
    return error(res, 422, "INVALID_TIME", "Cannot book past slots.");
  }

  const conflict = state.bookings.find(
    (entry) => entry.courtId === parsed.data.courtId && entry.startDateTime === start.toISO() && entry.status === "booked"
  );
  if (conflict) {
    return error(res, 409, "SLOT_CONFLICT", "Slot is already booked.");
  }

  const special = isSpecialSlot(start, parsed.data.courtId);
  const amount = slotPrice(start, parsed.data.courtId);
  const method = parsed.data.paymentMethod || "card";

  if (special && !parsed.data.payImmediately) {
    return error(res, 402, "PAYMENT_REQUIRED", "Individual Slot requires immediate payment upon booking.");
  }

  if (special && method === "wallet" && req.user.walletBalance < amount) {
    return error(res, 402, "INSUFFICIENT_WALLET", "Insufficient wallet balance for immediate payment.");
  }

  const booking = {
    id: `b_${Date.now()}`,
    reference: `TKZ-${Date.now().toString().slice(-6)}`,
    userId: req.user.id,
    courtId: parsed.data.courtId,
    startDateTime: start.toISO(),
    endDateTime: end.toISO(),
    status: "booked",
    createdAt: now().toISO(),
    cancellationDeadline: cancellationDeadline(start.toISO()),
    reminderSent: false,
    manualCancellationOverride: false
  };

  const payment = {
    id: `p_${Date.now()}`,
    bookingId: booking.id,
    status: special ? "paid" : "payment_pending",
    amount,
    currency: CURRENCY,
    dueAt: start.toISO(),
    method,
    paidAt: special ? now().toISO() : null,
    providerRef: special ? `MOCK-${Date.now()}` : null
  };

  state.bookings.push(booking);
  state.payments.push(payment);

  if (special && method === "wallet") {
    addWalletTransaction({
      userId: req.user.id,
      amount: -amount,
      type: "booking_payment",
      bookingId: booking.id,
      description: "Individual slot booking payment"
    });
  }

  state.idempotency[idempotencyKey] = booking.id;
  schedulePersist();

  notifyUser({
    user: req.user,
    booking,
    type: "booking_confirmation",
    message: `Booking confirmed: ${booking.reference} at ${start.toFormat("dd LLL HH:mm")} on Court ${booking.courtId}.`
  });

  if (payment.status === "paid") {
    notifyUser({
      user: req.user,
      booking,
      type: "payment_confirmation",
      message: `Payment confirmed for ${booking.reference}. Amount ZAR ${amount}.`
    });
  }

  return res.status(201).json({ booking: serializeBooking(booking), paymentAnimation: payment.status === "paid" });
});

app.get("/api/bookings/me", auth, (req, res) => {
  const userBookings = state.bookings
    .filter((entry) => entry.userId === req.user.id)
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
    .map(serializeBooking);
  res.json({ bookings: userBookings });
});

app.post("/api/bookings/:id/cancel", auth, (req, res) => {
  const parsed = cancelSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return error(res, 422, "VALIDATION_ERROR", "Invalid cancellation request", parsed.error.flatten());
  }

  const booking = state.bookings.find((entry) => entry.id === req.params.id && entry.userId === req.user.id);
  if (!booking) {
    return error(res, 404, "NOT_FOUND", "Booking not found");
  }

  if (booking.status !== "booked" && booking.status !== "confirmed") {
    return error(res, 409, "INVALID_STATE", "Only active bookings can be cancelled.");
  }

  const hoursUntil = DateTime.fromISO(booking.startDateTime, { zone: TZ }).diff(now(), "hours").hours;
  if (hoursUntil <= 24 && !booking.manualCancellationOverride) {
    return error(res, 403, "CANCELLATION_WINDOW_CLOSED", "Cancellation is only allowed more than 24h before start.");
  }

  booking.status = "cancelled";
  let refundStatus = "none";

  const payment = state.payments.find((entry) => entry.bookingId === booking.id);
  if (payment && payment.status === "paid") {
    if (parsed.data.refundOption === "wallet") {
      payment.status = "credited";
      addWalletTransaction({
        userId: req.user.id,
        amount: payment.amount,
        type: "credit",
        bookingId: booking.id,
        description: "Cancellation credit"
      });
      refundStatus = "credited";
    } else {
      payment.status = "refunded";
      addWalletTransaction({
        userId: req.user.id,
        amount: payment.amount,
        type: "refund",
        bookingId: booking.id,
        description: "Refund to payment method"
      });
      refundStatus = "refunded";
    }
  }

  schedulePersist();

  notifyUser({
    user: req.user,
    booking,
    type: "cancellation_confirmation",
    message: `Booking ${booking.reference} cancelled. Status: ${refundStatus}.`
  });

  if (refundStatus !== "none") {
    notifyUser({
      user: req.user,
      booking,
      type: "refund_processed",
      message: `Refund processing completed for ${booking.reference}: ${refundStatus}.`
    });
  }

  return res.json({ booking: serializeBooking(booking), refundStatus });
});

app.post("/api/bookings/:id/pay", auth, (req, res) => {
  const booking = state.bookings.find((entry) => entry.id === req.params.id && entry.userId === req.user.id);
  if (!booking) {
    return error(res, 404, "NOT_FOUND", "Booking not found");
  }

  const payment = state.payments.find((entry) => entry.bookingId === booking.id);
  if (!payment) {
    return error(res, 422, "NO_PAYMENT_REQUIRED", "This booking does not require payment.");
  }

  if (payment.status === "paid") {
    return res.json({ paymentUrl: "https://checkout.mock/tekkerz", booking: serializeBooking(booking) });
  }

  payment.status = "paid";
  payment.paidAt = now().toISO();
  payment.providerRef = `MOCK-${Date.now()}`;
  schedulePersist();

  notifyUser({
    user: req.user,
    booking,
    type: "payment_confirmation",
    message: `Payment confirmed for ${booking.reference}. Amount ZAR ${payment.amount}.`
  });

  return res.json({ paymentUrl: "https://checkout.mock/tekkerz", booking: serializeBooking(booking) });
});

app.get("/api/wallet/me", auth, (req, res) => {
  const transactions = state.walletTransactions
    .filter((entry) => entry.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ walletBalance: req.user.walletBalance || 0, transactions });
});

app.get("/api/admin/bookings", auth, adminOnly, (_req, res) => {
  const allBookings = state.bookings
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(serializeBooking);
  return res.json({ bookings: allBookings });
});

app.post("/api/admin/bookings/:id/override-cancel", auth, adminOnly, (req, res) => {
  const booking = state.bookings.find((entry) => entry.id === req.params.id);
  if (!booking) {
    return error(res, 404, "NOT_FOUND", "Booking not found");
  }

  booking.manualCancellationOverride = Boolean(req.body?.enabled);
  schedulePersist();
  return res.json({ ok: true, booking: serializeBooking(booking) });
});

app.get("/api/notifications/me", auth, (req, res) => {
  return res.json({
    notifications: state.notifications
      .filter((entry) => entry.userId === req.user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  });
});

app.post("/api/notifications/webhook", (req, res) => {
  const notificationId = req.body?.notificationId;
  const status = req.body?.status;
  const record = state.notifications.find((entry) => entry.id === notificationId);
  if (!record) {
    return error(res, 404, "NOT_FOUND", "Notification not found");
  }

  record.status = status || "delivered";
  schedulePersist();
  return res.json({ ok: true });
});

app.post("/api/payments/webhook", (req, res) => {
  const bookingId = req.body?.bookingId;
  const payment = state.payments.find((entry) => entry.bookingId === bookingId);
  if (!payment) {
    return error(res, 404, "NOT_FOUND", "Payment not found");
  }

  payment.status = req.body?.status === "paid" ? "paid" : "failed";
  payment.providerRef = req.body?.providerRef || payment.providerRef;
  payment.paidAt = payment.status === "paid" ? now().toISO() : null;
  schedulePersist();
  return res.json({ ok: true });
});

(async () => {
  await initState();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Tekkerz API running on :${PORT} (postgres=${USE_POSTGRES})`);
  });
})();
