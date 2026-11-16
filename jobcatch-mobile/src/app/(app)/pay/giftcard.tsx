import { useState } from "react";
import { PayPanel, useOrder } from "@/components/bills";
import { apiError } from "@/lib/api";
import { useCatalogue, useGiftCardCountries, useGiftCardProducts, useGiftCardQuote } from "@/lib/billing";
import { Card, Input, Notice, Screen, Select, Text, colors } from "@/ui";

export default function BuyGiftCard() {
  const { data: catalogue } = useCatalogue();
  const countries = useGiftCardCountries(true);
  const [country, setCountry] = useState("US");
  const products = useGiftCardProducts(country);
  const [productId, setProductId] = useState("");
  const [amount, setAmount] = useState("");
  const [qty, setQty] = useState("1");
  const [method, setMethod] = useState<"wallet" | "card">("wallet");
  const { place, pending, error } = useOrder();
  const product = products.data?.find((p) => String(p.product_id) === productId);
  const quantity = Math.max(0, Math.floor(Number(qty) || 0));
  const maxQty = catalogue?.giftcard_max_quantity ?? 10;
  const quote = useGiftCardQuote(product?.product_id, amount, quantity);
  const fee = Number(catalogue?.fees?.giftcard ?? 0);
  const face = quote.data ? Number(quote.data.price_ngn) : 0;
  const fixed = product?.denomination_type === "FIXED";
  return (
    <Screen back title="Buy gift cards" subtitle="Amazon, iTunes, Google Play, Steam and more.">
      <Card style={{ gap: 16 }}>
        <Select label="Country" value={country} loading={countries.isLoading}
          options={(countries.data ?? [{ country_code: "US", country_name: "United States" }]).map((c) => ({ value: c.country_code, label: c.country_name }))}
          onChange={(v) => { setCountry(v); setProductId(""); setAmount(""); }} />
        <Select label="Gift card" value={productId} loading={products.isLoading}
          options={(products.data ?? []).map((p) => ({ value: String(p.product_id), label: p.product_name }))}
          onChange={(v) => { setProductId(v); setAmount(""); }} placeholder="Choose a card" />
        {product ? (fixed ? (
          <Select label={`Card value (${product.currency_code})`} value={amount} onChange={setAmount}
            options={(product.fixed_recipient_denominations ?? []).map((d) => ({ value: String(d), label: `${product.currency_code} ${d}` }))} />
        ) : (
          <Input label={`Card value (${product.currency_code} ${product.min_recipient_denomination}–${product.max_recipient_denomination})`}
            value={amount} onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, ""))} keyboardType="decimal-pad" />
        )) : null}
        {product ? <Input label={`Quantity (1–${maxQty})`} value={qty} onChangeText={(v) => setQty(v.replace(/\D/g, ""))} keyboardType="number-pad" /> : null}
        {quote.isFetching ? <Text variant="caption">Getting today’s price…</Text> : null}
        {quote.isError ? <Notice kind="error">{apiError(quote.error, "That value isn't available.")}</Notice> : null}
        <PayPanel amount={face} fee={fee} ready={!!quote.data && quantity >= 1 && quantity <= maxQty} pending={pending} error={error} method={method} setMethod={setMethod}
          note={<Text variant="caption" color={colors.muted}>Card codes appear on your receipt once issued. Prices follow the live exchange rate and are fixed when you pay.</Text>}
          onPay={() => product && place({ service: "giftcard", provider: "", customer_id: "", product_id: product.product_id, product_name: product.product_name,
            card_amount: amount, card_currency: product.currency_code, quantity, payment_method: method })} />
      </Card>
    </Screen>
  );
}
