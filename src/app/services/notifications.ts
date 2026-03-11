import type { Alert } from '../store/productStore';

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported' as const;
  }

  if (Notification.permission === 'granted') {
    return 'granted' as const;
  }

  return Notification.requestPermission();
}

export function sendPriceDropNotification(alert: Alert) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const amount = Math.max(0, alert.oldPrice - alert.newPrice).toLocaleString();

  new Notification('LowestAlert', {
    body: `${alert.productName} 가격이 ${amount}원 내려갔습니다.`,
    icon: alert.image || undefined,
    tag: alert.id,
  });
}

export function getNotificationPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported' as const;
  }

  return Notification.permission;
}
