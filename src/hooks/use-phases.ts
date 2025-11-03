import { useState, useEffect } from "react";
import { getWbsPhases } from "@/app/wbs/[id]/actions/wbs-phase-actions";

type Phase = {
    id: number;
    name: string;
    seq: number;
};

const phasesCache: Record<number, Phase[]> = {};

export function usePhases(wbsId?: number): Phase[] | undefined {
    const [phases, setPhases] = useState<Phase[] | undefined>(
        wbsId && phasesCache[wbsId] ? phasesCache[wbsId] : undefined
    );

    useEffect(() => {
        if (!wbsId) return;

        if (phasesCache[wbsId]) {
            setPhases(phasesCache[wbsId]);
            return;
        }

        const fetchPhases = async () => {
            try {
                const fetchedPhases = await getWbsPhases(wbsId);
                phasesCache[wbsId] = fetchedPhases;
                setPhases(fetchedPhases);
            } catch (error) {
                console.error("フェーズの取得に失敗しました:", error);
            }
        };

        fetchPhases();
    }, [wbsId]);

    return phases;
}