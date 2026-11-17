import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BellRing, Check, FileText, MessageCircle, Search, Send } from "lucide-react-native";
import { ConversationList, DashTabs, FilePick, RoleGate, SwitchRole, Toggle } from "@/components/dashboard";
import { JobCard } from "@/components/jobs";
import { ApplicationsList, CVManager } from "@/components/seeker";
import { apiError, type PickedFile } from "@/lib/api";
import { useEnsureRole } from "@/lib/auth";
import { openCheckout, openLink } from "@/lib/checkout";
import { mediaUrl } from "@/lib/config";
import { pickDocument } from "@/lib/files";
import { formatDate, naira } from "@/lib/format";
import { useCategories, usePublicJobs } from "@/lib/jobs";
import {
  startCVServicePayment, startSeekerProCheckout, useCVServiceAccess, useCVSubmissions, useJobAlerts, useSaveJobAlerts, useSeekerPro, useSubmitCVService,
  type JobAlerts,
} from "@/lib/roles";
import { Badge, Button, Card, Empty, Input, Loading, MultiSelect, Notice, Screen, Select, Text, colors, fonts, radius } from "@/ui";

type Tab = "find" | "applications" | "cvs" | "alerts" | "messages" | "cvservice";
const IDS: Tab[] = ["find", "applications", "cvs", "alerts", "messages", "cvservice"];

/** Job seeker dashboard — mirrors /dashboard/seeker on the web. */
export default function SeekerDashboard() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(IDS.includes(params.tab as Tab) ? (params.tab as Tab) : "find");
  const ready = useEnsureRole("job_seeker");
  const pro = useSeekerPro(ready);
  const tabs = [
    { id: "find" as const, label: "Find jobs" }, { id: "applications" as const, label: "My applications" }, { id: "cvs" as const, label: "My CVs" },
    { id: "alerts" as const, label: pro.data?.is_pro ? "Job alerts (Pro)" : "Job alerts" }, { id: "messages" as const, label: "Messages" },
    { id: "cvservice" as const, label: "CV Service" },
  ];
  return (
    <Screen back title="Job Seeker" subtitle="Find work and apply" right={<SwitchRole />}>
      <DashTabs value={tab} onChange={setTab} tabs={tabs} />
      <RoleGate ready={ready} role="job_seeker">
        {tab === "find" ? <FindJobs /> : null}
        {tab === "applications" ? <ApplicationsList /> : null}
        {tab === "cvs" ? <CVManager /> : null}
        {tab === "alerts" ? <AlertsPanel /> : null}
        {tab === "messages" ? <ConversationList /> : null}
        {tab === "cvservice" ? <CVServicePanel /> : null}
      </RoleGate>
    </Screen>
  );
}

function FindJobs() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const cats = useCategories("job");
  const jobs = usePublicJobs({ q: query || undefined, category: category || undefined });
  return (
    <View style={{ gap: 12 }}>
      <Input value={q} onChangeText={setQ} placeholder="Search job title or company" returnKeyType="search" onSubmitEditing={() => setQuery(q.trim())}
        left={<Search size={18} color={colors.faint} />} />
      <Select value={category} onChange={setCategory} loading={cats.isLoading} placeholder="All categories" options={[{ value: "", label: "All categories" }, ...(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
      {jobs.isLoading ? <Loading rows={3} /> : jobs.data?.length ? jobs.data.map((j) => <JobCard key={j.id} j={j} />)
        : <Empty icon={<Search size={26} color={colors.brand500} />} title="No open jobs match" body="Try another search or category." />}
    </View>
  );
}

// ---------------------------------------------------------------- WhatsApp alerts (Pro)
function AlertsPanel() {
  const pro = useSeekerPro();
  const alerts = useJobAlerts();
  if (alerts.isLoading || !alerts.data) return alerts.isError ? <Notice kind="error">{apiError(alerts.error)}</Notice> : <Loading />;
  return (
    <View style={{ gap: 14 }}>
      {pro.data?.is_pro ? (
        <Notice kind="success">
          Pro is active{pro.data.expires_at ? ` until ${formatDate(pro.data.expires_at)}` : ""}. Matching jobs are sent to your WhatsApp and your notifications.
          {alerts.data.last_sent_at ? ` Last alert ${formatDate(alerts.data.last_sent_at)}.` : ""}
        </Notice>
      ) : (
        <LinearGradient colors={[colors.brand900, colors.brand600]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.promo}>
          <BellRing size={28} color={colors.white} />
          <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: 18, marginTop: 6 }}>Get matching jobs on WhatsApp — instantly</Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 19 }}>
            Pro members hear about new jobs the moment they’re posted, before most applicants. {naira(pro.data?.price ?? 3000)}/month.
          </Text>
          {pro.data?.features?.map((f) => (
            <View key={f} style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
              <Check size={14} color={colors.white} style={{ marginTop: 3 }} />
              <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12.5, flex: 1 }}>{f}</Text>
            </View>
          ))}
          <UpgradeButton onDone={() => pro.refetch()} />
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11.5 }}>You can set your preferences below now — alerts start when you upgrade.</Text>
        </LinearGradient>
      )}
      {pro.data?.is_pro ? <UpgradeButton onDone={() => pro.refetch()} renew /> : null}
      <AlertsForm a={alerts.data} />
    </View>
  );
}

function UpgradeButton({ onDone, renew }: { onDone: () => void; renew?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true); setError("");
    try {
      const d = await startSeekerProCheckout();
      await openCheckout(d.authorization_url, d.reference);
      onDone();
    } catch (e) { setError(apiError(e, "Could not start checkout.")); } finally { setBusy(false); }
  }
  return (
    <View style={{ gap: 6, marginTop: renew ? 0 : 6 }}>
      <Button title={renew ? "Renew early (adds 30 days)" : "Upgrade to Pro"} kind={renew ? "secondary" : "light"} size="md" loading={busy} onPress={go} />
      {error ? <Text variant="caption" color={renew ? colors.danger : colors.white}>{error}</Text> : null}
    </View>
  );
}

