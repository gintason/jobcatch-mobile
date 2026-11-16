import { useMemo, useState, type ReactNode } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, ChevronDown, Search, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Text } from "./Text";
import { colors, fonts, radius } from "./theme";

export interface Option { value: string; label: string; hint?: string; icon?: ReactNode }

/** Field that opens a full-height searchable list sheet. */
export function Select({ label, value, options, onChange, placeholder = "Select…", disabled, loading }: {
  label?: string; value: string; options: Option[]; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(t)) : options;
  }, [options, q]);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <Pressable disabled={disabled} onPress={() => setOpen(true)} style={[s.field, disabled && { opacity: 0.55 }]} accessibilityRole="button" accessibilityLabel={label}>
        {current?.icon}
        <Text numberOfLines={1} style={{ flex: 1 }} color={current ? colors.ink : colors.faint}>
          {loading ? "Loading…" : current ? current.label : placeholder}
        </Text>
        <ChevronDown size={18} color={colors.faint} />
      </Pressable>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
          <View style={s.sheetHead}>
            <Text variant="h2" style={{ flex: 1 }}>{label ?? "Choose"}</Text>
            <Pressable hitSlop={12} onPress={() => setOpen(false)} accessibilityLabel="Close"><X size={24} color={colors.brand900} /></Pressable>
          </View>
          {options.length > 8 ? (
            <View style={s.search}>
              <Search size={18} color={colors.faint} />
              <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={colors.faint} style={s.searchInput} autoFocus />
            </View>
          ) : null}
          <FlatList data={filtered} keyExtractor={(o) => o.value} keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text variant="small" center style={{ padding: 24 }}>{loading ? "Loading…" : "Nothing to show."}</Text>}
            renderItem={({ item }) => (
              <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(item.value); setOpen(false); setQ(""); }}
                style={({ pressed }) => [s.opt, pressed && { backgroundColor: colors.mist }]}>
                {item.icon}
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{item.label}</Text>
                  {item.hint ? <Text variant="small">{item.hint}</Text> : null}
                </View>
                {item.value === value ? <Check size={20} color={colors.brand500} /> : null}
              </Pressable>
            )} />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

/** Horizontal pill selector. */
export function Chips<T extends string>({ value, options, onChange, scroll = true }: { value: T; options: { value: T; label: string; icon?: ReactNode; disabled?: boolean; hint?: string }[]; onChange: (v: T) => void; scroll?: boolean }) {
  const items = options.map((o) => {
    const on = o.value === value;
    return (
      <Pressable key={o.value} disabled={o.disabled} onPress={() => { Haptics.selectionAsync().catch(() => {}); onChange(o.value); }}
        accessibilityState={{ selected: on, disabled: !!o.disabled }} style={[s.chip, on && s.chipOn, o.disabled && { opacity: 0.45 }]}>
        {o.icon}
        <Text style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: on ? colors.white : colors.brand800 }}>{o.label}</Text>
        {o.hint ? <Text style={{ fontSize: 10.5, color: on ? colors.white : colors.danger }}>{o.hint}</Text> : null}
      </Pressable>
    );
  });
  return scroll ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>{items}</ScrollView>
    : <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{items}</View>;
}

/** Two-to-four equal segments. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segItem, on && s.segOn]} accessibilityState={{ selected: on }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: on ? colors.brand700 : colors.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  field: { minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.mist, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10 },
  sheetHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.mist, borderWidth: 1, borderColor: colors.line },
  searchInput: { flex: 1, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  opt: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.brand100 },
  chipOn: { backgroundColor: colors.brand500, borderColor: colors.brand500 },
  seg: { flexDirection: "row", backgroundColor: colors.brand50, borderRadius: radius.md, padding: 4 },
  segItem: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.sm },
  segOn: { backgroundColor: colors.white, shadowColor: "#021d52", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
});
