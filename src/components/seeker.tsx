/** Job-seeker building blocks shared by the dashboard and the standalone screens. */
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Briefcase, FileText, Trash2 } from "lucide-react-native";
import { FilePick } from "@/components/dashboard";
import { apiError, type PickedFile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { openLink } from "@/lib/checkout";
import { mediaUrl } from "@/lib/config";
import { pickDocument } from "@/lib/files";
import { formatDate } from "@/lib/format";
import { useDeleteCV, useMyApplications, useMyCVs, useUploadCV } from "@/lib/jobs";
import { Badge, Button, Card, Empty, Input, Loading, Notice, Section, Text, colors } from "@/ui";

const APP_LABEL = { submitted: "Submitted", shortlisted: "Shortlisted", rejected: "Not selected", hired: "Hired" } as const;

export function ApplicationsList({ enabled = true }: { enabled?: boolean }) {
  const { user } = useAuth();
  const apps = useMyApplications(enabled);
  const mine = apps.data?.filter((a) => !a.seeker_email || a.seeker_email === user?.email);
  if (!enabled || apps.isLoading) return <Loading />;
  if (!mine?.length) {
    return <Empty icon={<Briefcase size={26} color={colors.brand500} />} title="No applications yet" body="Find a role you like and apply in a few taps." action="Browse jobs" onAction={() => router.push("/jobs")} />;
  }
  return (
    <Card style={{ paddingVertical: 4 }}>
      {mine.map((a, i) => (
        <Pressable key={a.id} onPress={() => router.push(`/jobs/${a.job}`)}
          style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }, i ? { borderTopWidth: 1, borderTopColor: colors.line } : null]}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={1}>{a.job_title}</Text>
            <Text variant="caption">Applied {formatDate(a.created_at)}</Text>
          </View>
          <Badge label={APP_LABEL[a.status]} status={a.status} />
        </Pressable>
      ))}
    </Card>
  );
}

export function CVManager({ enabled = true }: { enabled?: boolean }) {
  const cvs = useMyCVs(enabled);
  const upload = useUploadCV();
  const del = useDeleteCV();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState("");
  async function pick() {
    const f = await pickDocument();
    if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, "")); }
    return f;
  }
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 12 }}>
        <Text variant="h3">Upload a CV</Text>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Accountant CV 2026" />
        <FilePick file={file} label="Choose a PDF or Word document" onPick={pick} />
        {error ? <Notice kind="error">{error}</Notice> : null}
        <Button title="Upload" loading={upload.isPending} disabled={!file || !title.trim()}
          onPress={() => { setError(""); upload.mutate({ title: title.trim(), file: file! }, { onSuccess: () => { setFile(null); setTitle(""); }, onError: (e) => setError(apiError(e, "Upload failed.")) }); }} />
      </Card>
      <Section title="Your CVs">
        {!enabled || cvs.isLoading ? <Loading rows={2} /> : cvs.data?.length ? (
          <Card style={{ paddingVertical: 4 }}>
            {cvs.data.map((c, i) => (
              <View key={c.id} style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }, i ? { borderTopWidth: 1, borderTopColor: colors.line } : null]}>
                <FileText size={20} color={colors.brand600} />
                <Pressable style={{ flex: 1 }} onPress={() => openLink(mediaUrl(c.file))}>
                  <Text variant="bodyStrong" numberOfLines={1}>{c.title}</Text>
                  <Text variant="caption">{formatDate(c.created_at)}</Text>
                </Pressable>
                <Pressable hitSlop={10} accessibilityLabel={`Delete ${c.title}`}
                  onPress={() => Alert.alert("Delete CV?", c.title, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => del.mutate(c.id) }])}>
                  <Trash2 size={18} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </Card>
        ) : <Empty icon={<FileText size={26} color={colors.brand500} />} title="No CVs yet" body="Upload one to start applying." />}
      </Section>
    </View>
  );
}
