import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, appendFile, results, type PickedFile } from "./api";

export interface PublicJob {
  id: string; title: string; description: string; category: string; category_name: string;
  employer_company: string; employer_verified: boolean; employer_website?: string;
  salary_min: string | null; salary_max: string | null; employer_tier: string | null; is_featured: boolean;
  posted_at: string; expires_at: string | null; created_at: string;
}
export interface Application {
  id: string; job: string; job_title: string; seeker_email?: string; cv: string; cover_letter: string;
  status: "submitted" | "shortlisted" | "rejected" | "hired"; created_at: string;
}
export interface CV { id: string; title: string; file: string; created_at: string }
export interface Category { id: string; name: string; slug: string; service_count: number }

export function useCategories(kind: "home_service" | "job") {
  return useQuery({ queryKey: ["public-categories", kind], queryFn: () => api.get<Category[]>("/public/categories/", { kind }), staleTime: 60 * 60_000 });
}
export function useFeaturedJobs() {
  return useQuery({ queryKey: ["featured-jobs"], queryFn: () => api.get<PublicJob[]>("/public/featured-jobs/") });
}
export function usePublicJobs(params: { q?: string; category?: string }) {
  return useQuery({ queryKey: ["public-jobs", params], queryFn: async () => results<PublicJob>(await api.get("/public/jobs/", params)) });
}
export function usePublicJob(id?: string) {
  return useQuery({ queryKey: ["public-job", id], queryFn: () => api.get<PublicJob>(`/public/jobs/${id}/`), enabled: !!id, retry: false });
}
export function useMyApplications(enabled = true) {
  return useQuery({ queryKey: ["my-applications"], queryFn: async () => results<Application>(await api.get("/applications/")), enabled });
}
export function useApplyToJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { job: string; cv: string; cover_letter: string }) => api.post("/applications/", p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-applications"] }),
  });
}
export function useMyCVs(enabled = true) {
  return useQuery({ queryKey: ["my-cvs"], queryFn: async () => results<CV>(await api.get("/cvs/")), enabled });
}
export function useUploadCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, file }: { title: string; file: PickedFile }) => {
      const fd = new FormData();
      fd.append("title", title);
      appendFile(fd, "file", file);
      return api.upload<CV>("POST", "/cvs/", fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-cvs"] }),
  });
}
export function useDeleteCV() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => api.delete(`/cvs/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ["my-cvs"] }) });
}

// ---------------------------------------------------------------- artisans
export interface PublicArtisan {
  id: string; full_name: string; trade: string; image: string | null; avg_rating: string; rating_count: number;
  is_featured: boolean; is_verified: boolean; tier: string | null;
}
export interface ArtisanDetail {
  id: string; full_name: string; bio: string; avg_rating: string; rating_count: number; is_featured: boolean; is_verified: boolean;
  service_radius_km: number; city?: string; area?: string; state?: string;
  services: { id: string; title: string; category_name: string; description: string; base_price: string }[];
  portfolio: { id: string; image: string; caption: string }[];
  reviews: { id: string; author_name: string; rating: number; comment: string; created_at: string }[];
  tier: string | null; phone: string | null;
}
export function useFeaturedArtisans() {
  return useQuery({ queryKey: ["featured-artisans"], queryFn: () => api.get<PublicArtisan[]>("/public/featured-artisans/") });
}
export function useBrowseArtisans(params: { q?: string; category?: string }) {
  const q = useInfiniteQuery({
    queryKey: ["browse-artisans", params], initialPageParam: 1,
    queryFn: ({ pageParam }) => api.get<{ count: number; next: string | null; results: PublicArtisan[] }>("/public/artisans/", { ...params, page: pageParam }),
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
  return { ...q, artisans: q.data?.pages.flatMap((p) => p.results) ?? [], total: q.data?.pages[0]?.count ?? 0 };
}
export function useArtisan(id?: string) {
  return useQuery({ queryKey: ["artisan", id], queryFn: () => api.get<ArtisanDetail>(`/public/artisans/${id}/`), enabled: !!id });
}

// ---------------------------------------------------------------- bookings (customer ↔ artisan)
export interface Booking {
  id: string; status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled"; service: string; service_title: string;
  customer_name: string; artisan_name: string; customer_user_id?: string; artisan_user_id?: string; scheduled_for: string; address: string; agreed_price: string; notes: string;
  has_review: boolean; created_at: string;
}
export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { service: string; scheduled_for: string; latitude: number; longitude: number; address: string; notes?: string }) => api.post<Booking>("/bookings/", p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}
export function useMyBookings(enabled = true) {
  return useQuery({ queryKey: ["bookings"], queryFn: async () => results<Booking>(await api.get("/bookings/")), enabled });
}
export function useBookingAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "start" | "complete" | "cancel" }) => api.post(`/bookings/${id}/${action}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}
export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { booking: string; rating: number; comment: string }) => api.post("/reviews/", p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

// ---------------------------------------------------------------- notifications
export interface Notification { id: string; kind: string; title: string; body: string; data: Record<string, unknown>; is_read: boolean; created_at: string }
export function useNotifications(enabled = true) {
  return useQuery({ queryKey: ["notifications"], queryFn: async () => results<Notification>(await api.get("/notifications/")), enabled, refetchInterval: 30_000 });
}
export function useUnreadCount(enabled = true) {
  return useQuery({ queryKey: ["notifications", "unread"], queryFn: async () => (await api.get<{ unread: number }>("/notifications/unread-count/")).unread, enabled, refetchInterval: 30_000 });
}
export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => api.post("/notifications/read-all/"), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }) });
}
