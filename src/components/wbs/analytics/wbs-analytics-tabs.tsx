"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoefficientTable } from "./coefficient-table";
import { ProportionTable } from "./proportion-table";
import { WbsPhase } from "@/types/wbs";

type PhaseTemplate = {
    id: number;
    name: string;
    code: string;
    seq: number;
};

type WbsItem = {
    id: number;
    name: string;
    projectId: string;
};

type Props = {
    phaseTemplates: PhaseTemplate[];
    wbsList: WbsItem[];
    tagNames: string[];
};

export function WbsAnalyticsTabs({ phaseTemplates, wbsList, tagNames }: Props) {
    return (
        <Tabs defaultValue="coefficients">
            <TabsList>
                <TabsTrigger value="coefficients">
                    係数指標
                </TabsTrigger>
                <TabsTrigger value="proportions">
                    工程割合
                </TabsTrigger>
            </TabsList>
            <TabsContent value="coefficients">
                <CoefficientTable
                    phaseTemplates={phaseTemplates}
                    wbsList={wbsList}
                    tagNames={tagNames}
                />
            </TabsContent>
            <TabsContent value="proportions">
                <ProportionTable
                    phaseTemplates={phaseTemplates}
                    wbsList={wbsList}
                    tagNames={tagNames}
                />
            </TabsContent>
        </Tabs>
    );
}
