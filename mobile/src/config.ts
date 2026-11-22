// Where the Aangan server is. Set EXPO_PUBLIC_API_URL in mobile/.env.local:
//   your laptop on the same Wi-Fi:  http://192.168.1.10:3001
//   the deployed site:              https://<your-app>.onrender.com
const raw = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const API_URL = raw.replace(/\/+$/, '');
