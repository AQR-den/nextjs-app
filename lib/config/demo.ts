export const DEMO_MODE = String(process.env.NEXT_PUBLIC_DEMO_MODE || "false") === "true";

export const DEMO_ACCOUNTS = {
  court: {
    label: "Demo Court Booking",
    email: "demo.court@tekkerz.test",
    password: "DemoPass123!"
  },
  individual: {
    label: "Demo Individual Slot",
    email: "demo.individual@tekkerz.test",
    password: "DemoPass123!"
  }
};
