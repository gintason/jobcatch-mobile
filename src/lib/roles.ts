/**
 * Data hooks for the role dashboards (artisan, employer, job seeker, customer)
 * — the same endpoints the web dashboards use.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, appendFile, results, type PickedFile } from "./api";

// ================================================================ profile (role-polymorphic)
export interface ArtisanProfile {
  phone?: string | null; show_phone?: boolean; bio: string; service_radius_km: number; is_available: boolean;
  city?: string; area?: string; state?: string; avg_rating: string; rating_count: number;
  is_featured: boolean; is_work_verified: boolean; location: { latitude: number; longitude: number } | null;
}
export interface EmployerProfile {
  company_name?: string | null; cac_number?: string | null; website?: string | null; is_cac_verified?: boolean;
  address?: string | null; contact_email?: string | null; phone?: string | null;
}
export type ProfilePatch = Partial<ArtisanProfile> & Partial<EmployerProfile> & { latitude?: number; longitude?: number };

export function useRoleProfile<T>(role: string, enabled = true) {
  return useQuery({ queryKey: ["my-profile", role], queryFn: () => api.get<T>("/me/profile/"), enabled });
}
export function useSaveRoleProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => api.patch("/me/profile/", patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-profile"] }),
  });
}

// ================================================================ artisan: services + portfolio
export interface Service { id: string; category: string; category_name?: string; title: string; description: string; base_price: string; is_active: boolean }
export interface PortfolioItem { id: string; image: string; caption: string; created_at: string }

export function useMyServices(enabled = true) {
  return useQuery({ queryKey: ["my-services"], queryFn: async () => results<Service>(await api.get("/services/", { mine: "true" })), enabled });
}
export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { category: string; title: string; description: string; base_price: string }) => api.post<Service>("/services/", p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-services"] }),
  });
}
export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/services/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ["my-services"] }) });
}
export function usePortfolio(enabled = true) {
  return useQuery({ queryKey: ["portfolio"], queryFn: async () => results<PortfolioItem>(await api.get("/artisan/portfolio/")), enabled });
}
export function useUploadPortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ image, caption }: { image: PickedFile; caption: string }) => {
      const fd = new FormData();
      appendFile(fd, "image", image);
      fd.append("caption", caption);
      return api.upload("POST", "/artisan/portfolio/", fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }),
  });
}
export function useDeletePortfolio() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/artisan/portfolio/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio"] }) });
}

// ================================================================ artisan verification (paid)
export interface ArtisanVerification {
  id: string; status: "draft" | "awaiting_payment" | "pending_review" | "verified" | "rejected"; status_label: string; is_editable: boolean;
  categories: string[]; category_names: string[]; years_experience: number | null;
  id_type: "" | "nin" | "voters_card" | "drivers_licence" | "intl_passport"; id_number_masked: string; trade_credentials: string;
  documents: { id: string; doc_type: string; doc_type_label: string; original_name: string; created_at: string }[];
  fee: string; fee_paid: boolean; fee_paid_at: string | null;
  requirements: Record<"categories" | "experience" | "identity" | "government_id_document", boolean>;
  submitted_at: string | null; reviewed_at: string | null; review_note: string;
}
const AV = ["artisan-verification"];
export function useArtisanVerification(enabled = true) {
  return useQuery({ queryKey: AV, queryFn: () => api.get<ArtisanVerification>("/artisan-verification/"), enabled });
}
export function useSaveArtisanVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: { categories?: string[]; years_experience?: number | null; id_type?: string; id_number?: string; trade_credentials?: string }) =>
      api.patch<ArtisanVerification>("/artisan-verification/", patch),
    onSuccess: (d) => qc.setQueryData(AV, d),
  });
}
export function useUploadArtisanDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ doc_type, file }: { doc_type: string; file: PickedFile }) => {
      const fd = new FormData();
      fd.append("doc_type", doc_type);
      appendFile(fd, "file", file);
      return api.upload("POST", "/artisan-verification/documents/", fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: AV }),
  });
}
export function useDeleteArtisanDoc() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/artisan-verification/documents/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: AV }) });
}
export function useSubmitArtisanVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ArtisanVerification & { authorization_url: string | null; reference?: string | null }>("/artisan-verification/submit/", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: AV }),
  });
}

// ================================================================ employer KYC
export type KYCDocType = "cac_certificate" | "utility_bill" | "government_id" | "tin_certificate" | "other";
export interface EmployerKYC {
  id: string; status: "not_started" | "in_progress" | "pending" | "verified" | "rejected"; status_label: string; is_editable: boolean;
  registered_name: string; company_type: "RC" | "BN" | "IT"; cac_number: string; tin: string; director_name: string; director_nin_masked: string;
  business_address: string; state: string; contact_email: string; contact_phone: string; is_email_verified: boolean; is_phone_verified: boolean;
  checks: Record<"cac" | "tin" | "nin", { status: "passed" | "failed" | "error" | "skipped"; message: string }>;
  documents: { id: string; doc_type: KYCDocType; doc_type_label: string; original_name: string; status: "pending" | "accepted" | "rejected"; review_note: string; created_at: string }[];
  requirements: { details_complete: boolean; missing_fields: string[]; email_verified: boolean; phone_verified: boolean; documents_complete: boolean; missing_documents: KYCDocType[] };
  can_submit: boolean; submitted_at: string | null; reviewed_at: string | null; rejection_reason: string;
}
export type KYCPatch = Partial<Pick<EmployerKYC, "registered_name" | "company_type" | "cac_number" | "tin" | "director_name" | "business_address" | "state" | "contact_email" | "contact_phone">> & { director_nin?: string };

const KYC = ["employer-kyc"];
function useKycMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => { qc.invalidateQueries({ queryKey: KYC }); qc.invalidateQueries({ queryKey: ["my-profile"] }); } });
}
export function useEmployerKYC(enabled = true) {
  return useQuery({ queryKey: KYC, queryFn: () => api.get<EmployerKYC>("/kyc/employer/"), enabled });
}
export const useSaveKYC = () => useKycMutation((p: KYCPatch) => api.patch("/kyc/employer/", p));
export const useSendKYCOtp = () => useMutation({ mutationFn: (channel: "email" | "sms") => api.post("/kyc/employer/otp/send/", { channel }) });
export const useVerifyKYCOtp = () => useKycMutation((v: { channel: "email" | "sms"; code: string }) => api.post("/kyc/employer/otp/verify/", v));
export const useUploadKYCDoc = () => useKycMutation(({ doc_type, file }: { doc_type: KYCDocType; file: PickedFile }) => {
  const fd = new FormData();
  fd.append("doc_type", doc_type);
  appendFile(fd, "file", file);
  return api.upload("POST", "/kyc/employer/documents/", fd);
});
export const useDeleteKYCDoc = () => useKycMutation((id: string) => api.delete(`/kyc/employer/documents/${id}/`));
export const useSubmitKYC = () => useKycMutation(() => api.post("/kyc/employer/submit/", {}));

// ================================================================ employer jobs + applicants
export type ListingStatus = "draft" | "active" | "expired" | "closed";
export interface EmployerJob {
  id: string; title: string; description: string; category: string; category_name: string | null;
  salary_min: string | null; salary_max: string | null; is_open: boolean; application_count: number;
  listing_status: ListingStatus; is_featured: boolean; published_at: string | null; expires_at: string | null; created_at: string;
  payment_required?: boolean;
}
export interface Applicant {
  id: string; job: string; job_title: string; seeker_email?: string; seeker_name?: string; cv_file: string | null;
  cover_letter: string; status: "submitted" | "shortlisted" | "rejected" | "hired"; created_at: string;
}
export function useMyJobs(enabled = true) {
  return useQuery({ queryKey: ["my-jobs"], queryFn: async () => results<EmployerJob>(await api.get("/jobs/", { mine: "true" })), enabled });
}
export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { title: string; description: string; category: string; salary_min?: string | null; salary_max?: string | null; is_open: boolean; publish: boolean }) =>
      api.post<EmployerJob>("/jobs/", p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-jobs"] }),
  });
}
export function useJobLifecycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "publish" | "close" | "reopen" }) => api.post<EmployerJob>(`/jobs/${id}/${action}/`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-jobs"] }); qc.invalidateQueries({ queryKey: ["listing-credits"] }); },
  });
}
export function useJobApplicants(jobId?: string) {
  return useQuery({ queryKey: ["job-applicants", jobId], queryFn: async () => results<Applicant>(await api.get(`/jobs/${jobId}/applications/`)), enabled: !!jobId });
}
export function useEmployerApplications(enabled = true) {
  return useQuery({ queryKey: ["employer-applications"], queryFn: async () => results<Applicant>(await api.get("/applications/")), enabled });
}
export function useApplicantAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "shortlist" | "reject" | "hire" }) => api.post(`/applications/${id}/${action}/`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["job-applicants"] }); qc.invalidateQueries({ queryKey: ["employer-applications"] }); },
  });
}
/** True when the API refused because a listing credit / package is needed. */
export function isPaymentRequired(err: unknown) {
  return err instanceof ApiError && (err.data as { code?: string } | null)?.code === "payment_required";
}

