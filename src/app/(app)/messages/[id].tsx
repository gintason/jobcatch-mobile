import { useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Send } from "lucide-react-native";
import { apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { useMessages, useSendMessage } from "@/lib/roles";
import { Empty, Loading, Notice, Screen, Text, colors, fonts, radius } from "@/ui";

/** One conversation. Polls every 4 seconds, like the web chat fallback. */
export default function Chat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { user } = useAuth();
  const msgs = useMessages(id);
  const send = useSendMessage(id);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<FlatList>(null);
  const data = msgs.data ?? [];

  function submit() {
    const text = body.trim();
    if (!text) return;
    setError("");
    send.mutate(text, { onSuccess: () => setBody(""), onError: (e) => setError(apiError(e, "Message not sent.")) });
  }

  return (
    <Screen back title={name || "Chat"} scroll={false} padded={false}
      footer={
        <View style={{ gap: 6 }}>
          {error ? <Notice kind="error">{error}</Notice> : null}
          <View style={s.composer}>
            <TextInput value={body} onChangeText={setBody} placeholder="Type a message" placeholderTextColor={colors.faint} multiline style={s.input} maxLength={2000} />
            <Pressable onPress={submit} disabled={!body.trim() || send.isPending} style={[s.send, (!body.trim() || send.isPending) && { opacity: 0.5 }]} accessibilityLabel="Send message">
              <Send size={18} color={colors.white} />
            </Pressable>
          </View>
        </View>
      }>
      {msgs.isLoading ? <View style={{ padding: 20 }}><Loading rows={4} /></View> : (
        <FlatList ref={listRef} data={data} keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={<Empty title="Say hello 👋" body="Messages you send appear here." />}
          renderItem={({ item }) => {
            const mine = item.sender_email === user?.email;
            return (
              <View style={[s.bubble, mine ? s.mine : s.theirs]}>
                <Text style={{ color: mine ? colors.white : colors.ink, fontSize: 15 }}>{item.body}</Text>
                <Text style={{ color: mine ? "rgba(255,255,255,0.7)" : colors.faint, fontSize: 10.5, marginTop: 3, alignSelf: "flex-end" }}>{formatDateTime(item.created_at)}</Text>
              </View>
            );
          }} />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: { flex: 1, minHeight: 46, maxHeight: 120, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.mist, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.brand500, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.brand500, borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.white, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.line },
});
