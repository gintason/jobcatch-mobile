/** Employer building blocks: listing packages, listing status. */
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check, FileText, Star, Zap } from "lucide-react-native";
import { apiError } from "@/lib/api";
import { openCheckout, openLink } from "@/lib/checkout";
import { mediaUrl } from "@/lib/config";
import { formatDate, naira } from "@/lib/format";
import { useApplicantAction, useJobPackages, usePurchasePackage, type Applicant, type JobPackage, type ListingStatus } from "@/lib/roles";
import { Badge, Button, Card, Loading, Notice, Text, colors, fonts, radius } from "@/ui";

export const LISTING_LABEL: Record<ListingStatus, string> = { draft: "Draft", active: "Live", expired: "Expired", closed: "Closed" };
export const listingTone = (s: ListingStatus) => (s === "active" ? "success" : s === "draft" ? "warning" : "neutral") as "success" | "warning" | "neutral";

/**
 * Choose a job-listing package and pay. With `jobId`, that job goes live as
 * soon as payment is confirmed; otherwise the credits go to the balance.
 */
export function PackagePicker({ jobId, onDone }: { jobId?: string; onDone?: () => void }) {
  const packages = useJobPackages();
  const purchase = usePurchasePackage();
  const [selected, setSelected] = useState<JobPackage | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  function pay() {
    if (!selected) return;
    setError(""); setNote("");
    purchase.mutate({ package: selected.id, job: jobId }, {
      onSuccess: async (d) => {
        if (d.authorization_url) {
          await openCheckout(d.authorization_url, d.reference);
          setNote(jobId ? "If your payment went through, the job is now live. Pull down to refresh." : "If your payment went through, your credits are now available.");
        }
        onDone?.();
      },
      onError: (e) => setError(apiError(e, "Could not start checkout.")),
    });
  }

  if (packages.isLoading) return <Loading rows={2} />;
  if (!packages.data?.length) return <Notice kind="warning">No listing packages are available right now.</Notice>;
  const free = selected && Number(selected.price) === 0;
  return (
    <View style={{ gap: 12 }}>
      {packages.data.map((p) => {
        const on = selected?.id === p.id;
        return (
          <Pressable key={p.id} onPress={() => setSelected(p)} style={[s.pkg, on && s.pkgOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
            {p.highlight_label ? <View style={s.ribbon}><Text style={{ fontSize: 10.5, fontFamily: fonts.displayBold, color: colors.brand900 }}>{p.highlight_label}</Text></View> : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {p.is_featured ? <Star size={16} color={colors.amber} fill={colors.amber} /> : <Zap size={16} color={colors.brand500} />}
              <Text style={{ fontFamily: fonts.displayBold, fontSize: 15, color: colors.brand900 }}>{p.name}</Text>
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.brand900 }}>{Number(p.price) === 0 ? "Free" : naira(p.price)}</Text>
            {p.description ? <Text variant="caption">{p.description}</Text> : null}
            {p.features.map((f) => (
              <View key={f} style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
                <Check size={14} color={colors.brand500} style={{ marginTop: 2 }} />
                <Text variant="caption" style={{ flex: 1 }}>{f}</Text>
              </View>
            ))}
          </Pressable>
        );
      })}
      {error ? <Notice kind="error">{error}</Notice> : null}
      {note ? <Notice kind="info">{note}</Notice> : null}
      <Button disabled={!selected} loading={purchase.isPending} onPress={pay}
        title={!selected ? "Choose a package" : free ? `Activate ${selected.name}` : `Pay ${naira(selected.price)}${jobId ? " & publish" : ""}`} />
      {jobId ? <Text variant="caption" center>Your job goes live as soon as the payment is confirmed.</Text> : null}
    </View>
  );
}

export const APP_LABEL = { submitted: "New", shortlisted: "Shortlisted", rejected: "Rejected", hired: "Hired" } as const;

export function ApplicantCard({ a, showJob }: { a: Applicant; showJob?: boolean }) {
  const act = useApplicantAction();
  const [error, setError] = useState("");
  const actions = a.status === "submitted" ? [{ label: "Shortlist", action: "shortlist" as const }, { label: "Reject", action: "reject" as const, ghost: true }]
    : a.status === "shortlisted" ? [{ label: "Hire", action: "hire" as const }, { label: "Reject", action: "reject" as const, ghost: true }] : [];
  return (
    <Card style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>{a.seeker_name || a.seeker_email}</Text>
          {a.seeker_name && a.seeker_email ? <Text variant="caption" numberOfLines={1}>{a.seeker_email}</Text> : null}
          {showJob ? <Text variant="caption" color={colors.brand600} numberOfLines={1}>{a.job_title}</Text> : null}
        </View>
        <Badge label={APP_LABEL[a.status]} status={a.status} />
      </View>
      <Text variant="caption">Applied {formatDate(a.created_at)}</Text>
      {a.cover_letter ? <Text variant="small" numberOfLines={5}>{a.cover_letter}</Text> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
        {a.cv_file ? <Button title="View CV" size="md" kind="secondary" icon={<FileText size={16} color={colors.brand600} />} style={{ flexGrow: 1 }} onPress={() => openLink(mediaUrl(a.cv_file))} /> : null}
        {actions.map((x) => (
          <Button key={x.action} title={x.label} size="md" kind={x.ghost ? "ghost" : "primary"} style={{ flexGrow: 1 }}
            loading={act.isPending && act.variables?.action === x.action} disabled={act.isPending}
            onPress={() => { setError(""); act.mutate({ id: a.id, action: x.action }, { onError: (e) => setError(apiError(e)) }); }} />
        ))}
      </View>
    </Card>
  );
}


const s = StyleSheet.create({
  pkg: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, gap: 4, borderWidth: 1.5, borderColor: colors.line },
  pkgOn: { borderColor: colors.brand500, backgroundColor: colors.brand50 },
  ribbon: { position: "absolute", top: -10, right: 12, backgroundColor: colors.amber, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
});
