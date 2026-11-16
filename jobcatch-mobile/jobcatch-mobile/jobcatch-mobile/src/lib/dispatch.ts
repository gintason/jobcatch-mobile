import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, appendFile, results, type PickedFile } from "./api";

export type VehicleType = "bike" | "tricycle" | "car" | "van";
export type DeliveryKind = "package" | "errand";
export type DeliveryStatus = "searching" | "accepted" | "picked_up" | "in_transit" | "delivered" | "cancelled" | "expired";

export const ACTIVE: DeliveryStatus[] = ["searching", "accepted", "picked_up", "in_transit"];


export interface Rate { vehicle_type: VehicleType; label: string; base_fare: string; per_km: string; minimum_fare: string; errand_fee: string }
export interface Quote { distance_km: string; fare: string; rider_share: string; platform_share: string }
export interface LatLng { lat: number; lng: number }

export interface Delivery {
  id: string; reference: string; kind: DeliveryKind; kind_label: string;
  vehicle_type: VehicleType; vehicle_label: string; status: DeliveryStatus; status_label: string;
  pickup_address: string; pickup: LatLng; pickup_contact_name: string; pickup_contact_phone: string;
  dropoff_address: string; dropoff: LatLng; recipient_name: string; recipient_phone: string;
  item_description: string; errand_details: string; errand_budget: string | null; notes: string;
  distance_km: string; fare: string; rider_share: string; platform_share: string;
  rider: { name: string; phone: string; vehicle_type: VehicleType; vehicle_label: string; plate_number: string; rating: number | null; completed_count: number } | null;
  customer_name: string; customer_phone: string | null; delivery_code: string | null;
  payment_reference: string | null; rating: number | null; review: string;
  distance_to_pickup_km: number | null;
  created_at: string; accepted_at: string | null; picked_up_at: string | null; paid_at: string | null;
  delivered_at: string | null; cancelled_at: string | null; cancel_reason: string;
}

export type RiderIdType = "nin" | "drivers_licence" | "voters_card" | "passport";
export const RIDER_ID_TYPES: { value: RiderIdType; label: string }[] = [
  { value: "nin", label: "NIN / National ID" }, { value: "drivers_licence", label: "Driver's licence" },
  { value: "voters_card", label: "Voter's card" }, { value: "passport", label: "Passport" },
];

export interface RiderProfile {
  phone: string; vehicle_type: VehicleType; vehicle_label: string; plate_number: string; city: string; state: string;
  status: "incomplete" | "pending" | "approved" | "rejected" | "suspended"; status_label: string; review_note: string;
  id_type: RiderIdType | ""; id_type_label: string; id_number: string;
  has_id_document: boolean; has_selfie: boolean; missing: string[]; bank_name: string; account_name: string; account_number_masked: string;
  has_payout_account: boolean; is_online: boolean; can_work: boolean; completed_count: number;
  rating: number | null; share_percent: string;
}

export interface BookingInput {
  kind: DeliveryKind; vehicle_type: VehicleType;
  pickup_lat: number; pickup_lng: number; pickup_address: string; pickup_contact_name?: string; pickup_contact_phone?: string;
  dropoff_lat: number; dropoff_lng: number; dropoff_address: string; recipient_name: string; recipient_phone: string;
  item_description: string; errand_details?: string; errand_budget?: string; notes?: string;
}

