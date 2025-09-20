import webpush from "web-push";

console.log("Generating VAPID keys for Push Notifications...\n");

/**
 * このスクリプトを実行すると、VAPIDキーが生成されます。
 * 生成されたキーを.envファイルに追加してください。
 */

try {
  // VAPIDキーを生成
  const vapidKeys = webpush.generateVAPIDKeys();

  console.log("Vapidキーが正常に生成されました!");
  console.log("これらを.envファイルに追加します:\n");
  console.log("# Push Notification VAPID Keys");
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
  console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
  console.log(`VAPID_SUBJECT="mailto:admin@example.com"`);
  console.log(`CRON_SECRET="${generateRandomString(32)}"`);

  console.log("\nNote: 秘密鍵は安全に保管し、公開しないでください!");
  console.log("CRON_SECRETはcronジョブの認証に使用されます。");
} catch (error) {
  console.error("VAPIDキーの生成に失敗しました:", error);
  process.exit(1);
}

function generateRandomString(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
