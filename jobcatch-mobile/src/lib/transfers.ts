import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface TransferOverview {
  wallet_enabled: boolean; bank_enabled: boolean; has_pin: boolean; pin_locked_until: string | null;
  balance: string; transferable: string; on_hold: string; hold_hours: number;
  min: string; max_single: string; daily_limit: string; daily_used: string; daily_left: string; bank_fee: string;
  beneficiaries: { bank_code: string; bank_name: string; account_number: string; account_name: string }[];
}
export interface TransferRow {
  id: string; type: "wallet_out" | "wallet_in" | "bank"; reference: string; counterparty: string; detail: string;
  amount: string; fee: string; status: "processing" | "successful" | "failed" | "reversed"; status_label: string;
  note: string; failure_reason?: string; created_at: string;
}

function useRefresh() {
  const qc = useQueryClient();
  return () => ["transfer-overview", "transfers", "wallet"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useTransferOverview() {
  return useQuery({ queryKey: ["transfer-overview"], queryFn: () => api.get<TransferOverview>("/transfers/overview/") });
}
export function useSetPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { pin: string; current_pin?: string; password?: string }) => api.post<TransferOverview>("/transfers/pin/", v),
    onSuccess: (d) => qc.setQueryData(["transfer-overview"], d),
  });
}
export function useLookup() {
  return useMutation({ mutationFn: (to: string) => api.get<{ name: string; email: string }>("/transfers/lookup/", { to }) });
}
export function useSendToWallet() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (v: { to: string; amount: string; pin: string; note?: string }) => api.post<TransferRow>("/transfers/wallet/", v),
    onSettled: refresh,
  });
}
export function useTransferBanks() {
  return useQuery({ queryKey: ["transfer-banks"], queryFn: () => api.get<{ name: string; code: string }[]>("/transfers/banks/"), staleTime: 24 * 3600_000 });
}
export function useResolveAccount() {
  return useMutation({
    mutationFn: (v: { bank_code: string; account_number: string }) => api.post<{ account_name: string }>("/transfers/resolve/", v),
  });
}
export function useSendToBank() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (v: { bank_code: string; account_number: string; amount: string; pin: string; narration?: string }) =>
      api.post<TransferRow>("/transfers/bank/", v),
    onSettled: refresh,
  });
}
export function useTransferHistory() {
  return useQuery({
    queryKey: ["transfers"], queryFn: () => api.get<TransferRow[]>("/transfers/"),
    refetchInterval: (q) => ((q.state.data ?? []).some((t) => t.status === "processing") ? 10_000 : false),
  });
}
export function useBankTransfer(id: string | undefined, watch: boolean) {
  const refresh = useRefresh();
  return useQuery({
    queryKey: ["bank-transfer", id], enabled: !!id && watch,
    queryFn: async () => { const d = await api.get<TransferRow>(`/transfers/bank/${id}/`); if (d.status !== "processing") refresh(); return d; },
    refetchInterval: (q) => (q.state.data && q.state.data.status !== "processing" ? false : 5000),
  });
}
