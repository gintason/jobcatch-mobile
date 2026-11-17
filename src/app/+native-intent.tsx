import { checkoutActive } from "@/lib/checkout";

/**
 * Incoming deep links. While a checkout browser is open, the payment return
 * link (jobcatch://payment-complete) is handled by openCheckout itself, so we
 * swallow it here instead of navigating twice.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path.includes("payment-complete") && checkoutActive()) return null;
  return path;
}
