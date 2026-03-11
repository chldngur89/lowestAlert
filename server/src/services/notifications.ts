import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin (if service account exists)
let firebaseInitialized = false;
try {
  const serviceAccountPath = join(__dirname, '../../firebase-service-account.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  firebaseInitialized = true;
  console.log('[Notifications] Firebase Admin initialized');
} catch (error) {
  console.log('[Notifications] Firebase Admin not initialized (service account not found)');
}

interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(
  fcmToken: string,
  notification: PushNotificationData
): Promise<void> {
  if (!firebaseInitialized) {
    console.log('[Notifications] Skipping push notification (Firebase not initialized)');
    return;
  }

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        notification: {
          channelId: 'price_alerts',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });
    console.log('[Notifications] Push notification sent successfully');
  } catch (error) {
    console.error('[Notifications] Failed to send push notification:', error);
  }
}
