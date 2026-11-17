import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Briefcase, ChevronRight, FileText, Receipt, ShieldCheck, Users } from "lucide-react-native";
import { ConversationList, DashTabs, RoleGate, SwitchRole, Toggle } from "@/components/dashboard";
import { ApplicantCard, LISTING_LABEL, PackagePicker, listingTone } from "@/components/employer";
import { salary } from "@/components/jobs";
import { EmployerVerification } from "@/components/kyc";
import { apiError } from "@/lib/api";
import { useEnsureRole } from "@/lib/auth";
import { openLink } from "@/lib/checkout";
import { mediaUrl } from "@/lib/config";
import { formatDate, naira } from "@/lib/format";
import { useCategories } from "@/lib/jobs";
import {
  useCreateJob, useEmployerApplications, useListingCredits, useMyJobs, usePayments, useReferredCVs, useRoleProfile, useSaveRoleProfile,
  type EmployerJob, type EmployerProfile,
} from "@/lib/roles";
import { Badge, Button, Card, Empty, Input, Loading, Notice, Screen, Select, Text, colors, fonts } from "@/ui";

type Tab = "company" | "verification" | "post" | "jobs" | "applications" | "referred" | "billing" | "messages";
const IDS: Tab[] = ["company", "verification", "post", "jobs", "applications", "referred", "billing", "messages"];

/** Employer dashboard — mirrors /dashboard/employer on the web. */
export default function EmployerDashboard() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(IDS.includes(params.tab as Tab) ? (params.tab as Tab) : "jobs");
  const ready = useEnsureRole("employer");
  const profile = useRoleProfile<EmployerProfile>("employer", ready);
  const jobs = useMyJobs(ready);
  const tabs: { id: Tab; label: string }[] = [
    { id: "jobs", label: "My jobs" }, { id: "post", label: "Post a job" }, { id: "applications", label: "Applications" },
    { id: "company", label: "Company profile" }, { id: "verification", label: profile.data?.is_cac_verified ? "Verified ✓" : "Verification" },
    { id: "referred", label: "Referred CVs" }, { id: "billing", label: "Billing & credits" }, { id: "messages", label: "Messages" },
  ];
  return (
    <Screen back title="Employer" subtitle={profile.data?.company_name || "Post jobs and hire"} right={<SwitchRole />}
      onRefresh={() => { profile.refetch(); jobs.refetch(); }} refreshing={profile.isRefetching || jobs.isRefetching}>
      <DashTabs value={tab} onChange={setTab} tabs={tabs} />
      <RoleGate ready={ready} role="employer">
        {tab === "company" ? (profile.data ? <CompanyProfile p={profile.data} /> : <Loading />) : null}
        {tab === "verification" ? <EmployerVerification /> : null}
        {tab === "post" ? <PostJob verified={!!profile.data?.is_cac_verified} loading={profile.isLoading} onVerify={() => setTab("verification")} onPosted={() => setTab("jobs")} /> : null}
        {tab === "jobs" ? <MyJobs jobs={jobs.data} loading={jobs.isLoading} onPost={() => setTab("post")} /> : null}
        {tab === "applications" ? <AllApplications /> : null}
        {tab === "referred" ? <ReferredCVs /> : null}
        {tab === "billing" ? <Billing /> : null}
        {tab === "messages" ? <ConversationList /> : null}
      </RoleGate>
    </Screen>
  );
}

// ---------------------------------------------------------------- company profile
function CompanyProfile({ p }: { p: EmployerProfile }) {
  const save = useSaveRoleProfile();
  const [f, setF] = useState({
    company_name: p.company_name ?? "", address: p.address ?? "", contact_email: p.contact_email ?? "",
    phone: p.phone ?? "", website: p.website ?? "", cac_number: p.cac_number ?? "",
  });
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="h3">Company profile</Text>
      <Text variant="caption">Job seekers see these details on your postings, so keep them current.</Text>
      <Input label="Company name" value={f.company_name} onChangeText={(v) => set("company_name", v)} placeholder="e.g. Bright Works Ltd" />
      <Input label="Company address" value={f.address} onChangeText={(v) => set("address", v)} placeholder="e.g. 12 Ademola Street, Ikeja, Lagos" />
      <Input label="Contact email" value={f.contact_email} onChangeText={(v) => set("contact_email", v)} keyboardType="email-address" autoCapitalize="none" placeholder="hr@company.com" />
      <Input label="Telephone" value={f.phone} onChangeText={(v) => set("phone", v)} keyboardType="phone-pad" placeholder="+234…" />
      <Input label="Website" value={f.website} onChangeText={(v) => set("website", v)} autoCapitalize="none" keyboardType="url" placeholder="https://company.com" />
      <Input label="CAC number (optional)" value={f.cac_number} onChangeText={(v) => set("cac_number", v)} placeholder="RC…" />
      {msg ? <Notice kind={msg.kind}>{msg.text}</Notice> : null}
      <Button title="Save company profile" loading={save.isPending}
        onPress={() => { setMsg(null); save.mutate(f, { onSuccess: () => setMsg({ kind: "success", text: "Company profile saved." }), onError: (e) => setMsg({ kind: "error", text: apiError(e) }) }); }} />
    </Card>
  );
}