// ================================================================ listing packages / credits / payments
export interface JobPackage {
  id: string; name: string; slug: string; description: string; price: string; job_credits: number; listing_days: number;
  validity_days: number | null; is_featured: boolean; features: string[]; highlight_label: string;
}
export interface PackagePurchase {
  id: string; package_name: string; status: "pending" | "active" | "exhausted" | "expired" | "cancelled"; price: string;
  credits_total: number; credits_used: number; credits_remaining: number; listing_days: number; is_featured: boolean;
  activated_at: string | null; expires_at: string | null; invoice_number: string | null; created_at: string;
}
export interface Credits { total_credits: number; featured_credits: number; active: PackagePurchase[]; history: PackagePurchase[] }
export interface Payment {
  id: string; purpose: string; purpose_label: string; reference: string; invoice_number: string | null; description: string;
  amount: string; status: "initiated" | "success" | "failed" | "refunded"; paid_at: string | null; created_at?: string;
}
export function useJobPackages() {
  return useQuery({ queryKey: ["job-packages"], queryFn: async () => results<JobPackage>(await api.get("/listings/packages/")) });
}
export function useListingCredits(enabled = true) {
  return useQuery({ queryKey: ["listing-credits"], queryFn: () => api.get<Credits>("/listings/credits/"), enabled });
}
export function usePurchasePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { package: string; job?: string }) =>
      api.post<{ authorization_url: string | null; reference?: string | null; job_published?: boolean }>("/listings/purchase/", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["listing-credits"] }); qc.invalidateQueries({ queryKey: ["my-jobs"] }); },
  });
}
export function usePayments(enabled = true) {
  return useQuery({ queryKey: ["payments"], queryFn: async () => results<Payment>(await api.get("/payments/")), enabled });
}

