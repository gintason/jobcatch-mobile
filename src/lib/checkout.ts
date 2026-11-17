import { Linking, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { colors } from "@/ui/theme";
import { api } from "./api";
import { queryClient } from "./queryClient";

/** The deep link the gateway return page opens (see the web's /payments/callback/app). */
export const PAYMENT_RETURN_URL = "jobcatch://payment-complete";

let active = false;
/** True while a checkout browser is open (the return link is then handled here, not by the router). */
export const checkoutActive = () => active;

/** Ask the backend to confirm a payment, then refresh everything on screen. */
export async function settlePayment(reference?: string | null) {
  if (reference) {
    try { await api.get(`/payments/verify/${encodeURIComponent(reference)}/`); } catch { /* the webhook settles it anyway */ }
  }
  await queryClient.invalidateQueries();
}

/**
 * Open the gateway's hosted checkout. When the payer finishes, the gateway
 * returns to a page that opens `jobcatch://payment-complete`; that closes the
 * browser automatically and brings the payer back into the app. (Closing the
 * browser by hand works too.) We then confirm the payment and refresh data.
 *
 * `home: true` lands on the Home screen afterwards; otherwise the caller
 * decides where to go (e.g. the bill receipt).
 */
export async function openCheckout(url: string, reference?: string | null, opts: { home?: boolean } = {}) {
  active = true;
  const browser = { toolbarColor: colors.brand900, controlsColor: colors.white, dismissButtonStyle: "close" as const };
  try {
    if (Platform.OS === "ios") {
      // Safari view controller + close it ourselves when the return link arrives.
      // (An iOS "auth session" would show a misleading "wants to sign in" prompt.)
      const sub = Linking.addEventListener("url", ({ url: u }) => {
        if (u.startsWith(PAYMENT_RETURN_URL)) WebBrowser.dismissBrowser();
      });
      try {
        await WebBrowser.openBrowserAsync(url, { ...browser, presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN });
      } finally {
        sub.remove();
      }
    } else {
      // Android custom tab that closes itself when the gateway sends the payer back.
      await WebBrowser.openAuthSessionAsync(url, PAYMENT_RETURN_URL, { ...browser, showInRecents: false });
    }
  } catch {
    await WebBrowser.openBrowserAsync(url, browser);
  } finally {
    // Android can deliver the return link a moment after the browser closes.
    setTimeout(() => { active = false; }, 2000);
  }
  await settlePayment(reference);
  if (opts.home) router.dismissTo("/");
}

export async function openLink(url: string) {
  await WebBrowser.openBrowserAsync(url, { toolbarColor: colors.brand900, controlsColor: colors.white });
}
