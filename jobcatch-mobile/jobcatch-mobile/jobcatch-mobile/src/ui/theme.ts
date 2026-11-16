/** JobCatch design tokens — same palette as jobcatchonline.com. */
export const colors = {
  brand50: "#eef4ff", brand100: "#d9e6ff", brand200: "#b7ccff", brand300: "#8aabff", brand400: "#4f82f5",
  brand500: "#0160de", brand600: "#024fb8", brand700: "#033a94", brand800: "#032a75", brand900: "#021d52",
  ink: "#0b1533", mist: "#f5f8ff", bg: "#f3f6fc", white: "#ffffff",
  muted: "#5b6683", faint: "#8d96ad", line: "#e4ebf8",
  success: "#15803d", successBg: "#ecfdf3", warning: "#b45309", warningBg: "#fffbeb",
  danger: "#dc2626", dangerBg: "#fef2f2", violet: "#6d28d9", violetBg: "#f5f3ff", grayBg: "#f1f3f7", gray: "#4b5563",
  amber: "#f59e0b",
};

export const fonts = {
  display: "PlusJakartaSans_800ExtraBold",
  displayBold: "PlusJakartaSans_700Bold",
  displaySemi: "PlusJakartaSans_600SemiBold",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const space = (n: number) => n * 4;

export const shadow = {
  card: { shadowColor: "#021d52", shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  lift: { shadowColor: "#021d52", shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
};

/** Status chip colours shared by bills, deliveries, payments, applications. */
export type Tone = "info" | "success" | "warning" | "danger" | "neutral" | "violet";
export const toneColors: Record<Tone, { bg: string; fg: string }> = {
  info: { bg: colors.brand50, fg: colors.brand600 },
  success: { bg: colors.successBg, fg: colors.success },
  warning: { bg: colors.warningBg, fg: colors.warning },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  neutral: { bg: colors.grayBg, fg: colors.gray },
  violet: { bg: colors.violetBg, fg: colors.violet },
};

export function statusTone(status: string): Tone {
  if (["successful", "success", "delivered", "completed", "approved", "hired", "active"].includes(status)) return "success";
  if (["failed", "rejected", "declined", "suspended"].includes(status)) return "danger";
  if (["awaiting_payment", "searching", "pending", "submitting", "initiated", "incomplete", "submitted"].includes(status)) return "warning";
  if (["picked_up", "shortlisted"].includes(status)) return "violet";
  if (["refunded", "cancelled", "expired", "closed", "draft"].includes(status)) return "neutral";
  return "info";
}
