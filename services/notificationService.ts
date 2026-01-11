
// Mengambil Public Key dari Environment Variable (Vercel / .env)
const VAPID_PUBLIC_KEY = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || ''; 

// URL Web App GAS Anda
const SPREADSHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwIk5aeQ2yBHRfS8iwaJySiyUXyiZ-_NszDyRRfBgrU2mq_7FFhyyF5l0HSJWPMqL9j/exec';

function urlBase64ToUint8Array(base64String: string) {
  if (!base64String) return new Uint8Array(0);
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
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
        // Menggunakan path relatif 'sw.js' bukan '/sw.js' untuk menghindari masalah origin pada preview
        return await navigator.serviceWorker.register('sw.js');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  },

  async checkSubscription() {
    if (!('serviceWorker' in navigator)) return null;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return null;
      return await registration.pushManager.getSubscription();
    } catch (e) {
      return null;
    }
  },

  async subscribeUser() {
    if (!('serviceWorker' in navigator)) return { success: false, message: 'Browser tidak mendukung' };
    if (!VAPID_PUBLIC_KEY) return { success: false, message: 'VAPID Key Missing' };

    const registration = await navigator.serviceWorker.ready;

    try {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      const saved = await this.sendSubscriptionToBackend(subscription, 'saveSubscription');
      return { success: saved, message: saved ? 'Notifikasi diaktifkan' : 'Gagal simpan ke server' };
    } catch (error) {
      console.error('Failed to subscribe:', error);
      return { success: false, message: 'Gagal subscribe' };
    }
  },

  async unsubscribeUser() {
    try {
      const subscription = await this.checkSubscription();
      if (subscription) {
        await this.sendSubscriptionToBackend(subscription, 'deleteSubscription');
        await subscription.unsubscribe();
        return { success: true, message: 'Notifikasi dinonaktifkan' };
      }
      return { success: true, message: 'Sudah tidak aktif' };
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return { success: false, message: 'Gagal menonaktifkan' };
    }
  },

  async sendSubscriptionToBackend(subscription: PushSubscription, action: string) {
    try {
      const response = await fetch(SPREADSHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: action,
          subscription: subscription,
          userAgent: navigator.userAgent
        }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (error) {
      console.error('Error syncing subscription:', error);
      return false;
    }
  }
};
