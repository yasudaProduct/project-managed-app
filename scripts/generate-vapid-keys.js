const webpush = require('web-push');

console.log('Generating VAPID keys for Push Notifications...\n');

try {
  const vapidKeys = webpush.generateVAPIDKeys();
  
  console.log('VAPID keys generated successfully!');
  console.log('Add these to your .env.local file:\n');
  
  console.log('# Push Notification VAPID Keys');
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`);
  console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`);
  console.log(`VAPID_SUBJECT="mailto:admin@example.com"`);
  console.log(`CRON_SECRET="${generateRandomString(32)}"`);
  
  console.log('\nNote: Keep the private key secure and never expose it publicly!');
  console.log('The CRON_SECRET is used to authenticate cron job endpoints.');
  
} catch (error) {
  console.error('Error generating VAPID keys:', error);
  process.exit(1);
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}