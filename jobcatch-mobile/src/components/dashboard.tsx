/** Building blocks shared by the role dashboards. */
import { useState, type ReactNode } from "react";
import { Alert, Pressable, StyleSheet, Switch, View } from "react-native";
import { router } from "expo-router";
import { ArrowLeftRight, CalendarCheck, ChevronRight, MessageCircle, Paperclip, Star, Upload } from "lucide-react-native";
import { apiError, type PickedFile } from "@/lib/api";
import type { Role } from "@/lib/auth";
import { formatDateTime, naira, timeAgo } from "@/lib/format";
import { useBookingAction, useCreateReview, type Booking } from "@/lib/jobs";
import { useConversations, useStartConversation } from "@/lib/roles";
import { Badge, Button, Card, Chips, Empty, Input, Loading, Notice, Text, colors, fonts, radius } from "@/ui";

export const ROLE_TITLE: Record<string, string> = {
  customer: "Customer", artisan: "Artisan", employer: "Employer", job_seeker: "Job Seeker", rider: "Rider", admin: "Admin",
};

/** "Switch role" pill shown in every dashboard header — mirrors the web's "Go back to Dashboard". */
export function SwitchRole() {
  return (
    <Pressable onPress={() => router.dismissTo("/hub")} style={s.switch} accessibilityRole="button" accessibilityLabel="Switch role">
      <ArrowLeftRight size={15} color={colors.brand600} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12.5, color: colors.brand600 }}>Switch</Text>
    </Pressable>
  );
}

/** Horizontal tab row for a dashboard. */
export function DashTabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: { id: T; label: string }[]; onChange: (t: T) => void }) {
  return <Chips scroll={false} value={value} onChange={onChange} options={tabs.map((t) => ({ value: t.id, label: t.label }))} />;
}

/** Shown while the active role is being switched on the server. */
export function RoleGate({ ready, role, children }: { ready: boolean; role: Role; children: ReactNode }) {
  if (ready) return <>{children}</>;
  return (
    <View style={{ gap: 12 }}>
      <Text variant="small" center>Opening your {ROLE_TITLE[role]} dashboard…</Text>
      <Loading rows={3} />
    </View>
  );
}

export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" style={{ fontSize: 14 }}>{label}</Text>
        {hint ? <Text variant="caption">{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.brand500, false: colors.line }} thumbColor={colors.white} />
    </View>
  );
}

/** Dashed "choose a file" row. */
export function FilePick({ file, label, onPick }: { file: PickedFile | null; label: string; onPick: () => Promise<PickedFile | null | undefined> }) {
  const [error, setError] = useState("");
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={async () => { setError(""); try { await onPick(); } catch (e) { setError((e as Error).message || "Could not open the picker."); } }}
        style={s.file} accessibilityRole="button">
        {file ? <Paperclip size={20} color={colors.brand500} /> : <Upload size={20} color={colors.brand500} />}
        <Text variant="small" numberOfLines={1} style={{ flex: 1 }}>{file ? file.name : label}</Text>
      </Pressable>
      {error ? <Text variant="caption" color={colors.danger}>{error}</Text> : null}
    </View>
  );
}

export function KV({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 4 }}>
      <Text variant="small">{label}</Text>
      <Text variant="bodyStrong" style={{ fontSize: 14, flexShrink: 1, textAlign: "right" }}>{value ?? "—"}</Text>
    </View>
  );
}

export function confirm(title: string, body: string, ok: string, onOk: () => void, destructive = false) {
  Alert.alert(title, body, [{ text: "Cancel", style: "cancel" }, { text: ok, style: destructive ? "destructive" : "default", onPress: onOk }]);
}

// ================================================================ bookings
const BOOKING_LABEL: Record<Booking["status"], string> = {
  pending: "Pending", accepted: "Accepted", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled",
};

/** Bookings for either side: the artisan accepts / starts / completes, the customer cancels and reviews. */
export function BookingList({ role, bookings, loading, emptyAction }: { role: "artisan" | "customer"; bookings?: Booking[]; loading?: boolean; emptyAction?: () => void }) {
  if (loading) return <Loading rows={3} />;
  if (!bookings?.length) {
    return role === "artisan"
      ? <Empty icon={<CalendarCheck size={26} color={colors.brand500} />} title="No bookings yet" body="Add your services so customers can find and book you." />
      : <Empty icon={<CalendarCheck size={26} color={colors.brand500} />} title="No bookings yet" body="Find a vetted artisan and book in minutes." action="Find artisans" onAction={emptyAction} />;
  }
  return <View style={{ gap: 12 }}>{bookings.map((b) => <BookingCard key={b.id} b={b} role={role} />)}</View>;
}

