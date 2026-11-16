import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowDownLeft, ArrowUpRight, BadgeCheck, Building2, CheckCircle2, Clock, KeyRound, Lock, Send, X, XCircle } from "lucide-react-native";
import { apiError } from "@/lib/api";
import { formatDateTime, naira } from "@/lib/format";
import {
  useBankTransfer, useLookup, useResolveAccount, useSendToBank, useSendToWallet, useSetPin, useTransferBanks,
  useTransferHistory, useTransferOverview, type TransferOverview, type TransferRow,
} from "@/lib/transfers";
import { Button, Card, Chips, Empty, Input, Loading, Notice, Screen, Section, Segmented, Select, Text, colors, fonts, radius } from "@/ui";

type Tab = "bank" | "wallet";
interface Pending { kind: Tab; to: string; name: string; amount: string; fee: number; note: string; bank_code?: string; bank_name?: string }

/** Send money to any Nigerian bank, or instantly to another JobCatch wallet. */
export default function Transfers() {
  const ov = useTransferOverview();
  const history = useTransferHistory();
  const [tab, setTab] = useState<Tab>("bank");
  const [pending, setPending] = useState<Pending | null>(null);
  const [receipt, setReceipt] = useState<TransferRow | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const o = ov.data;
  if (!o) return <Screen back title="Send money"><Loading /></Screen>;
  const tabs = [o.bank_enabled && { value: "bank" as Tab, label: "Bank account" }, o.wallet_enabled && { value: "wallet" as Tab, label: "JobCatch user" }]
    .filter(Boolean) as { value: Tab; label: string }[];
  const active = tabs.some((t) => t.value === tab) ? tab : tabs[0]?.value;

  return (
    <Screen back title="Send money" onRefresh={() => { ov.refetch(); history.refetch(); }} refreshing={ov.isRefetching}>
      <LinearGradient colors={[colors.brand900, colors.brand700, colors.brand500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 20 }}>
        <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>Available to send</Text>
        <Text style={{ color: colors.white, fontFamily: fonts.display, fontSize: 30, lineHeight: 38, marginVertical: 2 }}>{naira(o.transferable, 2)}</Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
          Wallet {naira(o.balance, 2)}{Number(o.on_hold) > 0 ? ` · ${naira(o.on_hold, 2)} from recent card top-ups on ${o.hold_hours}h hold` : ""}
        </Text>
      </LinearGradient>

      {!o.has_pin ? (
        <Card style={{ alignItems: "center", gap: 8, paddingVertical: 24 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" }}><KeyRound size={24} color={colors.brand600} /></View>
          <Text variant="h2">Create your transaction PIN</Text>
          <Text variant="small" center>Every transfer is confirmed with a 4-digit PIN only you know.</Text>
          <Button title="Create PIN" onPress={() => setPinOpen(true)} style={{ alignSelf: "stretch", marginTop: 6 }} />
        </Card>
      ) : !active ? (
        <Notice>Transfers are not available right now. Please check back soon.</Notice>
      ) : (
        <Card style={{ gap: 16 }}>
          {tabs.length > 1 ? <Segmented value={active} onChange={setTab} options={tabs} /> : null}
          {active === "bank" ? <BankForm o={o} onReview={setPending} /> : <WalletForm o={o} onReview={setPending} />}
        </Card>
      )}

      <Card style={{ gap: 8 }}>
        <Text variant="h3">Limits & security</Text>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.brand50, overflow: "hidden" }}>
          <View style={{ height: 8, width: `${Math.min(100, (Number(o.daily_used) / Number(o.daily_limit)) * 100)}%`, backgroundColor: colors.brand500 }} />
        </View>
        <Text variant="caption">{naira(o.daily_used)} of {naira(o.daily_limit)} sent today · {naira(o.daily_left)} left</Text>
        <Text variant="caption">Per transfer {naira(o.min)} – {naira(o.max_single)} · Bank fee {Number(o.bank_fee) ? naira(o.bank_fee) : "free"} · JobCatch users free</Text>
        {o.pin_locked_until ? <Notice kind="warning">Transfers are locked after too many wrong PINs until {formatDateTime(o.pin_locked_until)}.</Notice> : null}
        {o.has_pin ? <Button title="Change or reset PIN" kind="ghost" size="md" icon={<KeyRound size={16} color={colors.brand600} />} onPress={() => setPinOpen(true)} /> : null}
      </Card>

      <Section title="Recent transfers">
        <Card style={{ paddingVertical: 4 }}>
          {history.data?.length ? history.data.slice(0, 25).map((t, i) => <HistoryRow key={`${t.type}${t.id}`} t={t} first={!i} onPress={() => setReceipt(t)} />)
            : <Empty icon={<Send size={24} color={colors.brand500} />} title="No transfers yet" />}
        </Card>
      </Section>

      {pending ? <ConfirmSheet p={pending} onClose={() => setPending(null)} onDone={(t) => { setPending(null); setReceipt(t); }} /> : null}
      {receipt ? <ReceiptSheet t={receipt} onClose={() => setReceipt(null)} /> : null}
      {pinOpen ? <PinSheet hasPin={o.has_pin} onClose={() => setPinOpen(false)} /> : null}
    </Screen>
  );
}

