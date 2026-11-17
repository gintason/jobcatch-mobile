import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface ReferralSummary {
  enabled: boolean; code: string; link: string; reward: string; new_user_bonus: string; min_spend: string;
  stats: { invited: number; rewarded: number; pending: number; earned: string };
  referrals: { id: string; name: string; status: "pending" | "rewarded" | "rejected"; status_label: string; reward: string; note: string; joined_at: string }[];
  referred_by: string | null; can_apply: boolean; apply_days: number;
}

export function useReferrals() {
  return useQuery({ queryKey: ["referrals"], queryFn: () => api.get<ReferralSummary>("/referrals/") });
}
export function useApplyReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.post<ReferralSummary>("/referrals/apply/", { code }),
    onSuccess: (d) => qc.setQueryData(["referrals"], d),
  });
}

/** Invite code typed on the sign-up screen, kept for "Continue with Google" too. */
let pending = "";
export const referralDraft = { get: () => pending, set: (c: string) => { pending = c.trim().toUpperCase(); }, clear: () => { pending = ""; } };
