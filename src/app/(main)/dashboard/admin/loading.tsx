import { PageLoadingSkeleton } from "@/components/ui/loading-spinner";

export default function AdminLoading() {
  return <PageLoadingSkeleton showCards={false} showTable />;
}

