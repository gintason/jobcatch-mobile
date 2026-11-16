import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, appendFile, results, type PickedFile } from "./api";

export type BillService = "airtime" | "data" | "electricity" | "tv" | "epins" | "betting" | "education" | "giftcard" | "rmb";
type Named = { id: string; name: string };

export interface Catalogue {
  airtime: Named[]; data: Named[]; electricity: Named[]; tv: Named[]; epins: Named[]; betting: Named[];
  betting_enabled: boolean; meter_types: string[]; epin_values: number[]; epin_pack_size: number; epin_max_quantity: number;
  fees: Partial<Record<BillService, string>>;
  education: Named[]; education_enabled: boolean; education_max_quantity: number;
  giftcard_buy_enabled: boolean; giftcard_sell_enabled: boolean; giftcard_max_quantity: number; rmb_enabled: boolean;
  gateway: string;
}
export interface Variation { variation_id: string; data_plan?: string; package_bouquet?: string; price: string; availability: string }
export interface CustomerInfo {
  customer_name?: string; customer_address?: string; current_bouquet?: string; renewal_amount?: number; status?: string;
  min_purchase_amount?: number; max_purchase_amount?: number; minimum_amount?: number; maximum_amount?: number; customer_username?: string;
}
export interface BillOrder {
  id: string; receipt_number: string; service: BillService; service_label: string; provider: string; customer_id: string;
  customer_name: string; variation_id: string; variation_label: string; subscription_type: string;
  amount: string; fee: string; total: string; payment_method: "wallet" | "card"; payment_reference: string | null;
  status: "awaiting_payment" | "queued" | "processing" | "successful" | "failed" | "refunded" | "cancelled"; status_label: string;
  request_id: string; provider_message: string; token: string; units: string; quantity: number;
  epins: { pin: string; serial: string; amount: string; instruction: string }[];
  epin_packs: { index: number; network: string; denomination: number; pieces_count: number; image_path: string }[];
  service_type: string; details: Record<string, string>;
  created_at: string; completed_at: string | null; refunded_at: string | null; authorization_url?: string | null;
}
export interface WalletTxn { id: string; kind: "credit" | "debit"; source_label: string; amount: string; balance_after: string; reference: string; description: string; created_at: string }
export interface Wallet { balance: string; updated_at: string; transactions: WalletTxn[] }

export const PENDING_BILL = ["processing", "queued", "awaiting_payment"];

export function useCatalogue() {
  return useQuery({ queryKey: ["bill-catalogue"], queryFn: () => api.get<Catalogue>("/billing/catalogue/"), staleTime: 60 * 60_000 });
}
export function useVariations(kind: "data" | "tv" | "education", provider: string, serviceType?: string) {
  return useQuery({
    queryKey: ["bill-variations", kind, provider, serviceType],
    queryFn: () => api.get<Variation[]>(`/billing/variations/${kind}/`, { provider, service_type: serviceType }),
    enabled: !!provider && (kind !== "education" || !!serviceType), staleTime: 5 * 60_000,
  });
}
export function useEpinStock(enabled: boolean) {
  return useQuery({
    queryKey: ["epin-stock"], enabled, staleTime: 60_000, refetchInterval: enabled ? 60_000 : false,
    queryFn: () => api.get<{ stock: Record<string, Record<string, number>>; known: boolean }>("/billing/epin-stock/"),
  });
}

export function useVerifyCustomer() {
  return useMutation({
    mutationFn: (v: { service: "electricity" | "tv" | "betting" | "education"; provider: string; customer_id: string; meter_type?: string; variation_id?: string }) =>
      api.post<CustomerInfo>("/billing/verify-customer/", v),
  });
}

export interface OrderPayload { service: BillService; payment_method: "wallet" | "card"; qr?: PickedFile | null; [field: string]: string | number | PickedFile | null | undefined }

export function useCreateBillOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ qr, ...payload }: OrderPayload) => {
      if (!qr) return api.post<BillOrder>("/billing/orders/", payload);
      const form = new FormData();
      Object.entries(payload).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") form.append(k, String(v)); });
      appendFile(form, "qr_code", qr);
      return api.upload<BillOrder>("POST", "/billing/orders/", form);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bill-orders"] }); qc.invalidateQueries({ queryKey: ["wallet"] }); },
  });
}
export function useBillOrders() {
  return useQuery({ queryKey: ["bill-orders"], queryFn: async () => results<BillOrder>(await api.get("/billing/orders/")) });
}
export function useBillOrder(id?: string) {
  return useQuery({
    queryKey: ["bill-order", id], queryFn: () => api.get<BillOrder>(`/billing/orders/${id}/`), enabled: !!id,
    refetchInterval: (q) => (PENDING_BILL.includes(q.state.data?.status ?? "") ? 5000 : false),
  });
}
export function useRequeryOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<BillOrder>(`/billing/orders/${id}/requery/`),
    onSuccess: (d) => { qc.setQueryData(["bill-order", d.id], d); qc.invalidateQueries({ queryKey: ["bill-orders"] }); qc.invalidateQueries({ queryKey: ["wallet"] }); },
  });
}
export function useWallet(enabled = true) {
  return useQuery({ queryKey: ["wallet"], queryFn: () => api.get<Wallet>("/billing/wallet/"), enabled });
}
export function useFundWallet() {
  return useMutation({ mutationFn: (amount: string) => api.post<{ authorization_url: string; reference: string }>("/billing/wallet/fund/", { amount }) });
}

