"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import {
    getWbsTags,
    getAllTagNames,
    addWbsTag,
    removeWbsTag,
} from "@/app/wbs/[id]/actions/wbs-tag-actions";

type WbsTagInputProps = {
    wbsId: number;
};

export function WbsTagInput({ wbsId }: WbsTagInputProps) {
    const [tags, setTags] = useState<{ id: number; name: string }[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const loadTags = useCallback(async () => {
        const [currentTags, allNames] = await Promise.all([
            getWbsTags(wbsId),
            getAllTagNames(),
        ]);
        setTags(currentTags);
        setSuggestions(allNames);
    }, [wbsId]);

    useEffect(() => {
        loadTags();
    }, [loadTags]);

    const handleAdd = async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (tags.some((t) => t.name === trimmed)) return;

        setIsLoading(true);
        try {
            const newTag = await addWbsTag(wbsId, trimmed);
            setTags((prev) => [...prev, newTag]);
            if (!suggestions.includes(trimmed)) {
                setSuggestions((prev) => [...prev, trimmed].sort());
            }
            setInputValue("");
            setShowSuggestions(false);
        } catch {
            // エラー時は何もしない
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (name: string) => {
        setIsLoading(true);
        try {
            await removeWbsTag(wbsId, name);
            setTags((prev) => prev.filter((t) => t.name !== name));
        } catch {
            // エラー時は何もしない
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSuggestions = suggestions.filter(
        (s) =>
            s.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tags.some((t) => t.name === s)
    );

    return (
        <div className="space-y-2">
            <div className="text-sm font-medium">類似案件タグ</div>
            <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="gap-1">
                        {tag.name}
                        <button
                            type="button"
                            onClick={() => handleRemove(tag.name)}
                            disabled={isLoading}
                            className="ml-1 rounded-full outline-none hover:bg-muted-foreground/20"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>
            <div className="relative">
                <div className="flex gap-1">
                    <Input
                        placeholder="タグを追加..."
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleAdd(inputValue);
                            }
                        }}
                        className="h-8 text-sm"
                        disabled={isLoading}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdd(inputValue)}
                        disabled={isLoading || !inputValue.trim()}
                        className="h-8"
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
                {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                        <div className="max-h-32 overflow-y-auto p-1">
                            {filteredSuggestions.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    className="w-full rounded px-2 py-1 text-left text-sm hover:bg-accent"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleAdd(s);
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
