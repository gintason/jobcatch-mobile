import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Briefcase, FileText, Search, Wrench } from "lucide-react-native";
import { JobCard } from "@/components/jobs";
import { useCategories, usePublicJobs } from "@/lib/jobs";
import { Select, Empty, Input, Loading, Screen, Text, colors, fonts, radius } from "@/ui";
import { ReferralNotice, TELL_EMPLOYER } from "@/components/ReferralNotice";
import { SearchButton } from "@/components/SearchButton";

export default function JobsTab() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const cats = useCategories("job");
  const jobs = usePublicJobs({ q: query || undefined, category: category || undefined });
  return (
    <Screen title="Jobs" subtitle="Corporate roles from verified employers." scroll={false} padded={false}>
      <FlatList
        data={jobs.data ?? []} keyExtractor={(j) => j.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}
        onRefresh={() => jobs.refetch()} refreshing={jobs.isRefetching}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 4 }}>
            <Input value={q} onChangeText={setQ} placeholder="Search job title or company" returnKeyType="search" onSubmitEditing={() => setQuery(q.trim())}
              right={<SearchButton onPress={() => setQuery(q.trim())} />}
              left={<Search size={18} color={colors.faint} />} />
            <Select value={category} onChange={setCategory} loading={cats.isLoading} placeholder="All categories" options={[{ value: "", label: "All categories" }, ...(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
            <ReferralNotice message={TELL_EMPLOYER} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Shortcut icon={<Briefcase size={16} color={colors.brand600} />} label="My applications" onPress={() => router.push("/applications")} />
              <Shortcut icon={<FileText size={16} color={colors.brand600} />} label="My CVs" onPress={() => router.push("/cvs")} />
              <Shortcut icon={<Wrench size={16} color={colors.brand600} />} label="Artisans" onPress={() => router.push("/artisans")} />
            </View>
            {jobs.isLoading ? <Loading rows={3} /> : null}
          </View>
        }
        ListEmptyComponent={jobs.isLoading ? undefined : <Empty icon={<Briefcase size={26} color={colors.brand500} />} title="No jobs match" body="Try another search or category." />}
        renderItem={({ item }) => <JobCard j={item} />}
      />
    </Screen>
  );
}

function Shortcut({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.8 }]}>
      {icon}<Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.brand800 }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}
