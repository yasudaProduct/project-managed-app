"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, Settings, CheckCheck, Send } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationList } from "./NotificationList";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NotificationCenterProps {
  className?: string;
  maxHeight?: string;
}

export function NotificationCenter({
  className = "",
  maxHeight = "400px",
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("unread");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAllNotificationsAsRead,
    refresh,
    markAllAsReadState,
  } = useNotifications({
    unreadOnly: activeTab === "unread",
    enableRealtime: false,
    autoRefresh: true,
  });

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        return
      }
      if (
        contentRef.current &&
        contentRef.current.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead();
  };

  const handleRefresh = () => {
    refresh();
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 h-auto"
            aria-label={`通知 ${unreadCount > 0 ? `(${unreadCount}件未読)` : ""
              }`}
          >
            <Bell size={20} className="text-gray-600 hover:text-gray-900" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-96 p-0" sideOffset={5}>
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">通知</h3>

            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadState?.success === false}
                  className="text-xs px-2 py-1 h-auto"
                >
                  <CheckCheck size={14} className="mr-1" />
                  全て既読
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="text-xs px-2 py-1 h-auto"
                disabled={isLoading}
              >
                更新
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-auto">
                    <Settings size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      window.location.href = "/settings/notifications";
                    }}
                  >
                    <Settings size={14} className="mr-2" />
                    通知設定
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      window.location.href = "/notifications/send";
                    }}
                  >
                    <Send size={14} className="mr-2" />
                    通知送信
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* タブ */}
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "all" | "unread")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 m-2 mb-0">
              <TabsTrigger value="unread" className="text-xs">
                未読 {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                全て
              </TabsTrigger>
            </TabsList>

            <TabsContent value="unread" className="m-0">
              <ScrollArea className="w-full" style={{ maxHeight }}>
                {unreadCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-500 text-sm">
                      未読の通知はありません
                    </p>
                  </div>
                ) : (
                  <NotificationList
                    notifications={notifications}
                    isLoading={isLoading}
                    showUnreadOnly={true}
                  />
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="m-0">
              <ScrollArea className="w-full" style={{ maxHeight }}>
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell size={48} className="text-gray-300 mb-4" />
                    <p className="text-gray-500 text-sm">
                      {isLoading ? "読み込み中..." : "通知がありません"}
                    </p>
                  </div>
                ) : (
                  <NotificationList
                    notifications={notifications}
                    isLoading={isLoading}
                    showUnreadOnly={false}
                  />
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* フッター */}
          <div className="border-t p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setIsOpen(false);
                window.location.href = "/notifications";
              }}
            >
              すべての通知を見る
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
