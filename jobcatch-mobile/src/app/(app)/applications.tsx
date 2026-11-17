import { ApplicationsList } from "@/components/seeker";
import { useEnsureRole } from "@/lib/auth";
import { useMyApplications } from "@/lib/jobs";
import { Screen } from "@/ui";

export default function Applications() {
  const ready = useEnsureRole("job_seeker");
  const apps = useMyApplications(ready);
  return (
    <Screen back title="My applications" onRefresh={() => apps.refetch()} refreshing={apps.isRefetching}>
      <ApplicationsList enabled={ready} />
    </Screen>
  );
}
