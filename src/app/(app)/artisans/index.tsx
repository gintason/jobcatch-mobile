import { useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { router } from "expo-router";
import { CalendarCheck, Search, Wrench } from "lucide-react-native";
import { ArtisanCard } from "@/components/jobs";
import { useBrowseArtisans, useCategories } from "@/lib/jobs";
import { Button, Select, Empty, Input, Loading, Screen, Text, colors } from "@/ui";

export default function Artisans() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const cats = useCategories("home_service");
  const list = useBrowseArtisans({ q: query || undefined, category: category || undefined });
  return (
    <Screen back title="Artisans" subtitle="Vetted plumbers, electricians, cleaners and more." scroll={false} padded={false}
      right={<Button title="Bookings" kind="secondary" size="md" icon={<CalendarCheck size={16} color={colors.brand600} />} onPress={() => router.push("/bookings")} />}>
      <FlatList
        data={list.artisans} keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 10 }}
        onRefresh={() => list.refetch()} refreshing={list.isRefetching}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()} onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <Input value={q} onChangeText={setQ} placeholder="Search a trade or name" returnKeyType="search" onSubmitEditing={() => setQuery(q.trim())} left={<Search size={18} color={colors.faint} />} />
            <Select value={category} onChange={setCategory} loading={cats.isLoading} placeholder="All categories" options={[{ value: "", label: "All categories" }, ...(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
            {list.total ? <Text variant="caption">{list.total.toLocaleString()} artisans</Text> : null}
            {list.isLoading ? <Loading rows={4} /> : null}
          </View>
        }
        ListEmptyComponent={list.isLoading ? undefined : <Empty icon={<Wrench size={26} color={colors.brand500} />} title="No artisans found" body="Try another trade or clear the filter." />}
        ListFooterComponent={list.isFetchingNextPage ? <ActivityIndicator color={colors.brand500} style={{ marginVertical: 16 }} /> : undefined}
        renderItem={({ item }) => <ArtisanCard a={item} />}
      />
    </Screen>
  );
}
