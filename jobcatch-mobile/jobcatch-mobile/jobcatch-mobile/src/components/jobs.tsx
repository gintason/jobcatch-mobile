import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { BadgeCheck, Building2, Star } from "lucide-react-native";
import { mediaUrl } from "@/lib/config";
import { initials, naira, timeAgo } from "@/lib/format";
import type { PublicArtisan, PublicJob } from "@/lib/jobs";
import { Badge, Text, colors, fonts, radius, shadow } from "@/ui";

export function salary(j: { salary_min: string | null; salary_max: string | null }) {
  if (j.salary_min && j.salary_max) return `${naira(j.salary_min)} – ${naira(j.salary_max)}`;
  if (j.salary_min) return `From ${naira(j.salary_min)}`;
  if (j.salary_max) return `Up to ${naira(j.salary_max)}`;
  return "Salary not stated";
}

export function JobCard({ j, wide }: { j: PublicJob; wide?: boolean }) {
  return (
    <Pressable onPress={() => router.push(`/jobs/${j.id}`)} style={({ pressed }) => [{
      backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.line, ...shadow.card,
      width: wide ? 280 : undefined }, pressed && { transform: [{ scale: 0.985 }] }]}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" }}>
          <Building2 size={20} color={colors.brand600} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h3" numberOfLines={1}>{j.title}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>{j.employer_company}</Text>
            {j.employer_verified ? <BadgeCheck size={14} color={colors.brand500} /> : null}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {j.category_name ? <Badge label={j.category_name} tone="neutral" /> : null}
        {j.is_featured ? <Badge label="Featured" tone="warning" /> : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: colors.brand800 }}>{salary(j)}</Text>
        <Text variant="caption">{timeAgo(j.posted_at || j.created_at)}</Text>
      </View>
    </Pressable>
  );
}

export function Avatar({ uri, name, size = 52 }: { uri?: string | null; name: string; size?: number }) {
  if (uri) return <Image source={{ uri: mediaUrl(uri) }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brand50 }} contentFit="cover" />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brand100, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: size * 0.36, color: colors.brand700 }}>{initials(name)}</Text>
    </View>
  );
}

export function ArtisanCard({ a, wide }: { a: PublicArtisan; wide?: boolean }) {
  return (
    <Pressable onPress={() => router.push(`/artisans/${a.id}`)} style={({ pressed }) => [{
      flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14,
      borderWidth: 1, borderColor: colors.line, width: wide ? 260 : undefined, ...shadow.card }, pressed && { transform: [{ scale: 0.985 }] }]}>
      <Avatar uri={a.image} name={a.full_name} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{a.full_name}</Text>
          {a.is_verified ? <BadgeCheck size={15} color={colors.brand500} /> : null}
        </View>
        <Text variant="small" numberOfLines={1}>{a.trade || "Artisan"}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Star size={13} color={colors.amber} fill={colors.amber} />
          <Text variant="caption" color={colors.ink}>{Number(a.avg_rating) ? Number(a.avg_rating).toFixed(1) : "New"}{a.rating_count ? ` (${a.rating_count})` : ""}</Text>
        </View>
      </View>
    </Pressable>
  );
}
