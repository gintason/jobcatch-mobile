import { View } from "react-native";
import { router } from "expo-router";
import { Briefcase } from "lucide-react-native";
import { useAuth, useEnsureRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { useMyApplications } from "@/lib/jobs";
import { Badge, Card, Empty, Loading, Screen, Text, colors } from "@/ui";

const LABEL = { submitted: "Submitted", shortlisted: "Shortlisted", rejected: "Not selected", hired: "Hired" } as const;

export default function Applications() {
  const { user } = useAuth();
  const ready = useEnsureRole("job_seeker");
  const apps = useMyApplications(ready);
  const mine = apps.data?.filter((a) => !a.seeker_email || a.seeker_email === user?.email);
  return (
    <Screen back title="My applications" onRefresh={() => apps.refetch()} refreshing={apps.isRefetching}>
      {!ready || apps.isLoading ? <Loading /> : mine?.length ? (
        <Card style={{ paddingVertical: 4 }}>
          {mine.map((a, i) => (
            <View key={a.id} style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }, i ? { borderTopWidth: 1, borderTopColor: colors.line } : null]}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1} onPress={() => router.push(`/jobs/${a.job}`)}>{a.job_title}</Text>
                <Text variant="caption">Applied {formatDate(a.created_at)}</Text>
              </View>
              <Badge label={LABEL[a.status]} status={a.status} />
            </View>
          ))}
        </Card>
      ) : <Empty icon={<Briefcase size={26} color={colors.brand500} />} title="No applications yet" body="Find a role you like and apply in a few taps." action="Browse jobs" onAction={() => router.push("/jobs")} />}
    </Screen>
  );
}
