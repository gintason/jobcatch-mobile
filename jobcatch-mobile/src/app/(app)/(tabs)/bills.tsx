import { View } from "react-native";
import { router } from "expo-router";
import { Receipt } from "lucide-react-native";
import { BILL_SERVICES, OrderRow, ServiceGrid, WalletCard } from "@/components/bills";
import { useBillOrders, useCatalogue, useWallet } from "@/lib/billing";
import { Card, Empty, Loading, Screen, Section, Text, colors } from "@/ui";

export default function BillsTab() {
  const catalogue = useCatalogue();
  const orders = useBillOrders();
  const wallet = useWallet();
  const services = BILL_SERVICES.filter((s) => s.enabled(catalogue.data));
  return (
    <Screen title="Pay bills" subtitle="Instant airtime, data, power, TV and more."
      onRefresh={() => { orders.refetch(); wallet.refetch(); catalogue.refetch(); }} refreshing={orders.isRefetching}>
      <WalletCard />
      <Section title="Services">
        {catalogue.isLoading ? <Loading rows={2} /> : <ServiceGrid items={services} />}
      </Section>
      <Section title="Recent payments">
        <Card style={{ paddingVertical: 4 }}>
          {orders.isLoading ? <View style={{ paddingVertical: 12 }}><Loading rows={3} /></View>
            : orders.data?.length ? orders.data.slice(0, 20).map((o, i) => (
              <View key={o.id} style={i ? { borderTopWidth: 1, borderTopColor: colors.line } : null}><OrderRow o={o} /></View>
            )) : (
              <Empty icon={<Receipt size={26} color={colors.brand500} />} title="No payments yet" body="Your airtime, data and bill receipts will show up here."
                action="Buy airtime" onAction={() => router.push("/pay/airtime")} />
            )}
        </Card>
        <Text variant="caption" center>Every purchase gets a receipt. Failed purchases are refunded to your wallet automatically.</Text>
      </Section>
    </Screen>
  );
}
