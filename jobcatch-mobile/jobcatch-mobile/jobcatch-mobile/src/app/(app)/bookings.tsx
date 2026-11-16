import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { CalendarCheck, Star } from "lucide-react-native";
import { apiError } from "@/lib/api";
import { useEnsureRole } from "@/lib/auth";
import { formatDateTime, naira } from "@/lib/format";
import { useBookingAction, useCreateReview, useMyBookings, type Booking } from "@/lib/jobs";
import { Badge, Button, Card, Empty, Input, Loading, Notice, Screen, Text, colors } from "@/ui";

const LABEL: Record<Booking["status"], string> = { pending: "Awaiting artisan", accepted: "Confirmed", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };

export default function Bookings() {
  const ready = useEnsureRole("customer");
  const list = useMyBookings(ready);
  return (
    <Screen back title="My bookings" onRefresh={() => list.refetch()} refreshing={list.isRefetching}>
      {!ready || list.isLoading ? <Loading /> : list.data?.length ? list.data.map((b) => <BookingCard key={b.id} b={b} />)
        : <Empty icon={<CalendarCheck size={26} color={colors.brand500} />} title="No bookings yet" body="Find a vetted artisan and book in minutes." action="Find artisans" onAction={() => router.push("/artisans")} />}
    </Screen>
  );
}

function BookingCard({ b }: { b: Booking }) {
  const act = useBookingAction();
  const review = useCreateReview();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text variant="h3">{b.service_title}</Text>
          <Text variant="small">{b.artisan_name}</Text>
        </View>
        <Badge label={LABEL[b.status]} status={b.status === "pending" ? "pending" : b.status === "completed" ? "completed" : b.status} />
      </View>
      <Text variant="small">{formatDateTime(b.scheduled_for)} · {b.address}</Text>
      {Number(b.agreed_price) ? <Text variant="bodyStrong">{naira(b.agreed_price)}</Text> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {["pending", "accepted"].includes(b.status) ? (
        <Button title="Cancel booking" kind="ghost" size="md" loading={act.isPending} onPress={() => act.mutate({ id: b.id, action: "cancel" }, { onError: (e) => setError(apiError(e)) })} />
      ) : null}
      {b.status === "completed" && !b.has_review ? (
        <View style={{ gap: 8, marginTop: 4 }}>
          <Text variant="label">Rate this job</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setStars(n)} accessibilityLabel={`${n} stars`}>
                <Star size={28} color={n <= stars ? colors.amber : colors.brand100} fill={n <= stars ? colors.amber : "transparent"} />
              </Pressable>
            ))}
          </View>
          <Input value={comment} onChangeText={setComment} placeholder="How did it go? (optional)" />
          <Button title="Submit review" size="md" disabled={!stars} loading={review.isPending}
            onPress={() => review.mutate({ booking: b.id, rating: stars, comment }, { onError: (e) => setError(apiError(e)) })} />
        </View>
      ) : null}
    </Card>
  );
}