function amountError(o: TransferOverview, amount: string, fee = 0) {
  const n = Number(amount);
  if (!amount) return "";
  if (!(n > 0)) return "Enter a valid amount.";
  if (n < Number(o.min)) return `The minimum is ${naira(o.min)}.`;
  if (n > Number(o.max_single)) return `The maximum per transfer is ${naira(o.max_single)}.`;
  if (n > Number(o.daily_left)) return `You can send ${naira(o.daily_left)} more today.`;
  if (n + fee > Number(o.transferable)) return `Not enough available. You can send up to ${naira(Math.max(0, Number(o.transferable) - fee), 2)}.`;
  return "";
}

function AmountField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Input label="Amount (₦)" value={value} onChangeText={(v) => onChange(v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" placeholder="0.00" />
      <Chips value={value} onChange={onChange} options={[1000, 5000, 10000, 20000].map((a) => ({ value: String(a), label: naira(a) }))} />
      {error ? <Text variant="small" color={colors.danger}>{error}</Text> : null}
    </View>
  );
}

function Found({ name, sub }: { name: string; sub?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.successBg }}>
      <BadgeCheck size={18} color={colors.success} />
      <Text variant="bodyStrong" color={colors.success} style={{ flexShrink: 1 }} numberOfLines={1}>{name}</Text>
      {sub ? <Text variant="caption" color={colors.success} numberOfLines={1} style={{ flexShrink: 1 }}>{sub}</Text> : null}
    </View>
  );
}

