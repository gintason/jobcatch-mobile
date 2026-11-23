const DATE = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE.format(d);
}
export function formatDateTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE_TIME.format(d);
}
export function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(iso);
}
/**
 * ₦ amount with thousands separators, e.g. naira("1234.5", 2) → "₦1,234.50".
 * Formatted by hand (not toLocaleString) so every phone shows exactly the same
 * thing regardless of the device's language/region or JS engine Intl support.
 */
export function naira(value: string | number | null | undefined, decimals = 0) {
  const n = typeof value === "string" ? Number(value.replace(/,/g, "")) : value ?? 0;
  const v = Number.isFinite(n) ? (n as number) : 0;
  const [whole, frac] = Math.abs(v).toFixed(decimals).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${v < 0 ? "-" : ""}₦${grouped}${frac ? `.${frac}` : ""}`;
}
export function firstName(full?: string | null) { return (full ?? "").trim().split(/\s+/)[0] || "there"; }
export function initials(full?: string | null) {
  return (full ?? "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "JC";
}
