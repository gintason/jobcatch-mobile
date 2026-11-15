/** App-wide configuration. Public values only — never put secrets here. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://api.jobcatchonline.com/api/v1").replace(/\/$/, "");
export const API_ORIGIN = (() => {
  const m = /^(https?:\/\/[^/]+)/i.exec(API_URL);
  return m ? m[1] : "";
})();
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://jobcatchonline.com";

/** Absolute URL for a backend-served media file. */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^(https?:|data:|file:|blob:)/i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Google OAuth client IDs (public). Android/iOS IDs must also be listed in the backend's GOOGLE_CLIENT_IDS. */
export const GOOGLE = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "306763553702-jalc00es33k28etpj8shsufela5486t1.apps.googleusercontent.com",
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};

export const COMPANY = {
  brand: "JobCatch",
  legalName: "Spotlight Investments Limited",
  rcNumber: "9434426",
  address: "5 David Oladapo Street, Sangotedo, Lagos, Nigeria",
  email: "support@jobcatchonline.com",
};