function BankForm({ o, onReview }: { o: TransferOverview; onReview: (p: Pending) => void }) {
  const banks = useTransferBanks();
  const resolve = useResolveAccount();
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const fee = Number(o.bank_fee);
  const amtErr = amountError(o, amount, fee);
  const bankName = banks.data?.find((b) => b.code === bank)?.name ?? "";
  const { mutate } = resolve;

  useEffect(() => {
    if (!bank || account.length !== 10) return;
    let live = true;
    mutate({ bank_code: bank, account_number: account }, {
      onSuccess: (d) => { if (live) setName(d.account_name); },
      onError: (e) => { if (live) setError(apiError(e, "We couldn't verify this account.")); },
    });
    return () => { live = false; };
  }, [bank, account, mutate]);

  return (
    <View style={{ gap: 14 }}>
      {o.beneficiaries.length ? (
        <View style={{ gap: 6 }}>
          <Text variant="label">Recent</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {o.beneficiaries.map((b) => (
              <Pressable key={b.bank_code + b.account_number} onPress={() => { setError(""); setName(""); setBank(b.bank_code); setAccount(b.account_number); }}
                style={{ padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, maxWidth: 170 }}>
                <Text variant="bodyStrong" numberOfLines={1} style={{ fontSize: 13 }}>{b.account_name}</Text>
                <Text variant="caption" numberOfLines={1}>{b.bank_name} · ••{b.account_number.slice(-4)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <Select label="Bank" value={bank} loading={banks.isLoading} placeholder="Choose a bank"
        options={(banks.data ?? []).map((b) => ({ value: b.code, label: b.name }))} onChange={(v) => { setBank(v); setName(""); setError(""); }} />
      {banks.isError ? <Text variant="small" color={colors.danger}>{apiError(banks.error)}</Text> : null}
      <Input label="Account number" value={account} keyboardType="number-pad" maxLength={10} placeholder="10 digits"
        onChangeText={(v) => { setAccount(v.replace(/\D/g, "").slice(0, 10)); setName(""); setError(""); }} />
      {resolve.isPending ? <Text variant="caption">Verifying account…</Text> : null}
      {name ? <Found name={name} /> : null}
      {error ? <Text variant="small" color={colors.danger}>{error}</Text> : null}
      <AmountField value={amount} onChange={setAmount} error={amtErr} />
      <Input label="Narration (optional)" value={note} onChangeText={setNote} maxLength={100} placeholder="Shows on their statement" />
      {fee > 0 ? <Text variant="caption">Transfer fee {naira(fee)} · usually arrives within minutes</Text> : null}
      <Button title="Continue" icon={<Send size={18} color={colors.white} />} disabled={!name || !amount || !!amtErr}
        onPress={() => onReview({ kind: "bank", to: account, name, amount, fee, note: note.trim(), bank_code: bank, bank_name: bankName })} />
    </View>
  );
}

function WalletForm({ o, onReview }: { o: TransferOverview; onReview: (p: Pending) => void }) {
  const lookup = useLookup();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [found, setFound] = useState<{ name: string; email: string } | null>(null);
  const [error, setError] = useState("");
  const amtErr = amountError(o, amount);
  function check() {
    setFound(null); setError("");
    if (to.trim().length < 6) return;
    lookup.mutate(to.trim(), { onSuccess: setFound, onError: (e) => setError(apiError(e, "No JobCatch account uses that email or phone number.")) });
  }
  return (
    <View style={{ gap: 14 }}>
      <Input label="Recipient's email or phone" value={to} onChangeText={(v) => { setTo(v); setFound(null); }} onBlur={check} onSubmitEditing={check}
        autoCapitalize="none" autoCorrect={false} placeholder="ada@gmail.com or 0803 123 4567" returnKeyType="search" />
      {lookup.isPending ? <Text variant="caption">Checking…</Text> : null}
      {found ? <Found name={found.name} sub={found.email} /> : null}
      {error ? <Text variant="small" color={colors.danger}>{error}</Text> : null}
      {!found && !lookup.isPending && to.trim().length >= 6 && !error ? <Button title="Find recipient" kind="secondary" size="md" onPress={check} /> : null}
      <AmountField value={amount} onChange={setAmount} error={amtErr} />
      <Input label="Note (optional)" value={note} onChangeText={setNote} maxLength={140} placeholder="What's it for?" />
      <Text variant="caption">Arrives instantly · no fee</Text>
      <Button title="Continue" icon={<Send size={18} color={colors.white} />} disabled={!found || !amount || !!amtErr}
        onPress={() => found && onReview({ kind: "wallet", to: to.trim(), name: found.name, amount, fee: 0, note: note.trim() })} />
    </View>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 }}>
          <Text variant="h2" style={{ flex: 1 }}>{title}</Text>
          <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="Close"><X size={24} color={colors.brand900} /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 48 }}>{children}</ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PinInput({ label, value, onChange, autoFocus }: { label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Text variant="label">{label}</Text>
      <TextInput value={value} onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4}
        autoFocus={autoFocus} accessibilityLabel={label} textContentType="oneTimeCode"
        style={{ width: 180, height: 58, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.mist, textAlign: "center",
          fontSize: 26, letterSpacing: 18, color: colors.brand900, fontFamily: fonts.displayBold }} />
    </View>
  );
}

function ConfirmSheet({ p, onClose, onDone }: { p: Pending; onClose: () => void; onDone: (t: TransferRow) => void }) {
  const wallet = useSendToWallet();
  const bank = useSendToBank();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const busy = wallet.isPending || bank.isPending;
  function send() {
    setError("");
    const opts = { onSuccess: onDone, onError: (e: unknown) => { setPin(""); setError(apiError(e, "The transfer didn't go through.")); } };
    if (p.kind === "wallet") wallet.mutate({ to: p.to, amount: p.amount, pin, note: p.note }, opts);
    else bank.mutate({ bank_code: p.bank_code!, account_number: p.to, amount: p.amount, pin, narration: p.note }, opts);
  }
  return (
    <Sheet title="Confirm transfer" onClose={busy ? () => {} : onClose}>
      <View style={{ alignItems: "center", gap: 2, padding: 18, borderRadius: radius.lg, backgroundColor: colors.mist }}>
        <Text variant="caption">You’re sending</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.brand900 }}>{naira(p.amount, 2)}</Text>
        <Text variant="bodyStrong">{p.name}</Text>
        <Text variant="small">{p.kind === "bank" ? `${p.bank_name} · ${p.to}` : `JobCatch · ${p.to}`}</Text>
      </View>
      {p.fee > 0 ? <Row label="Fee" value={naira(p.fee, 2)} /> : null}
      <Row label="Total from wallet" value={naira(Number(p.amount) + p.fee, 2)} strong />
      {p.note ? <Row label="Note" value={p.note} /> : null}
      <PinInput label="Enter your 4-digit PIN" value={pin} onChange={setPin} autoFocus />
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Button title={busy ? "Sending…" : `Send ${naira(p.amount, 2)}`} icon={<Lock size={18} color={colors.white} />} loading={busy} disabled={pin.length !== 4} onPress={send} />
    </Sheet>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
      <Text variant={strong ? "bodyStrong" : "small"}>{label}</Text>
      <Text variant={strong ? "bodyStrong" : "small"} color={strong ? colors.brand900 : colors.ink} style={{ flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

function ReceiptSheet({ t, onClose }: { t: TransferRow; onClose: () => void }) {
  const live = useBankTransfer(t.type === "bank" ? t.id : undefined, t.status === "processing");
  const r = live.data ?? t;
  const ok = r.status === "successful", waiting = r.status === "processing";
  const Icon = ok ? CheckCircle2 : waiting ? Clock : XCircle;
  const incoming = r.type === "wallet_in";
  return (
    <Sheet title="Transfer receipt" onClose={onClose}>
      <View style={{ alignItems: "center", gap: 4 }}>
        <Icon size={56} color={ok ? colors.success : waiting ? colors.brand500 : colors.danger} />
        <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.brand900 }}>{naira(r.amount, 2)}</Text>
        <Text variant="bodyStrong">{incoming ? "Received" : ok ? "Sent" : waiting ? "On its way" : "Not sent — refunded"}</Text>
        <Text variant="small" center>{incoming ? "from" : "to"} {r.counterparty} · {r.detail}</Text>
        {waiting ? <Text variant="caption" center>Bank transfers usually land within minutes. This updates by itself.</Text> : null}
      </View>
      {r.failure_reason ? <Notice kind="error">{r.failure_reason}</Notice> : null}
      <Row label="Reference" value={r.reference} />
      {Number(r.fee) > 0 ? <Row label="Fee" value={naira(r.fee, 2)} /> : null}
      {r.note ? <Row label="Note" value={r.note} /> : null}
      <Row label="Date" value={formatDateTime(r.created_at)} />
      <Button title="Done" onPress={onClose} />
    </Sheet>
  );
}

function PinSheet({ hasPin, onClose }: { hasPin: boolean; onClose: () => void }) {
  const save = useSetPin();
  const [mode, setMode] = useState<"current" | "password">(hasPin ? "current" : "password");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  function submit() {
    if (pin !== confirm) { setError("The two PINs don't match."); return; }
    setError("");
    save.mutate({ pin, ...(mode === "current" ? { current_pin: current } : { password }) }, { onSuccess: onClose, onError: (e) => setError(apiError(e)) });
  }
  return (
    <Sheet title={hasPin ? "Change transaction PIN" : "Create transaction PIN"} onClose={onClose}>
      {hasPin ? <Segmented value={mode} onChange={setMode} options={[{ value: "current", label: "I know my PIN" }, { value: "password", label: "Forgot PIN" }]} /> : null}
      {mode === "current" ? <PinInput label="Current PIN" value={current} onChange={setCurrent} autoFocus />
        : <Input label="Account password" value={password} onChangeText={setPassword} password placeholder={hasPin ? "To reset your PIN" : "To confirm it's you"} />}
      <PinInput label={hasPin ? "New PIN" : "Choose a 4-digit PIN"} value={pin} onChange={setPin} />
      <PinInput label="Repeat PIN" value={confirm} onChange={setConfirm} />
      <Text variant="caption" center>Avoid easy PINs like 1234 or your birth year. JobCatch staff will never ask for it.</Text>
      {mode === "password" ? (
        <Text variant="caption" center>Signed up with Google and never set a password? <Text variant="caption" color={colors.brand500} onPress={() => router.push("/account")}>Log out and use “Forgot password”</Text> to set one.</Text>
      ) : null}
      {error ? <Notice kind="error">{error}</Notice> : null}
      <Button title="Save PIN" loading={save.isPending} disabled={pin.length !== 4 || confirm.length !== 4 || (mode === "current" ? current.length !== 4 : !password)} onPress={submit} />
    </Sheet>
  );
}

function HistoryRow({ t, first, onPress }: { t: TransferRow; first: boolean; onPress: () => void }) {
  const incoming = t.type === "wallet_in";
  const Icon = incoming ? ArrowDownLeft : t.type === "bank" ? Building2 : ArrowUpRight;
  return (
    <Pressable onPress={onPress} style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }, first ? null : { borderTopWidth: 1, borderTopColor: colors.line }]}>
      <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: incoming ? colors.successBg : colors.brand50 }}>
        <Icon size={18} color={incoming ? colors.success : colors.brand600} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1} style={{ fontSize: 14 }}>{t.counterparty}</Text>
        <Text variant="caption" numberOfLines={1}>{t.detail} · {formatDateTime(t.created_at)}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text variant="bodyStrong" style={{ fontSize: 14 }} color={incoming ? colors.success : colors.brand900}>{incoming ? "+" : "−"}{naira(t.amount, 2)}</Text>
        {t.status !== "successful" ? <Text variant="caption" color={t.status === "processing" ? colors.brand600 : colors.danger}>{t.status_label}</Text> : null}
      </View>
    </Pressable>
  );
}