export function useRates() {
  return useQuery({ queryKey: ["dispatch-rates"], queryFn: () => api.get<{ rates: Rate[]; rider_share_percent: string }>("/dispatch/rates/"), staleTime: 30 * 60_000 });
}
export function useQuote(pickup: LatLng | null, dropoff: LatLng | null, vehicle: VehicleType, kind: DeliveryKind) {
  return useQuery({
    queryKey: ["dispatch-quote", pickup, dropoff, vehicle, kind],
    queryFn: () => api.post<Quote>("/dispatch/quote/", {
      pickup_lat: pickup!.lat, pickup_lng: pickup!.lng, dropoff_lat: dropoff!.lat, dropoff_lng: dropoff!.lng, vehicle_type: vehicle, kind }),
    enabled: !!pickup && !!dropoff, retry: false, staleTime: 5 * 60_000,
  });
}
export function useBookDelivery() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: BookingInput) => api.post<Delivery>("/dispatch/deliveries/", v), onSuccess: () => qc.invalidateQueries({ queryKey: ["deliveries"] }) });
}
export function useMyDeliveries(enabled = true) {
  return useQuery({ queryKey: ["deliveries"], queryFn: async () => results<Delivery>(await api.get("/dispatch/deliveries/")), enabled });
}
export function useDelivery(id?: string) {
  return useQuery({
    queryKey: ["delivery", id], queryFn: () => api.get<Delivery>(`/dispatch/deliveries/${id}/`), enabled: !!id,
    refetchInterval: (q) => (ACTIVE.includes(q.state.data?.status as DeliveryStatus) ? 8000 : false),
  });
}
export function useDeliveryAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: "cancel" | "rate"; body?: Record<string, unknown> }) =>
      api.post<Delivery>(`/dispatch/deliveries/${id}/${action}/`, body ?? {}),
    onSuccess: (d) => { qc.setQueryData(["delivery", d.id], d); qc.invalidateQueries({ queryKey: ["deliveries"] }); },
  });
}
export function usePayDelivery() {
  return useMutation({ mutationFn: (id: string) => api.post<{ authorization_url: string; reference?: string }>(`/dispatch/deliveries/${id}/pay/`) });
}

// ---------------------------------------------------------------- riders
export function useRiderProfile(enabled = true) {
  return useQuery({ queryKey: ["rider-profile"], queryFn: () => api.get<RiderProfile>("/dispatch/rider/"), enabled });
}
export function useUpdateRider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id_document, selfie, ...v }: Partial<Pick<RiderProfile, "phone" | "vehicle_type" | "plate_number" | "city" | "state" | "id_number">>
      & { id_type?: RiderIdType | ""; id_document?: PickedFile | null; selfie?: PickedFile | null }) => {
      const form = new FormData();
      Object.entries(v).forEach(([k, val]) => { if (val) form.append(k, String(val)); });
      if (id_document) appendFile(form, "id_document", id_document);
      if (selfie) appendFile(form, "selfie", selfie);
      return api.upload<RiderProfile>("PATCH", "/dispatch/rider/", form);
    },
    onSuccess: (d) => qc.setQueryData(["rider-profile"], d),
  });
}
export function useBanks(enabled: boolean) {
  return useQuery({ queryKey: ["dispatch-banks"], queryFn: () => api.get<{ name: string; code: string }[]>("/dispatch/banks/"), enabled, staleTime: 24 * 60 * 60_000 });
}
export function useSetPayoutAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { bank_code: string; bank_name: string; account_number: string }) => api.post<RiderProfile>("/dispatch/rider/payout-account/", v),
    onSuccess: (d) => qc.setQueryData(["rider-profile"], d),
  });
}
export function useSetAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { online: boolean; lat?: number; lng?: number }) => api.post<RiderProfile>("/dispatch/rider/availability/", v),
    onSuccess: (d) => { qc.setQueryData(["rider-profile"], d); qc.invalidateQueries({ queryKey: ["rider-requests"] }); },
  });
}
export function useOpenRequests(enabled: boolean) {
  return useQuery({ queryKey: ["rider-requests"], queryFn: () => api.get<Delivery[]>("/dispatch/rider/requests/"), enabled, refetchInterval: enabled ? 15_000 : false });
}
export function useRiderJobs(enabled = true) {
  return useQuery({
    queryKey: ["rider-jobs"], queryFn: () => api.get<{ jobs: Delivery[]; earnings: { total: string; count: number } }>("/dispatch/rider/jobs/"),
    enabled, refetchInterval: enabled ? 10_000 : false,
  });
}
export function useRiderJobAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, code }: { id: string; action: "accept" | "release" | "picked-up" | "deliver"; code?: string }) =>
      api.post<Delivery>(`/dispatch/rider/jobs/${id}/${action}/`, code ? { code } : {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rider-jobs"] }); qc.invalidateQueries({ queryKey: ["rider-requests"] }); },
  });
}
