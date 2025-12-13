/* Firebase Cloud Messaging Service Worker */
/* This file must be in the root of the public folder */

self.addEventListener('install', () => {
  // Skip waiting so updates take effect immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Show notifications when messages arrive in the background
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push event received:', event);
  if (!event.data) {
    console.log('[Service Worker] No data in push event');
    return;
  }
  const payload = event.data.json ? event.data.json() : {};
  console.log('[Service Worker] Full payload:', JSON.stringify(payload, null, 2));
  
  // FCM sends notification and data separately
  let { title = 'Shift Reminder', body = '', icon = '/icons/icon-192.png', tag = 'shift-reminder' } = payload.notification || payload;
  
  // Check both payload.data and payload.fcmMessageId locations for custom data
  const customData = payload.data || {};
  console.log('[Service Worker] Custom data:', customData);
  
  // If data payload contains shift info, format the time in local timezone
  if (customData.scheduledStartTime) {
    const shiftTime = new Date(customData.scheduledStartTime);
    const formattedTime = shiftTime.toLocaleString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
    const shiftName = customData.shiftName || 'Scheduled Shift';
    body = `Your shift "${shiftName}" starts at ${formattedTime}.`;
    console.log('[Service Worker] Formatted notification body:', body);
  }
  
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      tag,
      data: customData,
      requireInteraction: true,
    }).then(() => {
      console.log('[Service Worker] Notification shown:', title, body);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/caregiver';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
