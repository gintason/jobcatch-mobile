import { View } from "react-native";
import { Bell } from "lucide-react-native";
import { timeAgo } from "@/lib/format";
import { useMarkAllRead, useNotifications } from "@/lib/jobs";
import { Button, Card, Empty, Loading, Screen, Text, colors } from "@/ui";

export default function Notifications() {
  const list = useNotifications();
  const read = useMarkAllRead();
  const unread = list.data?.some((n) => !n.is_read);
  return (
    <Screen back title="Notifications" onRefresh={() => list.refetch()} refreshing={list.isRefetching}
      right={unread ? <Button title="Mark all read" kind="ghost" size="md" onPress={() => read.mutate()} /> : undefined}>
      {list.isLoading ? <Loading /> : list.data?.length ? (
        <Card style={{ paddingVertical: 4 }}>
          {list.data.map((n, i) => (
            <View key={n.id} style={[{ flexDirection: "row", gap: 12, paddingVertical: 14 }, i ? { borderTopWidth: 1, borderTopColor: colors.line } : null]}>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: n.is_read ? "transparent" : colors.brand500 }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong" style={{ fontSize: 14.5 }}>{n.title}</Text>
                {n.body ? <Text variant="small">{n.body}</Text> : null}
                <Text variant="caption">{timeAgo(n.created_at)}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : <Empty icon={<Bell size={26} color={colors.brand500} />} title="You're all caught up" body="Payment receipts, delivery updates and job news show up here." />}
    </Screen>
  );
}
