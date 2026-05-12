export const appConfig = {
  name: "SATS Command Center",
  shortName: "SATS",
  tagline:
    "Smart Animal Tracking System for wildlife operations, health intelligence, and conservation response.",
  supportEmail: "operations@sats.local",
  apiBaseUrl:
    process.env.NEXT_PUBLIC_SATS_API_BASE_URL ??
    "https://sats-eku5.onrender.com",
};
