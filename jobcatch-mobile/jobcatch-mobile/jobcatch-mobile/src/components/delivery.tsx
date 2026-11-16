import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Bike, Car, CheckCircle2, LocateFixed, MapPin, Truck, type LucideIcon } from "lucide-react-native";
import type { Delivery, LatLng, VehicleType } from "@/lib/dispatch";
import { formatDateTime, naira } from "@/lib/format";
import { currentPlace, geocode } from "@/lib/location";
import { Badge, Input, Text, colors, fonts } from "@/ui";

export const VEHICLE_ICON: Record<VehicleType, LucideIcon> = { bike: Bike, tricycle: Truck, car: Car, van: Truck };

/**
 * Address entry that resolves to coordinates: type an address (geocoded by the
 * device after a short pause) or tap "Use my location".
 */
export function AddressField({ label, placeholder, value, onChange, point, onPoint }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void; point: LatLng | null; onPoint: (p: LatLng | null) => void;
}) {
  const [state, setState] = useState<"idle" | "finding" | "found" | "missing" | "gps">("idle");
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function type(v: string) {
    onChange(v);
    if (timer.current) clearTimeout(timer.current);
    if (v.trim().length < 6) { onPoint(null); setState("idle"); return; }
    setState("finding");
    timer.current = setTimeout(async () => {
      const p = await geocode(v);
      onPoint(p);
      setState(p ? "found" : "missing");
    }, 900);
  }

  async function useGps() {
    setErr(""); setState("finding");
    try {
      const p = await currentPlace();
      if (timer.current) clearTimeout(timer.current);
      onChange(p.address || `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`);
      onPoint({ lat: p.lat, lng: p.lng });
      setState("gps");
    } catch (e) { setErr((e as Error).message || "Couldn't get your location."); setState(point ? "found" : "idle"); }
  }

  const status = state === "finding" ? <ActivityIndicator size="small" color={colors.brand500} />
    : point ? <CheckCircle2 size={18} color={colors.success} /> : <MapPin size={18} color={colors.faint} />;
  return (
    <View style={{ gap: 6 }}>
      <Input label={label} value={value} onChangeText={type} placeholder={placeholder} left={status} autoCorrect={false} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="caption" color={state === "missing" ? colors.warning : undefined} style={{ flex: 1 }}>
          {err || (state === "missing" ? "We couldn't place this address — add the area and city, or use your location."
            : state === "gps" ? "Using your current location." : point ? "Location found." : "Street, area and city work best.")}
        </Text>
        <Pressable onPress={useGps} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} accessibilityRole="button">
          <LocateFixed size={15} color={colors.brand500} /><Text style={{ fontFamily: fonts.semibold, fontSize: 12.5, color: colors.brand500 }}>Use my location</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function DeliveryRow({ d, rider }: { d: Delivery; rider?: boolean }) {
  const Icon = VEHICLE_ICON[d.vehicle_type];
  return (
    <Pressable onPress={() => router.push(rider ? `/rider` : `/delivery/${d.id}`)} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }, pressed && { opacity: 0.8 }]}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" }}><Icon size={18} color={colors.brand600} /></View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1} style={{ fontSize: 14 }}>{d.dropoff_address}</Text>
        <Text variant="caption">{d.kind_label} · {formatDateTime(d.created_at)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text variant="bodyStrong" style={{ fontSize: 14 }}>{naira(rider ? d.rider_share : d.fare)}</Text>
        <Badge label={d.status_label} status={d.status} />
      </View>
    </Pressable>
  );
}

export function openDirections(p: LatLng) {
  const url = Platform.select({ ios: `maps://?daddr=${p.lat},${p.lng}`, default: `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}` });
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`));
}
export const call = (phone: string) => Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