function BookingCard({ b, role }: { b: Booking; role: "artisan" | "customer" }) {
  const act = useBookingAction();
  const review = useCreateReview();
  const chat = useStartConversation();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const other = role === "artisan" ? b.customer_name : b.artisan_name;
  const otherId = role === "artisan" ? b.customer_user_id : b.artisan_user_id;

  const actions: { label: string; action: "accept" | "start" | "complete" | "cancel"; kind?: "ghost" | "danger" }[] =
    role === "artisan"
      ? b.status === "pending" ? [{ label: "Accept", action: "accept" }, { label: "Decline", action: "cancel", kind: "ghost" }]
        : b.status === "accepted" ? [{ label: "Start job", action: "start" }, { label: "Cancel", action: "cancel", kind: "ghost" }]
          : b.status === "in_progress" ? [{ label: "Mark complete", action: "complete" }] : []
      : ["pending", "accepted"].includes(b.status) ? [{ label: "Cancel booking", action: "cancel", kind: "ghost" }] : [];

  function run(action: (typeof actions)[number]["action"]) {
    setError("");
    act.mutate({ id: b.id, action }, { onError: (e) => setError(apiError(e)) });
  }
  function message() {
    if (!otherId) return;
    setError("");
    chat.mutate({ participant: otherId, booking: b.id }, {
      onSuccess: (c) => router.push(`/messages/${c.id}?name=${encodeURIComponent(other || "Chat")}`),
      onError: (e) => setError(apiError(e, "Could not open the chat.")),
    });
  }

  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text variant="h3">{b.service_title}</Text>
          <Text variant="small">{role === "artisan" ? "Customer" : "Artisan"}: {other}</Text>
        </View>
        <Badge label={BOOKING_LABEL[b.status]} status={b.status === "in_progress" ? "picked_up" : b.status === "accepted" ? "info" : b.status} />
      </View>
      <Text variant="small">{formatDateTime(b.scheduled_for)}{b.address ? ` · ${b.address}` : ""}</Text>
      {b.notes ? <Text variant="caption">“{b.notes}”</Text> : null}
      {Number(b.agreed_price) ? <Text variant="bodyStrong">{naira(b.agreed_price)}</Text> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {actions.map((a) => (
          <Button key={a.label} title={a.label} size="md" kind={a.kind ?? "primary"} loading={act.isPending && act.variables?.action === a.action}
            disabled={act.isPending} style={{ flexGrow: 1 }}
            onPress={() => (a.action === "cancel" ? confirm(`${a.label}?`, b.service_title, a.label, () => run(a.action), true) : run(a.action))} />
        ))}
        {otherId && b.status !== "cancelled" ? (
          <Button title="Message" size="md" kind="secondary" loading={chat.isPending} style={{ flexGrow: 1 }}
            icon={<MessageCircle size={16} color={colors.brand600} />} onPress={message} />
        ) : null}
      </View>
      {role === "customer" && b.status === "completed" && !b.has_review ? (
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

// ================================================================ messages
export function ConversationList({ enabled = true }: { enabled?: boolean }) {
  const list = useConversations(enabled);
  if (!enabled || list.isLoading) return <Loading rows={3} />;
  if (list.isError) return <Notice kind="error">{apiError(list.error, "Could not load your messages.")}</Notice>;
  if (!list.data?.length) {
    return <Empty icon={<MessageCircle size={26} color={colors.brand500} />} title="No conversations yet" body="Chats with customers, artisans and employers appear here." />;
  }
  return (
    <Card style={{ paddingVertical: 4 }}>
      {list.data.map((c, i) => (
        <Pressable key={c.id} onPress={() => router.push(`/messages/${c.id}?name=${encodeURIComponent(c.other_party || "Chat")}`)}
          style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }, i ? { borderTopWidth: 1, borderTopColor: colors.line } : null]}>
          <View style={s.chatIcon}><MessageCircle size={18} color={colors.brand600} /></View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>{c.other_party || c.participant_emails.join(", ")}</Text>
            <Text variant="caption" numberOfLines={1}>{c.context_label || "Direct message"} · {timeAgo(c.created_at)}</Text>
          </View>
          <ChevronRight size={18} color={colors.faint} />
        </Pressable>
      ))}
    </Card>
  );
}

const s = StyleSheet.create({
  switch: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.brand50 },
  file: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brand200 },
  chatIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" },
});
