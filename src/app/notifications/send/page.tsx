"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import {
  getNotificationTypeDisplayName,
  NotificationType,
} from "@/types/notification";

type Channel = "PUSH" | "IN_APP" | "EMAIL";

const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"] as const;

export default function SendNotificationPage() {
  const router = useRouter();

  const [targetUserId, setTargetUserId] = useState("");
  const [selfSend, setSelfSend] = useState(true);
  const [type, setType] = useState<NotificationType>(
    NotificationType.PROJECT_STATUS_CHANGED
  );
  const [priority, setPriority] =
    useState<(typeof PRIORITIES)[number]>("MEDIUM");
  const [channels, setChannels] = useState<Record<Channel, boolean>>({
    PUSH: true,
    IN_APP: true,
    EMAIL: false,
  });
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [dataJson, setDataJson] = useState('{\n  "example": true\n}');
  const [scheduledAt, setScheduledAt] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedChannels = useMemo<Channel[]>(() => {
    return (Object.keys(channels) as Channel[]).filter((c) => channels[c]);
  }, [channels]);

  const payloadPreview = useMemo(() => {
    let parsed: unknown = undefined;
    try {
      parsed = dataJson ? JSON.parse(dataJson) : undefined;
    } catch {
      parsed = "<Invalid JSON>";
    }

    return {
      type,
      priority,
      title,
      message,
      data: parsed,
      channels: selectedChannels,
      scheduledAt: scheduledAt
        ? new Date(scheduledAt).toISOString()
        : undefined,
      targetUserId: selfSend || !targetUserId ? undefined : targetUserId,
    };
  }, [
    type,
    priority,
    title,
    message,
    dataJson,
    selectedChannels,
    scheduledAt,
    targetUserId,
    selfSend,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    let data: unknown = undefined;
    try {
      data = dataJson ? JSON.parse(dataJson) : undefined;
    } catch {
      setSubmitting(false);
      setError("Data JSON が不正です");
      return;
    }

    const body = {
      targetUserId: selfSend || !targetUserId ? undefined : targetUserId,
      type,
      priority,
      title,
      message,
      data,
      channels: selectedChannels,
      scheduledAt: scheduledAt || undefined,
    };

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(
          t?.details || t?.error || `Request failed: ${res.status}`
        );
      }

      await res.json();
      setSuccess("通知を作成しました");

      // 直送の場合は一覧へ案内
      if (!scheduledAt) {
        setTimeout(() => router.push("/notifications"), 800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">通知を送信</h1>
          <p className="text-gray-600 mt-1">
            運用アナウンス/検証/臨時/予約送信に対応します。
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>通知作成フォーム</CardTitle>
            <CardDescription>
              必須項目を入力し、送信してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium mr-2">タイプ</span>
                  <select
                    id="type"
                    className="border rounded-md h-9 px-2 text-sm"
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as NotificationType)
                    }
                  >
                    {Object.values(NotificationType).map((t) => (
                      <option key={t} value={t}>
                        {getNotificationTypeDisplayName(t)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium mr-2">優先度</span>
                  <select
                    id="priority"
                    className="border rounded-md h-9 px-2 text-sm"
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as (typeof PRIORITIES)[number])
                    }
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>送信先</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="self"
                      checked={selfSend}
                      onCheckedChange={(v) => setSelfSend(Boolean(v))}
                    />
                    <Label htmlFor="self" className="text-sm">
                      自分に送る
                    </Label>
                  </div>
                  <Input
                    placeholder="targetUserId（任意）"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    disabled={selfSend}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  空または「自分に送る」の場合は、現在のユーザー宛になります。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">タイトル</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">メッセージ</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>チャンネル</Label>
                <div className="flex flex-wrap gap-4">
                  {(["PUSH", "IN_APP", "EMAIL"] as Channel[]).map((c) => (
                    <div key={c} className="flex items-center space-x-2">
                      <Checkbox
                        id={`ch-${c}`}
                        checked={channels[c]}
                        onCheckedChange={(v) =>
                          setChannels((prev) => ({ ...prev, [c]: Boolean(v) }))
                        }
                      />
                      <Label htmlFor={`ch-${c}`} className="text-sm">
                        {c}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data">データ(JSON 任意)</Label>
                <Textarea
                  id="data"
                  value={dataJson}
                  onChange={(e) => setDataJson(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled">予約送信（任意）</Label>
                <Input
                  id="scheduled"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  設定すると、その時刻にCron処理で送信されます。
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" disabled={submitting}>
                  {scheduledAt ? "予約を作成" : "今すぐ送信"}
                </Button>
                <Button variant="outline" type="button" asChild>
                  <Link href="/notifications">通知一覧へ</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>送信プレビュー</CardTitle>
            <CardDescription>
              実際に送られるリクエストのプレビュー
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">
              {JSON.stringify(payloadPreview, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
