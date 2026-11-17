import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarClock, Eye, Ticket, Users } from "lucide-react-native";
import { ApplicantCard, LISTING_LABEL, PackagePicker, listingTone } from "@/components/employer";
import { salary } from "@/components/jobs";
import { apiError } from "@/lib/api";
import { useEnsureRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { isPaymentRequired, useJobApplicants, useJobLifecycle, useListingCredits, useMyJobs } from "@/lib/roles";
import { Badge, Button, Card, Empty, Loading, Notice, Screen, Section, Text, colors } from "@/ui";

/** Manage one job: listing lifecycle (publish / close / reopen) and its applicants. */
export default function ManageJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ready = useEnsureRole("employer");
  const jobs = useMyJobs(ready);
  const credits = useListingCredits(ready);
  const applicants = useJobApplicants(ready ? id : undefined);
  const life = useJobLifecycle();
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");
  const job = jobs.data?.find((j) => j.id === id);

  function act(action: "publish" | "close" | "reopen") {
    setError("");
    life.mutate({ id: id!, action }, {
      onError: (e) => (isPaymentRequired(e) ? setBuying(true) : setError(apiError(e))),
    });
  }

  if (!ready || jobs.isLoading) return <Screen back title="Job"><Loading /></Screen>;
  if (!job) return <Screen back title="Job"><Empty title="Job not found" body="It may have been removed." action="Back" onAction={() => router.back()} /></Screen>;
  const status = job.listing_status;
  const total = credits.data?.total_credits ?? 0;

  return (
    <Screen back title={job.title} subtitle={`${job.category_name || "General"} · ${salary(job)}`}
      onRefresh={() => { jobs.refetch(); applicants.refetch(); credits.refetch(); }} refreshing={jobs.isRefetching || applicants.isRefetching}>
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="h3">Listing</Text>
          <Badge label={LISTING_LABEL[status]} tone={listingTone(status)} />
        </View>
        {job.published_at ? <Text variant="small">Published {formatDate(job.published_at)}</Text> : null}
        {job.expires_at && status === "active" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><CalendarClock size={15} color={colors.muted} /><Text variant="small">Live until {formatDate(job.expires_at)}</Text></View>
        ) : null}
        {status === "draft" ? <Text variant="small">Not visible to job seekers yet — publish it with a listing credit.</Text> : null}
        {status === "expired" ? <Text variant="small">The listing period ended. Republish to keep receiving applicants.</Text> : null}
        {error ? <Notice kind="error">{error}</Notice> : null}
        <View style={{ gap: 8, marginTop: 4 }}>
          {status === "draft" || status === "expired" ? (total > 0 ? (
            <>
              <Button title={`Publish (1 of ${total} credit${total === 1 ? "" : "s"})`} loading={life.isPending} onPress={() => act("publish")} />
              <Button title="Buy another package" kind="secondary" onPress={() => setBuying(true)} />
            </>
          ) : <Button title="Choose a package & publish" icon={<Ticket size={18} color={colors.white} />} onPress={() => setBuying(true)} />) : null}
          {status === "active" ? <Button title="Close applications" kind="secondary" loading={life.isPending} onPress={() => act("close")} /> : null}
          {status === "closed" ? <Button title="Reopen" loading={life.isPending} onPress={() => act("reopen")} /> : null}
          {status === "active" ? <Button title="View public page" kind="ghost" icon={<Eye size={18} color={colors.brand600} />} onPress={() => router.push(`/jobs/${job.id}`)} /> : null}
        </View>
      </Card>
      {buying ? <PackagePicker jobId={job.id} onDone={() => { jobs.refetch(); credits.refetch(); }} /> : null}

      <Section title={`Applicants (${job.application_count})`}>
        {applicants.isLoading ? <Loading rows={2} /> : applicants.data?.length ? (
          <View style={{ gap: 12 }}>{applicants.data.map((a) => <ApplicantCard key={a.id} a={a} />)}</View>
        ) : <Empty icon={<Users size={26} color={colors.brand500} />} title="No applicants yet" body={status === "active" ? "Applications will appear here." : "Publish the job to start receiving applications."} />}
      </Section>
    </Screen>
  );
}
