// Service Worker for Push Notifications

const CACHE_NAME = "project-manager-v1"; // キャッシュの名前
const urlsToCache = ["/", "/offline.html"]; // キャッシュするファイル

// インストールイベント
self.addEventListener("install", function (event) {
  console.log("Service Worker: Install");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        console.log("Service Worker: Caching files");
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// アクティベートイベント
self.addEventListener("activate", function (event) {
  console.log("Service Worker: Activate");

  event.waitUntil(
    caches
      .keys()
      .then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            if (cacheName !== CACHE_NAME) {
              console.log("Service Worker: Deleting old cache", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// フェッチイベント
self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      // キャッシュがあればキャッシュから返す
      if (response) {
        return response;
      }

      return fetch(event.request).catch(function () {
        // ネットワークエラーの場合はオフラインページを返す
        if (event.request.destination === "document") {
          return caches.match("/offline.html");
        }
      });
    })
  );
});

// Push通知受信イベント
self.addEventListener("push", function (event) {
  console.log("Service Worker: Push received");

  if (!event.data) {
    console.log("No data received with push event");
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (error) {
    console.error("Error parsing push data:", error);
    data = {
      title: "プロジェクト管理",
      message: "新しい通知があります",
      type: "INFO",
    };
  }

  const options = {
    body: data.message,
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    image: data.image,
    vibrate: getVibrationPattern(data.priority),
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id,
      type: data.type,
      priority: data.priority,
      actionUrl: data.actionUrl,
    },
    actions: getNotificationActions(data.type),
    tag: data.tag || "default",
    requireInteraction: data.priority === "URGENT",
    silent: data.priority === "LOW",
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 通知クリックイベント
self.addEventListener("notificationclick", function (event) {
  console.log("Service Worker: Notification clicked");

  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  let url = "/notifications";

  if (action === "view" && notificationData.actionUrl) {
    url = notificationData.actionUrl;
  } else if (action === "dismiss") {
    // 何もしない（通知を閉じるだけ）
    return;
  } else if (action === "mark-read") {
    // 既読処理のAPIを呼び出し
    event.waitUntil(markNotificationAsRead(notificationData.primaryKey));
    return;
  }

  // ページを開く
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(function (clientList) {
      // 既に開いているタブがあるかチェック
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }

      // 新しいタブで開く
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// 通知閉じるイベント
self.addEventListener("notificationclose", function (event) {
  console.log("Service Worker: Notification closed");

  const notificationData = event.notification.data;

  // 分析データを送信（オプション）
  event.waitUntil(
    fetch("/api/notifications/analytics", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "close",
        notificationId: notificationData.primaryKey,
        timestamp: Date.now(),
      }),
    }).catch((error) => {
      console.log("Failed to send analytics:", error);
    })
  );
});

// バックグラウンド同期イベント
self.addEventListener("sync", function (event) {
  console.log("Service Worker: Background sync");

  if (event.tag === "background-sync") {
    event.waitUntil(doBackgroundSync());
  }
});

// ヘルパー関数：振動パターンを取得
function getVibrationPattern(priority) {
  switch (priority) {
    case "URGENT":
      return [200, 100, 200, 100, 200];
    case "HIGH":
      return [200, 100, 200];
    case "MEDIUM":
      return [200];
    case "LOW":
    default:
      return [];
  }
}

// ヘルパー関数：通知アクションを取得
function getNotificationActions(type) {
  const commonActions = [
    {
      action: "view",
      title: "詳細を見る",
      icon: "/icons/view.png",
    },
    {
      action: "dismiss",
      title: "閉じる",
      icon: "/icons/dismiss.png",
    },
  ];

  switch (type) {
    case "TASK_DEADLINE_WARNING":
    case "TASK_DEADLINE_OVERDUE":
    case "TASK_MANHOUR_WARNING":
    case "TASK_MANHOUR_EXCEEDED":
      return [
        {
          action: "view",
          title: "タスクを確認",
          icon: "/icons/task.png",
        },
        {
          action: "mark-read",
          title: "既読にする",
          icon: "/icons/check.png",
        },
        {
          action: "dismiss",
          title: "後で",
          icon: "/icons/dismiss.png",
        },
      ];
    case "TASK_ASSIGNED":
      return [
        {
          action: "view",
          title: "タスクを開始",
          icon: "/icons/play.png",
        },
        ...commonActions,
      ];
    case "SCHEDULE_DELAY":
      return [
        {
          action: "view",
          title: "スケジュールを確認",
          icon: "/icons/schedule.png",
        },
        ...commonActions,
      ];
    default:
      return commonActions;
  }
}

// ヘルパー関数：通知を既読にする
async function markNotificationAsRead(notificationId) {
  try {
    const response = await fetch("/api/notifications/mark-read", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationIds: [notificationId],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to mark notification as read");
    }

    console.log("Notification marked as read:", notificationId);
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

// ヘルパー関数：バックグラウンド同期
async function doBackgroundSync() {
  try {
    console.log("Performing background sync...");

    // 未送信の通知データがあれば送信
    // オフライン時に蓄積されたデータを処理
    const response = await fetch("/api/notifications/sync", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log("Background sync completed successfully");
    } else {
      console.log("Background sync failed");
    }
  } catch (error) {
    console.error("Background sync error:", error);
  }
}

// エラーハンドリング
self.addEventListener("error", function (event) {
  console.error("Service Worker error:", event.error);
});

// 未処理のプロミスエラーイベント
self.addEventListener("unhandledrejection", function (event) {
  console.error("Service Worker unhandled promise rejection:", event.reason);
});

console.log("Service Worker: Loaded");