// ---------------------------------------------------------------- post a job
function PostJob({ verified, loading, onVerify, onPosted }: { verified: boolean; loading: boolean; onVerify: () => void; onPosted: () => void }) {
  const cats = useCategories("job");
  const create = useCreateJob();
  const [f, setF] = useState({ title: "", category: "", description: "", salary_min: "", salary_max: "", is_open: true });
  const [draft, setDraft] = useState<EmployerJob | null>(null);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  if (loading) return <Loading />;
  if (!verified) {
    return (
      <Card style={{ gap: 10, alignItems: "center" }}>
        <ShieldCheck size={40} color={colors.brand400} />
        <Text variant="h2" center>Verify your business to post jobs</Text>
        <Text variant="small" center>To keep JobCatch free of fake listings, only verified employers can post. Confirm your email and phone, add your CAC, TIN and director or company representative details, and upload your documents.</Text>
        <Button title="Start verification" onPress={onVerify} style={{ alignSelf: "stretch" }} />
      </Card>
    );
  }
  if (draft) {
    return (
      <View style={{ gap: 14 }}>
        <Notice kind="warning">“{draft.title}” is saved as a draft. Choose a listing package — your job goes live the moment payment is confirmed.</Notice>
        <PackagePicker jobId={draft.id} />
        <Button title="I’ll publish it later from My jobs" kind="ghost" onPress={() => { setDraft(null); onPosted(); }} />
      </View>
    );
  }
  function submit() {
    setError("");
    create.mutate({
      title: f.title.trim(), category: f.category, description: f.description.trim(),
      salary_min: f.salary_min || null, salary_max: f.salary_max || null, is_open: f.is_open, publish: true,
    }, {
      onSuccess: (job) => {
        setF({ title: "", category: "", description: "", salary_min: "", salary_max: "", is_open: true });
        if (job.payment_required || job.listing_status === "draft") setDraft(job);
        else onPosted();
      },
      onError: (e) => setError(apiError(e, "Could not post the job.")),
    });
  }
  return (
    <Card style={{ gap: 12 }}>
      <Text variant="h3">Post a job</Text>
      <Input label="Job title" value={f.title} onChangeText={(v) => set("title", v)} placeholder="e.g. Frontend Developer" />
      <Select label="Category" value={f.category} onChange={(v) => set("category", v)} loading={cats.isLoading}
        options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))} placeholder="Choose a category" />
      <Input label="Description" value={f.description} onChangeText={(v) => set("description", v)} multiline style={{ minHeight: 160 }}
        placeholder={"Responsibilities, requirements, how to apply…"} hint="Line breaks are kept exactly as you type them." />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><Input label="Salary min (₦)" value={f.salary_min} onChangeText={(v) => set("salary_min", v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="Optional" /></View>
        <View style={{ flex: 1 }}><Input label="Salary max (₦)" value={f.salary_max} onChangeText={(v) => set("salary_max", v.replace(/\D/g, ""))} keyboardType="number-pad" placeholder="Optional" /></View>
      </View>
      <Toggle label="Accept applications" value={f.is_open} onChange={(v) => set("is_open", v)} />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Button title="Post job" loading={create.isPending} disabled={!f.title.trim() || !f.category || !f.description.trim()} onPress={submit} />
      <Text variant="caption" center>If you have a listing credit it’s used automatically; otherwise you’ll choose a package next.</Text>
    </Card>
  );
}

