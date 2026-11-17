import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { settlePayment } from "@/lib/checkout";
import { Text, colors } from "@/ui";

/**
 * Opened by jobcatch://payment-complete when the app wasn't waiting on the
 * checkout (e.g. it was closed while the payer was in the browser). Confirms
 * the payment, refreshes data and goes to the Home screen.
 */
export default function PaymentComplete() {
  const { reference } = useLocalSearchParams<{ reference?: string }>();
  useEffect(() => {
    let done = false;
    settlePayment(reference).finally(() => {
      if (done) return;
      done = true;
      if (router.canDismiss()) router.dismissTo("/");
      else router.replace("/");
    });
    return () => { done = true; };
  }, [reference]);
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.brand500} />
      <Text variant="bodyStrong">Confirming your payment…</Text>
    </View>
  );
}
