import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { BadgeCheck, CalendarCheck, MapPin, Navigation, Search, Star, Wrench } from "lucide-react-native";
import { ArtisanCard, TierBadge } from "@/components/jobs";
import { useBrowseArtisans, useCategories, useNearbyArtisans, type MatchedArtisan } from "@/lib/jobs";
import { currentPlace } from "@/lib/location";
import { Button, Card, Chips, Empty, Input, Loading, Select, Text, colors, Screen } from "@/ui";

const RADII = ["5", "10", "20", "50"] as const;

/** Find an artisan — mirrors the web's /artisans: search, category, "Artisans near me", all artisans. */
export default function Artisans() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<(typeof RADII)[number]>("20");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const cats = useCategories("home_service");
  const list = useBrowseArtisans({ q: query || undefined, category: category || undefined });
  const nearby = useNearbyArtisans(coords, Number(radius));

  async function findNearMe() {
    setLocError(""); setLocating(true);
    try { const p = await currentPlace(); setCoords({ lat: p.lat, lng: p.lng }); }
    catch (e) { setLocError((e as Error).message || "Couldn't get your location. Allow access and try again."); }
    finally { setLocating(false); }
  }

  return (
    <Screen back title="Find an artisan" subtitle="Browse verified pros and book in minutes." scroll={false} padded={false}
      right={<Button title="Bookings" kind="secondary" size="md" icon={<CalendarCheck size={16} color={colors.brand600} />} onPress={() => router.push("/bookings")} />}>
      <FlatList
        data={list.artisans} keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 10 }}
        onRefresh={() => { list.refetch(); if (coords) nearby.refetch(); }} refreshing={list.isRefetching}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()} onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <Input value={q} onChangeText={setQ} placeholder="Search by name or service…" returnKeyType="search" onSubmitEditing={() => setQuery(q.trim())} left={<Search size={18} color={colors.faint} />} />
            <Select value={category} onChange={setCategory} loading={cats.isLoading} placeholder="All categories" options={[{ value: "", label: "All categories" }, ...(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Button title={locating ? "Finding you…" : coords ? "Showing artisans near you" : "Artisans near me"} kind="secondary" size="md"
                loading={locating} icon={<Navigation size={16} color={colors.brand600} />} onPress={findNearMe} style={{ flex: 1 }} />
              {coords ? <Text variant="label" color={colors.brand500} onPress={() => setCoords(null)}>Clear</Text> : null}
            </View>
            {locError ? <Text variant="caption" color={colors.warning}>{locError}</Text> : null}

            {coords ? (
              <View style={{ gap: 10 }}>
                <Text variant="label">Within</Text>
                <Chips scroll={false} value={radius} onChange={setRadius} options={RADII.map((r) => ({ value: r, label: `${r} km` }))} />
                <Text variant="h3" style={{ marginTop: 4 }}>Nearest to you</Text>
                {nearby.isLoading ? <Loading rows={2} /> : nearby.data?.length ? nearby.data.map((m) => <NearbyCard key={m.artisan_id} m={m} />)
                  : <Card><Text variant="small">No available artisans within {radius} km. Try a wider distance or the full list below.</Text></Card>}
                <Text variant="h3" style={{ marginTop: 8 }}>All artisans</Text>
              </View>
            ) : null}

            {list.total ? <Text variant="caption">Showing {list.artisans.length} of {list.total.toLocaleString()} artisan{list.total === 1 ? "" : "s"}</Text> : null}
            {list.isLoading ? <Loading rows={4} /> : null}
          </View>
        }
        ListEmptyComponent={list.isLoading ? undefined : <Empty icon={<Wrench size={26} color={colors.brand500} />} title="No artisans found" body="Try a different search or category." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.brand500} style={{ marginVertical: 16 }} /> : undefined}
        renderItem={({ item }) => <ArtisanCard a={item} />}
      />
    </Screen>
  );
}

function NearbyCard({ m }: { m: MatchedArtisan }) {
  const rated = m.rating_count > 0;
  return (
    <Pressable onPress={() => router.push(`/artisans/${m.artisan_id}`)} accessibilityRole="button">
      <Card style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>{m.full_name}</Text>
          {m.is_work_verified ? <BadgeCheck size={15} color={colors.brand500} /> : null}
          <TierBadge tier={m.tier} />
          <View style={{ flex: 1 }} />
          {rated ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Star size={14} color={colors.amber} fill={colors.amber} />
              <Text variant="bodyStrong" style={{ fontSize: 14 }}>{parseFloat(m.avg_rating).toFixed(1)}</Text>
            </View>
          ) : <Text variant="caption" color={colors.brand500}>New</Text>}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <MapPin size={13} color={colors.brand600} /><Text variant="caption" color={colors.brand600}>{m.distance_km} km away</Text>
        </View>
        <Text variant="small">{m.services[0]?.title ?? "Service professional"}</Text>
      </Card>
    </Pressable>
  );
}
