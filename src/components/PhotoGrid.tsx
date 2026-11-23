import { useState, type ReactNode } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { mediaUrl } from "@/lib/config";
import { Text, colors, fonts, radius } from "@/ui";

export interface Photo { id: string; image: string; caption?: string }

/**
 * Portfolio photos in a 2-column grid. Tiles get explicit pixel sizes (measured
 * from the grid's own width): percentage widths + aspectRatio can collapse to
 * zero height on Android/iOS, which made the photos disappear on phones.
 * Tapping a photo opens a full-screen, swipeable viewer.
 */
export function PhotoGrid({ photos, footer, columns = 2, gap = 10 }: {
  photos: Photo[]; footer?: (p: Photo) => ReactNode; columns?: number; gap?: number;
}) {
  const { width: screen } = useWindowDimensions();
  const [width, setWidth] = useState(screen - 40);
  const [open, setOpen] = useState<number | null>(null);
  const tile = Math.max(80, Math.floor((width - gap * (columns - 1)) / columns));

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
      {photos.map((p, i) => (
        <View key={p.id} style={{ width: tile, gap: 6 }}>
          <Pressable onPress={() => setOpen(i)} accessibilityRole="imagebutton" accessibilityLabel={p.caption || "Portfolio photo"}>
            <Image source={{ uri: mediaUrl(p.image) }} style={{ width: tile, height: tile, borderRadius: radius.lg, backgroundColor: colors.brand50 }}
              contentFit="cover" transition={150} recyclingKey={p.id} />
          </Pressable>
          {footer ? footer(p) : p.caption ? <Text variant="caption" numberOfLines={2}>{p.caption}</Text> : null}
        </View>
      ))}
      {open !== null ? <Viewer photos={photos} start={open} onClose={() => setOpen(null)} /> : null}
    </View>
  );
}

function Viewer({ photos, start, onClose }: { photos: Photo[]; start: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(start);
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
        <View style={s.top}>
          <Text style={{ color: colors.white, fontFamily: fonts.semibold }}>{index + 1} / {photos.length}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close"><X size={26} color={colors.white} /></Pressable>
        </View>
        <FlatList
          data={photos} keyExtractor={(p) => p.id} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          initialScrollIndex={start} getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, flex: 1, justifyContent: "center" }}>
              <Image source={{ uri: mediaUrl(item.image) }} style={{ width, height: height * 0.7 }} contentFit="contain" />
              {item.caption ? <Text center style={{ color: colors.white, marginTop: 12, paddingHorizontal: 20 }}>{item.caption}</Text> : null}
            </View>
          )} />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
});
