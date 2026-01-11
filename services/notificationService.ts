
// Mengambil Public Key dari Environment Variable (Vercel / .env)
// Menggunakan optional chaining (?.) dan fallback object untuk mencegah crash jika env belum siap
const VAPID_PUBLIC_KEY = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || ''; 

// URL Web App GAS Anda
const SPREADSHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwIk5aeQ2yBHRfS8iwaJySiyUXyiZ-_NszDyRRfBgrU2mq_7FFhyyF5l0HSJWPMqL9j/exec';

function urlBase64ToUint8Array(base64String: string) {
  if (!base64String) {
    console.warn('VAPID_PUBLIC_KEY is missing or empty. Push notifications will not work.');
    return new Uint8Array(0);
  }
  
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const notificationService = {
  async registerServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        // console.log('Service Worker registered:', registration);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  },

  async subscribeUser() {
    if (!('serviceWorker' in navigator)) return { success: false, message: 'Browser tidak mendukung SW' };
    
    // Cek key sebelum lanjut
    if (!VAPID_PUBLIC_KEY) {
        console.error("VAPID Key not found in environment variables.");
        return { success: false, message: 'Konfigurasi Server belum lengkap (VAPID Key Missing)' };
    }

    const registration = await navigator.serviceWorker.ready;

    try {
      // Cek apakah sudah subscribe
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        // Optional: Update subscription di server jika perlu
        await this.sendSubscriptionToBackend(existingSubscription);
        return { success: true, message: 'Sudah berlangganan' };
      }

      // Jika belum, subscribe baru
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      
      // Double check hasil konversi
      if (convertedVapidKey.length === 0) {
          return { success: false, message: 'Gagal memproses VAPID Key' };
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      const saved = await this.sendSubscriptionToBackend(subscription);
      return { success: saved, message: saved ? 'Berhasil mengaktifkan notifikasi' : 'Gagal menyimpan ke server' };

    } catch (error) {
      console.error('Failed to subscribe:', error);
      return { success: false, message: 'Gagal melakukan subscribe push' };
    }
  },

  async sendSubscriptionToBackend(subscription: PushSubscription) {
    try {
      // Simpan ke Google Sheets via Apps Script
      const response = await fetch(SPREADSHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveSubscription',
          subscription: subscription,
          userAgent: navigator.userAgent
        }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (error) {
      console.error('Error saving subscription to backend:', error);
      return false;
    }
  }
};
