
/**
 * Syifamili Service Worker - Enhanced Background Delivery
 */

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  
  let data = {
    title: 'Syifamili',
    body: 'Ada pembaruan kesehatan untuk keluarga Anda.',
    url: '/'
  };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://lh3.googleusercontent.com/d/1DrGOVDFdXv24Ac2z2t49pZUH-evReTxV',
    badge: 'https://lh3.googleusercontent.com/d/1DrGOVDFdXv24Ac2z2t49pZUH-evReTxV',
    vibrate: [200, 100, 200],
    tag: 'syifamili-reminder', // Mencegah penumpukan notifikasi yang sama
    renotify: true,
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Buka Aplikasi' }
    ]
  };

  // event.waitUntil memastikan OS tidak mematikan worker sebelum notifikasi muncul
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  const notification = event.notification;
  const action = event.action;
  const urlToOpen = notification.data.url || '/';

  notification.close();

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Jika ada window terbuka, fokus ke sana
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Jika tidak ada, buka window baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Listener untuk pesan lokal (testing)
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('Syifamili Check ✅', {
      body: 'Koneksi notifikasi di perangkat ini aktif.',
      icon: 'https://lh3.googleusercontent.com/d/1DrGOVDFdXv24Ac2z2t49pZUH-evReTxV'
    });
  }
});
