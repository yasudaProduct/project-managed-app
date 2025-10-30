import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ImportJobsClient from "@/app/import-jobs/import-jobs-client";

export default function ImportJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <div className="container mx-auto mt-2">
        <ImportJobsClient />
      </div>
    </Suspense>
  );
}
