/**
 * WhatsApp customer support. Buttons open a chat with JobCatch support with the
 * transaction details already typed, so support can find it straight away.
 */
export const SUPPORT_WHATSAPP = { number: "2348104067235", display: "0810 406 7235" };

export function whatsappUrl(message: string) {
  return `https://wa.me/${SUPPORT_WHATSAPP.number}?text=${encodeURIComponent(message)}`;
}

const lines = (title: string, rows: [string, string | null | undefined][]) =>
  [`Hello JobCatch Support, ${title}`, "", ...rows.filter(([, v]) => v).map(([k, v]) => `• ${k}: ${v}`), "", "Issue: "].join("\n");

export function billMessage(o: {
  receipt_number: string; service_label: string; variation_label?: string; provider?: string; customer_id?: string;
  total: string; status_label: string; created_at: string;
}) {
  const name = o.service_label.toLowerCase();
  const what = name.includes("airtime") || name.includes("data")
    ? `my ${o.service_label} was not credited.` : `I need help with my ${o.service_label} payment.`;
  return lines(what, [
    ["Receipt", o.receipt_number], ["Service", [o.service_label, o.provider?.toUpperCase(), o.variation_label].filter(Boolean).join(" · ")],
    ["Recipient", o.customer_id], ["Amount", `₦${Number(o.total).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`],
    ["Status", o.status_label], ["Date", new Date(o.created_at).toLocaleString("en-NG")],
  ]);
}

export function deliveryMessage(d: { reference: string; kind_label: string; status_label: string; fare: string; pickup_address: string; dropoff_address: string; created_at: string }) {
  return lines("I need help with a delivery.", [
    ["Reference", d.reference], ["Type", d.kind_label], ["Status", d.status_label], ["Fare", `₦${Number(d.fare).toLocaleString("en-NG")}`],
    ["From", d.pickup_address], ["To", d.dropoff_address], ["Date", new Date(d.created_at).toLocaleString("en-NG")],
  ]);
}

export function transferMessage(t: { reference: string; counterparty: string; detail: string; amount: string; status_label: string; created_at: string }) {
  return lines("I need help with a transfer.", [
    ["Reference", t.reference], ["To/From", `${t.counterparty} (${t.detail})`],
    ["Amount", `₦${Number(t.amount).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`], ["Status", t.status_label],
    ["Date", new Date(t.created_at).toLocaleString("en-NG")],
  ]);
}

export const generalMessage = (email?: string, reference?: string | null) =>
  lines("I need help with JobCatch.", [["Account email", email], ["Reference", reference]]);
