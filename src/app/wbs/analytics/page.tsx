import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { WbsAnalyticsTabs } from "@/components/wbs/analytics/wbs-analytics-tabs";
import { getPhaseTemplates, getAllWbs, getAllTagNames } from "./actions";

export default async function WbsAnalyticsPage() {
    const [templates, wbsList, tagNames] = await Promise.all([
        getPhaseTemplates(),
        getAllWbs(),
        getAllTagNames(),
    ]);

    return (
        <div className="container mx-auto mt-4 space-y-4">
            <h1 className="text-2xl font-bold">WBS分析</h1>
            <Suspense
                fallback={
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                }
            >
                <WbsAnalyticsTabs
                    phaseTemplates={templates ?? []}
                    wbsList={wbsList ?? []}
                    tagNames={tagNames}
                />
            </Suspense>
        </div>
    );
}
