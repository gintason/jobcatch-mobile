import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BadgeCheck, Building2, ShieldAlert, X } from "lucide-react-native";
import { salary } from "@/components/jobs";
import { useEnsureRole } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { openLink } from "@/lib/checkout";
import { formatDate } from "@/lib/format";
import { useApplyToJob, useMyApplications, useMyCVs, usePublicJob } from "@/lib/jobs";
import { Badge, Button, Card, Input, Loading, Notice, Screen, Select, Text, colors } from "@/ui";
import { ReferralNotice, TELL_EMPLOYER } from "@/components/ReferralNotice";

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: j, isLoading } = usePublicJob(id);
  const apps = useMyApplications();
  const [open, setOpen] = useState(false);
  if (isLoading) return <Screen back title="Job"><Loading /></Screen>;
  if (!j) return <Screen back title="Job"><Notice kind="error">This job is no longer available.</Notice></Screen>;
  const applied = apps.data?.some((a) => a.job === j.id);
  return (
    <Screen back title="Job details"
      footer={applied ? <Notice kind="success">You’ve applied — track it under My applications.</Notice> : <Button title="Apply now" onPress={() => setOpen(true)} />}>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" }}><Building2 size={24} color={colors.brand600} /></View>
          <View style={{ flex: 1 }}>
            <Text variant="h2">{j.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text variant="small">{j.employer_company}</Text>{j.employer_verified ? <BadgeCheck size={15} color={colors.brand500} /> : null}
            </View>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {j.category_name ? <Badge label={j.category_name} tone="neutral" /> : null}
          {j.employer_verified ? <Badge label="Verified employer" tone="info" /> : null}
          {j.is_featured ? <Badge label="Featured" tone="warning" /> : null}
        </View>
        <Text variant="bodyStrong">{salary(j)}</Text>
        <Text variant="caption">Posted {formatDate(j.posted_at || j.created_at)}{j.expires_at ? ` · closes ${formatDate(j.expires_at)}` : ""}</Text>
        {j.employer_website ? <Text variant="small" color={colors.brand500} onPress={() => openLink(j.employer_website!)}>{j.employer_website}</Text> : null}
      </Card>
      <ReferralNotice message={TELL_EMPLOYER} />
      <Card style={{ gap: 8 }}>
        <Text variant="h3">About the role</Text>
        <Text>{j.description}</Text>
      </Card>
      {!j.employer_verified ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <ShieldAlert size={16} color={colors.warning} />
          <Text variant="small" style={{ flex: 1 }}>This employer hasn’t completed business verification. Never pay to apply for a job.</Text>
        </View>
      ) : null}
      {open ? <ApplySheet onClose={() => setOpen(false)} jobId={j.id} title={j.title} /> : null}
    </Screen>
  );
}

function ApplySheet({ onClose, jobId, title }: { onClose: () => void; jobId: string; title: string }) {
  const ready = useEnsureRole("job_seeker");
  const cvs = useMyCVs(ready);
  const apply = useApplyToJob();
  const [cv, setCv] = useState("");
  const [cover, setCover] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  function submit() {
    setError("");
    apply.mutate({ job: jobId, cv, cover_letter: cover }, { onSuccess: () => setDone(true), onError: (e) => setError(apiError(e, "We couldn't send your application.")) });
  }
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white, padding: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text variant="h2" style={{ flex: 1 }} numberOfLines={1}>Apply · {title}</Text>
          <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close"><X size={24} color={colors.brand900} /></Pressable>
        </View>
        {done ? (
          <>
            <Notice kind="success">Application sent! The employer will review your CV. We’ll notify you of any update.</Notice>
            <Button title="Done" onPress={onClose} />
          </>
        ) : (
          <>
            {ready && cvs.data && !cvs.data.length ? (
              <Notice kind="warning">Upload a CV first, then come back to apply.</Notice>
            ) : (
              <Select label="CV to send" value={cv} loading={cvs.isLoading} options={(cvs.data ?? []).map((c) => ({ value: c.id, label: c.title, hint: formatDate(c.created_at) }))} onChange={setCv} />
            )}
            <Button title="Manage CVs" kind="secondary" size="md" onPress={() => { onClose(); router.push("/cvs"); }} />
            <Input label="Cover letter (optional)" value={cover} onChangeText={setCover} multiline maxLength={5000} placeholder="Tell the employer why you're a great fit." />
            {error ? <Notice kind="error">{error}</Notice> : null}
            <Button title="Send application" loading={apply.isPending} disabled={!cv || !ready} onPress={submit} />
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}