// ---------------------------------------------------------------- my jobs
function MyJobs({ jobs, loading, onPost }: { jobs?: EmployerJob[]; loading: boolean; onPost: () => void }) {
  if (loading) return <Loading />;
  if (!jobs?.length) return <Empty icon={<Briefcase size={26} color={colors.brand500} />} title="No jobs yet" body="Post your first role to start receiving CVs." action="Post a job" onAction={onPost} />;
  return (
    <View style={{ gap: 12 }}>
      {jobs.map((j) => (
        <Card key={j.id} onPress={() => router.push(`/dashboard/job/${j.id}`)} style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <Text variant="h3" style={{ flex: 1 }} numberOfLines={2}>{j.title}</Text>
            <Badge label={LISTING_LABEL[j.listing_status]} tone={listingTone(j.listing_status)} />
          </View>
          <Text variant="caption">{j.category_name || "General"} · {salary(j)}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Users size={14} color={colors.brand600} />
            <Text variant="small" color={colors.brand600} style={{ flex: 1 }}>{j.application_count} applicant{j.application_count === 1 ? "" : "s"}</Text>
            <Text variant="caption">Manage</Text><ChevronRight size={16} color={colors.faint} />
          </View>
        </Card>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------- all applications
function AllApplications() {
  const list = useEmployerApplications();
  if (list.isLoading) return <Loading />;
  if (!list.data?.length) return <Empty icon={<Users size={26} color={colors.brand500} />} title="No applications yet" body="Applications to your jobs appear here." />;
  return <View style={{ gap: 12 }}>{list.data.map((a) => <ApplicantCard key={a.id} a={a} showJob />)}</View>;
}

// ---------------------------------------------------------------- referred CVs
function ReferredCVs() {
  const list = useReferredCVs();
  if (list.isLoading) return <Loading />;
  return (
    <View style={{ gap: 12 }}>
      <Text variant="small">Candidates shortlisted and sent to you by the JobCatch team.</Text>
      {list.data?.length ? list.data.map((c) => (
        <Card key={c.id} style={{ gap: 4 }}>
          <Text variant="bodyStrong">{c.seeker_name || c.seeker_email}</Text>
          {c.headline ? <Text variant="small">{c.headline}</Text> : null}
          {c.admin_note ? <Text variant="caption">JobCatch note: {c.admin_note}</Text> : null}
          <Text variant="caption">{formatDate(c.created_at)}{c.seeker_name ? ` · ${c.seeker_email}` : ""}</Text>
          {c.cv_file_url ? <Button title="View CV" size="md" kind="secondary" icon={<FileText size={16} color={colors.brand600} />} onPress={() => openLink(mediaUrl(c.cv_file_url))} /> : null}
        </Card>
      )) : <Empty icon={<FileText size={26} color={colors.brand500} />} title="No CVs yet" body="The JobCatch team forwards shortlisted candidates here." />}
    </View>
  );
}

// ---------------------------------------------------------------- billing
function Billing() {
  const credits = useListingCredits();
  const payments = usePayments();
  const [buying, setBuying] = useState(false);
  return (
    <View style={{ gap: 14 }}>
      <Card style={{ gap: 6 }}>
        <Text variant="small">Listing credits available</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.brand900 }}>{credits.isLoading ? "…" : credits.data?.total_credits ?? 0}</Text>
        {credits.data?.featured_credits ? <Text variant="caption">{credits.data.featured_credits} featured</Text> : null}
        <Text variant="label" style={{ marginTop: 6 }}>Active packages</Text>
        {credits.data?.active.length ? credits.data.active.map((p) => (
          <View key={p.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 4 }}>
            <Text variant="small" style={{ flex: 1 }}>{p.package_name}</Text>
            <Text variant="caption">{p.credits_remaining}/{p.credits_total} left{p.expires_at ? ` · until ${formatDate(p.expires_at)}` : ""}</Text>
          </View>
        )) : <Text variant="caption">None yet.</Text>}
        {!buying ? <Button title="Buy listing credits" kind="secondary" size="md" style={{ marginTop: 6 }} onPress={() => setBuying(true)} /> : null}
      </Card>
      {buying ? <PackagePicker onDone={() => credits.refetch()} /> : null}
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Receipt size={18} color={colors.brand500} /><Text variant="h3">Payments & invoices</Text>
        </View>
        {payments.isLoading ? <Loading rows={2} /> : payments.data?.length ? payments.data.map((p, i) => (
          <View key={p.id} style={[{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }, i ? { borderTopWidth: 1, borderTopColor: colors.line } : null]}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" numberOfLines={1} style={{ fontSize: 14 }}>{p.description || p.purpose_label}</Text>
              <Text variant="caption">{[p.invoice_number, formatDate(p.paid_at ?? p.created_at)].filter(Boolean).join(" · ")}</Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 3 }}>
              <Text variant="bodyStrong" style={{ fontSize: 14 }}>{naira(p.amount)}</Text>
              <Badge label={p.status === "success" ? "Paid" : p.status} status={p.status} />
            </View>
          </View>
        )) : <Text variant="caption">No payments yet.</Text>}
      </Card>
      <Pressable onPress={() => router.push("/jobs")}><Text variant="caption" center color={colors.brand500}>See how your jobs look to seekers ›</Text></Pressable>
    </View>
  );
}
