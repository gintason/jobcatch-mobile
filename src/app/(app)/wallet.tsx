import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Wallet as WalletIcon } from "lucide-react-native";
import { TxnIcon, WalletCard } from "@/components/bills";
import { apiError } from "@/lib/api";
import { useFundWallet, useWallet } from "@/lib/billing";
import { openCheckout } from "@/lib/checkout";
import { formatDateTime, naira } from "@/lib/format";
import { Button, Card, Chips, Empty, Input, Loading, Notice, Screen, Section, Text, colors } from "@/ui";

export default function WalletScreen() {
  const { fund } = useLocalSearchParams<{ fund?: string }>();
  const wallet = useWallet();
  const top = useFundWallet();
  const [amount, setAmount] = useState(fund ? "5000" : "");
  const [error, setError] = useState("");

  function topUp() {
    setError("");
    top.mutate(amount, {
      onSuccess: async (r) => { await openCheckout(r.authorization_url, r.reference, { home: true }); },
      onError: (e) => setError(apiError(e, "We couldn't start the top-up.")),
    });
  }

  return (
    <Screen back title="Wallet" onRefresh={() => wallet.refetch()} refreshing={wallet.isRefetching}>
      <WalletCard compact actions={false} />
      <Card style={{ gap: 12 }}>
        <Text variant="h3">Add money</Text>
        <Input label="Amount (₦)" value={amount} onChangeText={(v) => setAmount(v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="Min ₦100" />
        <Chips value={amount} onChange={setAmount} options={[1000, 2000, 5000, 10000, 20000].map((a) => ({ value: String(a), label: naira(a) }))} />
        {error ? <Notice kind="error">{error}</Notice> : null}
        <Button title={Number(amount) >= 100 ? `Add ${naira(amount)}` : "Add money"} onPress={topUp} loading={top.isPending} disabled={Number(amount) < 100} />
        <Text variant="caption">Pay by card, bank transfer or USSD. Your balance updates as soon as the payment is confirmed.</Text>
      </Card>
      <Section title="Transactions">
        <Card style={{ paddingVertical: 4 }}>
          {wallet.isLoading ? <View style={{ paddingVertical: 12 }}><Loading rows={3} /></View>
            : wallet.data?.transactions.length ? wallet.data.transactions.map((t, i) => (
              <View key={t.id} style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }, i ? { borderTopWidth: 1, borderTopColor: colors.line } : null]}>
                <TxnIcon kind={t.kind} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1} style={{ fontSize: 14 }}>{t.description || t.source_label}</Text>
                  <Text variant="caption">{formatDateTime(t.created_at)}</Text>
                </View>
                <Text variant="bodyStrong" style={{ fontSize: 14 }} color={t.kind === "credit" ? colors.success : colors.brand900}>
                  {t.kind === "credit" ? "+" : "−"}{naira(t.amount, 2)}
                </Text>
              </View>
            )) : <Empty icon={<WalletIcon size={26} color={colors.brand500} />} title="No transactions yet" body="Top-ups, purchases, refunds and gift card payouts appear here." />}
        </Card>
      </Section>
    </Screen>
  );
}
