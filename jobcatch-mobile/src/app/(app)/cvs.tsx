import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { FileText, Trash2, Upload } from "lucide-react-native";
import { apiError, type PickedFile } from "@/lib/api";
import { useEnsureRole } from "@/lib/auth";
import { openLink } from "@/lib/checkout";
import { mediaUrl } from "@/lib/config";
import { pickDocument } from "@/lib/files";
import { formatDate } from "@/lib/format";
import { useDeleteCV, useMyCVs, useUploadCV } from "@/lib/jobs";
import { Button, Card, Empty, Input, Loading, Notice, Screen, Section, Text, colors, radius } from "@/ui";

export default function CVs() {
  const ready = useEnsureRole("job_seeker");
  const cvs = useMyCVs(ready);
  const upload = useUploadCV();
  const del = useDeleteCV();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState("");
  return (
    <Screen back title="My CVs" onRefresh={() => cvs.refetch()} refreshing={cvs.isRefetching}>
      <Card style={{ gap: 12 }}>
        <Text variant="h3">Upload a CV</Text>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Accountant CV 2026" />
        <Pressable onPress={async () => { const f = await pickDocument(); if (f) { setFile(f); if (!title) setTitle(f.name.replace(/\.[^.]+$/, "")); } }}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.brand200 }}>
          <Upload size={20} color={colors.brand500} />
          <Text variant="small" style={{ flex: 1 }}>{file ? file.name : "Choose a PDF or Word document"}</Text>
        </Pressable>
        {error ? <Notice kind="error">{error}</Notice> : null}
        <Button title="Upload" loading={upload.isPending} disabled={!file || !title.trim()}
          onPress={() => { setError(""); upload.mutate({ title: title.trim(), file: file! }, { onSuccess: () => { setFile(null); setTitle(""); }, onError: (e) => setError(apiError(e, "Upload failed.")) }); }} />
      </Card>
      <Section title="Your CVs">
        {!ready || cvs.isLoading ? <Loading rows={2} /> : cvs.data?.length ? (
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
    </Screen>
  );
}
