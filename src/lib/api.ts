import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token') || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('api_key') : null;
  if (apiKey) config.headers['X-API-Key'] = apiKey;
  return config;
});

let isRefreshing = false;
let failedQueue: { resolve: (v: any) => void; reject: (e: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((e) => Promise.reject(e));
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
      if (!refreshToken) {
        isRefreshing = false;
        clearAuth();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        setAuth(data.accessToken, data.refreshToken);
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuth();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export function setAuth(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  Cookies.set('access_token', accessToken, { expires: 1 / 96 });
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  Cookies.remove('access_token');
  window.location.href = '/login';
}

export function formatBytes(bytes: number | bigint, decimals = 2): string {
  const b = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  if (b === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${parseFloat((b / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