function AlertsForm({ a }: { a: JobAlerts }) {
  const cats = useCategories("job");
  const save = useSaveJobAlerts();
  const [f, setF] = useState({ whatsapp_number: a.whatsapp_number, keywords: a.keywords, categories: a.categories, is_active: a.is_active });
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  return (
    <Card style={{ gap: 12 }}>
      <Input label="WhatsApp number" value={f.whatsapp_number} onChangeText={(v) => setF({ ...f, whatsapp_number: v })} keyboardType="phone-pad" placeholder="0803 123 4567" />
      <MultiSelect label="Job categories" values={f.categories} onChange={(v) => setF({ ...f, categories: v })} loading={cats.isLoading} max={10}
        options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))} placeholder="All categories" hint="Leave empty to get alerts for every category (up to 10)." />
      <Input label="Keywords (comma-separated, optional)" value={f.keywords} onChangeText={(v) => setF({ ...f, keywords: v })} placeholder="e.g. accountant, remote, Lagos" />
      <Toggle label="Send me job alerts" value={f.is_active} onChange={(v) => setF({ ...f, is_active: v })} />
      {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
      <Button title="Save preferences" loading={save.isPending}
        onPress={() => { setMsg(null); save.mutate(f, { onSuccess: () => setMsg({ kind: "success", text: "Alert preferences saved." }), onError: (e) => setMsg({ kind: "error", text: apiError(e) }) }); }} />
    </Card>
  );
}

// ---------------------------------------------------------------- CV service (paid)
const SUB_LABEL = { pending: "Pending review", reviewed: "Reviewed", forwarded: "Forwarded to employers" } as const;

function CVServicePanel() {
  const access = useCVServiceAccess();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (access.isLoading) return <Loading />;
  if (!access.data?.is_active) {
    const price = access.data?.price ?? 5000;
    return (
      <Card style={{ gap: 10 }}>
        <View style={s.cvIcon}><Send size={22} color={colors.brand600} /></View>
        <Text variant="h2">Let JobCatch send your CV to employers</Text>
        <Text variant="small">Send your CV to the JobCatch team. We review it and forward selected CVs directly to employers who are hiring.</Text>
        {["Reviewed by the JobCatch team", "Forwarded to relevant employers on your behalf", "Submit updated CVs any time"].map((t) => (
          <View key={t} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}><Check size={16} color={colors.success} /><Text variant="small">{t}</Text></View>
        ))}
        <Text style={{ fontFamily: fonts.display, fontSize: 26, color: colors.brand900 }}>{naira(price)} <Text variant="caption">one-off</Text></Text>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <Button title={`Pay ${naira(price)} to unlock`} loading={busy} onPress={async () => {
          setBusy(true); setError("");
          try { const d = await startCVServicePayment(); await openCheckout(d.authorization_url, d.reference); access.refetch(); }
          catch (e) { setError(apiError(e, "Could not start payment.")); } finally { setBusy(false); }
        }} />
      </Card>
    );
  }
  return <CVServicePaid />;
}

function CVServicePaid() {
  const subs = useCVSubmissions();
  const submit = useSubmitCVService();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [headline, setHeadline] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 12 }}>
        <Text variant="h3">Submit your CV</Text>
        <Input label="Headline" value={headline} onChangeText={setHeadline} placeholder="e.g. Chartered accountant, 6 years" />
        <Input label="Note to the team (optional)" value={note} onChangeText={setNote} multiline placeholder="Roles or locations you're targeting" />
        <FilePick file={file} label="Choose your CV (PDF or Word)" onPick={async () => { const f = await pickDocument(); if (f) setFile(f); return f; }} />
        {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
        <Button title="Send to JobCatch" loading={submit.isPending} disabled={!file || !headline.trim()}
          onPress={() => { setMsg(null); submit.mutate({ cv_file: file!, headline: headline.trim(), note: note.trim() }, {
            onSuccess: () => { setFile(null); setHeadline(""); setNote(""); setMsg({ kind: "success", text: "CV sent. We'll review it shortly." }); },
            onError: (e) => setMsg({ kind: "error", text: apiError(e, "Could not send your CV.") }),
          }); }} />
      </Card>
      {subs.isLoading ? <Loading rows={2} /> : subs.data?.length ? (
        <Card style={{ paddingVertical: 4 }}>
          {subs.data.map((sb, i) => (
            <View key={sb.id} style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }, i ? { borderTopWidth: 1, borderTopColor: colors.line } : null]}>
              <FileText size={20} color={colors.brand600} />
              <Pressable style={{ flex: 1 }} disabled={!sb.cv_file_url} onPress={() => sb.cv_file_url && openLink(mediaUrl(sb.cv_file_url))}>
                <Text variant="bodyStrong" numberOfLines={1}>{sb.headline || "CV submission"}</Text>
                <Text variant="caption">{formatDate(sb.created_at)}</Text>
              </Pressable>
              <Badge label={SUB_LABEL[sb.status]} status={sb.status === "forwarded" ? "completed" : sb.status === "pending" ? "pending" : "info"} />
            </View>
          ))}
        </Card>
      ) : <Empty icon={<MessageCircle size={26} color={colors.brand500} />} title="No submissions yet" body="Your submitted CVs and their status appear here." />}
    </View>
  );
}

const s = StyleSheet.create({
  promo: { borderRadius: radius.lg, padding: 18, gap: 8 },
  cvIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" },
});
