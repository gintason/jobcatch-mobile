import { CVManager } from "@/components/seeker";
import { useEnsureRole } from "@/lib/auth";
import { useMyCVs } from "@/lib/jobs";
import { Screen } from "@/ui";

export default function CVs() {
  const ready = useEnsureRole("job_seeker");
  const cvs = useMyCVs(ready);
  return (
    <Screen back title="My CVs" onRefresh={() => cvs.refetch()} refreshing={cvs.isRefetching}>
      <CVManager enabled={ready} />
    </Screen>
  );
}