// ---------------------------------------------------------------- gift cards
export interface GiftCardCountry { country_code: string; country_name: string; country_flag_url: string; currency_code: string }
export interface GiftCardProduct {
  product_id: number; product_name: string; brand_name?: string; denomination_type: "FIXED" | "RANGE";
  min_recipient_denomination: number | null; max_recipient_denomination: number | null;
  fixed_recipient_denominations: number[] | null; currency_code: string; logo_urls?: string[];
}
export function useGiftCardCountries(enabled: boolean) {
  return useQuery({ queryKey: ["giftcard-countries"], queryFn: () => api.get<GiftCardCountry[]>("/billing/giftcards/countries/"), enabled, staleTime: 30 * 60_000 });
}
export function useGiftCardProducts(country: string) {
  return useQuery({ queryKey: ["giftcard-products", country], queryFn: () => api.get<GiftCardProduct[]>("/billing/giftcards/products/", { country_code: country }), enabled: !!country, staleTime: 10 * 60_000 });
}
export function useGiftCardQuote(productId?: number, amount?: string, quantity = 1) {
  return useQuery({
    queryKey: ["giftcard-quote", productId, amount, quantity],
    queryFn: () => api.post<{ price_ngn: string; quantity: number }>("/billing/giftcards/quote/", { product_id: productId, amount, quantity }),
    enabled: !!productId && Number(amount) > 0 && quantity > 0, staleTime: 60_000, retry: false,
  });
}
export interface SellCatalogItem {
  name: string; slug: string; logo_url: string | null;
  countries: (string | { code?: string; name?: string })[]; card_types: string[];
  sub_types: (string | { slug?: string; name?: string })[]; min_amount: number; max_amount: number;
}
export interface GiftCardTrade {
  id: string; slug: string; card_name: string; card_country: string; card_type: "ecode" | "physical"; sub_type: string;
  card_currency: string; card_amount: string; expected_payout: string | null; user_payout: string | null;
  status: "submitting" | "pending" | "completed" | "cancelled" | "failed"; status_label: string; rejection_reason: string;
  created_at: string; completed_at: string | null;
}
export function useSellCatalog(enabled: boolean) {
  return useQuery({ queryKey: ["giftcard-sell-catalog"], queryFn: () => api.get<SellCatalogItem[]>("/billing/giftcards/sell-catalog/"), enabled, staleTime: 30 * 60_000 });
}
export function useSellRates(slug: string) {
  return useQuery({
    queryKey: ["giftcard-sell-rates", slug],
    queryFn: () => api.get<{ rates: { slug: string; name: string; rates: unknown }[]; jobcatch_margin_percent: string }>("/billing/giftcards/sell-rates/", { slug }),
    enabled: !!slug, staleTime: 5 * 60_000,
  });
}
export function useGiftCardTrades(enabled: boolean) {
  return useQuery({
    queryKey: ["giftcard-trades"], queryFn: async () => results<GiftCardTrade>(await api.get("/billing/giftcards/trades/")), enabled,
    refetchInterval: (q) => ((q.state.data ?? []).some((t) => ["submitting", "pending"].includes(t.status)) ? 15000 : false),
  });
}
export function useSubmitTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ images, ...fields }: { images: PickedFile[]; [field: string]: string | PickedFile[] }) => {
      const form = new FormData();
      Object.entries(fields).forEach(([k, v]) => { if (typeof v === "string" && v) form.append(k, v); });
      images.forEach((f) => appendFile(form, "images", f));
      return api.upload<GiftCardTrade>("POST", "/billing/giftcards/trades/", form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["giftcard-trades"] }),
  });
}

// ---------------------------------------------------------------- RMB
export interface RmbInfo {
  channels: { channel: "alipay" | "wechat" | "bank"; name: string; is_available: boolean; account_types: { type: "nigerian" | "chinese"; name: string; is_available: boolean }[] }[];
  limits: { min_rmb?: number; max_rmb?: number };
}
export function useRmbInfo(enabled: boolean) {
  return useQuery({ queryKey: ["rmb-info"], queryFn: () => api.get<RmbInfo>("/billing/rmb/"), enabled, staleTime: 60_000 });
}
export function useRmbQuote(channel: string, accountType: string, rmbAmount: string) {
  return useQuery({
    queryKey: ["rmb-quote", channel, accountType, rmbAmount],
    queryFn: () => api.post<{ rmb_amount: string; rate: string; price_ngn: string }>("/billing/rmb/", { channel, account_type: accountType, rmb_amount: rmbAmount }),
    enabled: !!channel && Number(rmbAmount) > 0 && (channel === "bank" || !!accountType), staleTime: 60_000, retry: false,
  });
}