// ================================================================ CV service
export interface CVServiceAccess { is_active: boolean; paid_at: string | null; price: number }
export interface CVSubmission { id: string; cv_file_url: string | null; headline: string; note: string; status: "pending" | "reviewed" | "forwarded"; created_at: string }
export interface ReferredCV { id: string; seeker_name: string; seeker_email: string; headline: string; admin_note: string; cv_file_url: string | null; created_at: string }

export function useCVServiceAccess(enabled = true) {
  return useQuery({ queryKey: ["cv-service-access"], queryFn: () => api.get<CVServiceAccess>("/cv-service/access/"), enabled });
}
export function useCVSubmissions(enabled = true) {
  return useQuery({ queryKey: ["cv-submissions"], queryFn: async () => results<CVSubmission>(await api.get("/cv-service/submissions/")), enabled });
}
export function useSubmitCVService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { cv_file: PickedFile; headline: string; note: string }) => {
      const fd = new FormData();
      appendFile(fd, "cv_file", p.cv_file);
      fd.append("headline", p.headline);
      fd.append("note", p.note);
      return api.upload("POST", "/cv-service/submissions/", fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cv-submissions"] }),
  });
}
export function useReferredCVs(enabled = true) {
  return useQuery({ queryKey: ["referred-cvs"], queryFn: async () => results<ReferredCV>(await api.get("/cv-service/referrals/")), enabled });
}
export function startCVServicePayment() {
  return api.post<{ authorization_url: string; reference?: string }>("/payments/initialize/", { purpose: "cv_service" });
}

// ================================================================ job alerts + Seeker Pro
export interface JobAlerts { whatsapp_number: string; categories: string[]; keywords: string; is_active: boolean; last_sent_at: string | null; is_pro: boolean }
export interface SeekerPro { is_pro: boolean; expires_at: string | null; price: string; period_days: number; features: string[] }

export function useJobAlerts(enabled = true) {
  return useQuery({ queryKey: ["job-alerts"], queryFn: () => api.get<JobAlerts>("/engagement/job-alerts/"), enabled });
}
export function useSaveJobAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: Partial<Omit<JobAlerts, "is_pro" | "last_sent_at">>) => api.put<JobAlerts>("/engagement/job-alerts/", v),
    onSuccess: (d) => qc.setQueryData(["job-alerts"], d),
  });
}
export function useSeekerPro(enabled = true) {
  return useQuery({ queryKey: ["seeker-pro"], queryFn: () => api.get<SeekerPro>("/engagement/seeker-pro/"), enabled });
}
export function startSeekerProCheckout() {
  return api.post<{ authorization_url: string; reference: string }>("/engagement/seeker-pro/checkout/", {});
}

// ================================================================ chat
export interface Conversation { id: string; participant_emails: string[]; other_party: string; context_label: string; booking: string | null; job: string | null; created_at: string }
export interface Message { id: string; sender_email: string; body: string; created_at: string }

export function useConversations(enabled = true) {
  return useQuery({ queryKey: ["conversations"], queryFn: async () => results<Conversation>(await api.get("/conversations/")), enabled });
}
export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { participant: string; booking?: string }) => api.post<Conversation>("/conversations/", p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}
export function useMessages(id?: string) {
  return useQuery({ queryKey: ["messages", id], queryFn: async () => results<Message>(await api.get(`/conversations/${id}/messages/`)), enabled: !!id, refetchInterval: 4000 });
}
export function useSendMessage(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.post<Message>(`/conversations/${id}/messages/`, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages", id] }),
  });
}
