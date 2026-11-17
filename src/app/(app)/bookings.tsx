import { router } from "expo-router";
import { BookingList } from "@/components/dashboard";
import { useEnsureRole } from "@/lib/auth";
import { useMyBookings } from "@/lib/jobs";
import { Screen } from "@/ui";

export default function Bookings() {
  const ready = useEnsureRole("customer");
  const list = useMyBookings(ready);
  return (
    <Screen back title="My bookings" onRefresh={() => list.refetch()} refreshing={list.isRefetching}>
      <BookingList role="customer" bookings={list.data} loading={!ready || list.isLoading} emptyAction={() => router.push("/artisans")} />
    </Screen>
  );
}
