import { Suspense } from "react";
import ResearchPage from "@/components/ResearchPage";

export default function Page() {
  return (
    <Suspense>
      <ResearchPage />
    </Suspense>
  );
}
