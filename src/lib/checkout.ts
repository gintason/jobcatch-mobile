import * as WebBrowser from "expo-web-browser";
import { colors } from "@/ui/theme";
import { api } from "./api";

/**
 * Open the gateway's hosted checkout in an in-app browser. When the user
 * closes it we ask the backend to verify the reference (the webhook also
 * fulfils the payment, so this is only to refresh state sooner).
 */
export async function openCheckout(url: string, reference?: string | null) {
  await WebBrowser.openBrowserAsync(url, {
    toolbarColor: colors.brand900, controlsColor: colors.white, dismissButtonStyle: "close",
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  });
  if (reference) {
    try { await api.get(`/payments/verify/${encodeURIComponent(reference)}/`); } catch { /* webhook will settle it */ }
  }
}

export async function openLink(url: string) {
  await WebBrowser.openBrowserAsync(url, { toolbarColor: colors.brand900, controlsColor: colors.white });
}
