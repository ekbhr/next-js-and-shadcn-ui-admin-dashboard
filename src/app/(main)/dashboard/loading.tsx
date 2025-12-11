import { PageLoadingSkeleton } from "@/components/ui/loading-spinner";

export default function DashboardLoading() {
  return <PageLoadingSkeleton showCards showTable={false} />;
}

