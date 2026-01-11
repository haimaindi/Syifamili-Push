
import webpush from 'web-push';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscription, payload } = req.body;

  if (!subscription || !payload) {
    return res.status(400).json({ error: 'Missing subscription or payload' });
  }

  const publicVapidKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
  const contactEmail = process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@example.com';

  if (!publicVapidKey || !privateVapidKey) {
    console.error("VAPID Keys not configured in Vercel Environment Variables");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  webpush.setVapidDetails(
    contactEmail,
    publicVapidKey,
    privateVapidKey
  );

  try {
    // KONFIGURASI KRUSIAL UNTUK IOS & BACKGROUND
    const options = {
      headers: {
        'Urgency': 'high', // Wajib untuk iOS agar notifikasi segera dikirim meski HP standby
        'Topic': 'syifamili-alerts' // Membantu iOS mengelompokkan pesan
      },
      TTL: 86400 // 24 jam dalam detik
    };

    // Pastikan payload di-stringified dengan benar
    const pushPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);

    await webpush.sendNotification(subscription, pushPayload, options);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending push:', error);
    if (error.statusCode === 410 || error.statusCode === 404) {
        res.status(410).json({ error: 'Subscription expired or invalid' });
    } else {
        res.status(500).json({ error: 'Failed to send notification: ' + error.message });
    }
  }
}
