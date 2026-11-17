import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { usePathname } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { ChevronLeft, MessageCircle, Minus, Send, X } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { useAIChatStream } from "@/lib/ai";
import { Text, colors, fonts, radius, shadow } from "@/ui";

const TAB_PATHS = ["/", "/bills", "/delivery", "/jobs", "/account"];
const SUGGESTIONS = ["What’s the status of my booking?", "How do I fund my wallet?", "How do I get verified as an artisan?", "How do I post a job?"];

/**
 * Floating "Ask JobCatch" chat button + assistant chat. The ✕-style "–" badge (or a
 * long-press) minimizes it to a slim edge tab; tapping the tab brings it back.
 * Shown on the main tabs and the dashboards; hidden on form screens so it
 * never covers a Pay / Submit button.
 */
// Remembered for the rest of the session (and across launches, see below).
let minimizedPref = false;
const PREF_KEY = "jc_ai_minimized";
const web = Platform.OS === "web";
async function loadPref() {
  try { return (web ? globalThis.localStorage?.getItem(PREF_KEY) : await SecureStore.getItemAsync(PREF_KEY)) === "1"; } catch { return false; }
}
function savePref(v: boolean) {
  minimizedPref = v;
  try { if (web) globalThis.localStorage?.setItem(PREF_KEY, v ? "1" : "0"); else SecureStore.setItemAsync(PREF_KEY, v ? "1" : "0").catch(() => {}); } catch { /* ignore */ }
}

export function AIAssistant() {
  const { user } = useAuth();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(minimizedPref);
  useEffect(() => { loadPref().then((v) => { minimizedPref = v; setMinimized(v); }); }, []);
  const onTabs = TAB_PATHS.includes(path);
  const visible = onTabs || path.startsWith("/dashboard/") && !path.startsWith("/dashboard/job/") || path === "/hub";
  if (!user || !visible) return null;
  const bottom = onTabs ? Math.max(insets.bottom, 10) + 58 + 14 : Math.max(insets.bottom, 10) + 14;
  const setMin = (v: boolean) => { Haptics.selectionAsync().catch(() => {}); savePref(v); setMinimized(v); };
  return (
    <>
      {minimized ? (
        // Minimized: a slim tab tucked against the right edge — tap to bring the chat button back.
        <Pressable onPress={() => setMin(false)} accessibilityRole="button" accessibilityLabel="Show Ask JobCatch" hitSlop={8} style={[s.tab, { bottom: bottom + 6 }]}>
          <ChevronLeft size={16} color={colors.white} />
          <MessageCircle size={16} color={colors.white} />
        </Pressable>
      ) : (
        <View style={[s.fabWrap, { bottom }]}>
          <Pressable onPress={() => setOpen(true)} onLongPress={() => setMin(true)} accessibilityRole="button" accessibilityLabel="Ask JobCatch"
            accessibilityHint="Opens the assistant. Long-press to minimize.">
            <LinearGradient colors={[colors.brand800, colors.brand500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fab}>
              <MessageCircle size={24} color={colors.white} />
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => setMin(true)} hitSlop={10} style={s.minBtn} accessibilityRole="button" accessibilityLabel="Minimize Ask JobCatch">
            <Minus size={14} color={colors.brand700} strokeWidth={3} />
          </Pressable>
        </View>
      )}
      {open ? <ChatSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ChatSheet({ onClose }: { onClose: () => void }) {
  const { messages, isPending, sendMessage, reset } = useAIChatStream();
  const [input, setInput] = useState("");
  const list = useRef<FlatList>(null);
  function close() { reset(); onClose(); }
  function send(text = input) {
    if (!text.trim() || isPending) return;
    setInput("");
    sendMessage(text);
  }
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.white }}>
        <LinearGradient colors={[colors.brand800, colors.brand600]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.head}>
          <MessageCircle size={18} color={colors.white} />
          <Text style={{ flex: 1, color: colors.white, fontFamily: fonts.displayBold, fontSize: 16 }}>JobCatch Assistant</Text>
          <Pressable onPress={close} hitSlop={12} accessibilityLabel="Close assistant"><X size={22} color={colors.white} /></Pressable>
        </LinearGradient>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <FlatList ref={list} data={messages} keyExtractor={(_, i) => String(i)} keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={{ paddingTop: 24, gap: 14, alignItems: "center" }}>
                <Text variant="small" center>Ask me about your bookings, applications, wallet, or how JobCatch works.</Text>
                <View style={{ gap: 8, alignSelf: "stretch" }}>
                  {SUGGESTIONS.map((q) => (
                    <Pressable key={q} onPress={() => send(q)} style={s.suggest}><Text variant="small" color={colors.brand700}>{q}</Text></Pressable>
                  ))}
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const mine = item.role === "user";
              return (
                <View style={[s.bubble, mine ? s.mine : s.theirs, item.isError && { backgroundColor: colors.dangerBg }]}>
                  {item.content ? <Text selectable style={{ color: mine ? colors.white : item.isError ? colors.danger : colors.brand900, fontSize: 15 }}>{item.content}</Text>
                    : <ActivityIndicator size="small" color={colors.brand500} />}
                </View>
              );
            }} />
          <View style={s.composer}>
            <TextInput value={input} onChangeText={setInput} placeholder="Ask a question…" placeholderTextColor={colors.faint} style={s.input}
              multiline maxLength={1000} onSubmitEditing={() => send()} />
            <Pressable onPress={() => send()} disabled={!input.trim() || isPending} accessibilityLabel="Send"
              style={[s.send, (!input.trim() || isPending) && { opacity: 0.5 }]}>
              {isPending ? <ActivityIndicator size="small" color={colors.white} /> : <Send size={18} color={colors.white} />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  fabWrap: { position: "absolute", right: 16, borderRadius: radius.pill, ...shadow.lift },
  minBtn: { position: "absolute", top: -6, left: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.brand100, ...shadow.card },
  tab: { position: "absolute", right: 0, flexDirection: "row", alignItems: "center", gap: 2, paddingLeft: 6, paddingRight: 8, height: 40, borderTopLeftRadius: 20, borderBottomLeftRadius: 20, backgroundColor: colors.brand600, opacity: 0.92, ...shadow.card },
  fab: { width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 27 },
  head: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingVertical: 14 },
  suggest: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: radius.md, backgroundColor: colors.brand50, borderWidth: 1, borderColor: colors.brand100 },
  bubble: { maxWidth: "85%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.brand500, borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.mist, borderBottomLeftRadius: 6 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.line },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand500, alignItems: "center", justifyContent: "center" },
});
