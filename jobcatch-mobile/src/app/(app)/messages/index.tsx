import { ConversationList } from "@/components/dashboard";
import { useConversations } from "@/lib/roles";
import { Screen } from "@/ui";

export default function Messages() {
  const list = useConversations();
  return (
    <Screen back title="Messages" subtitle="Chats about your bookings and jobs." onRefresh={() => list.refetch()} refreshing={list.isRefetching}>
      <ConversationList />
    </Screen>
  );
}
