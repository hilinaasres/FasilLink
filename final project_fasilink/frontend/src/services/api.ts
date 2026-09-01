import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const CACHE_TTL_MS = 30_000;
const responseCache = new Map<string, { data: any; timestamp: number }>();

const normalizeCacheKey = (url: string) => url.replace(/^\/+/, '');

export const clearCache = (url: string) => {
  responseCache.delete(normalizeCacheKey(url));
};

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to add auth token and log request target in development
api.interceptors.request.use((config) => {
  if (typeof config.url === 'string' && config.url.startsWith('/api/')) {
    config.url = config.url.replace(/^\/api/, '');
  }

  if (config.method?.toLowerCase() === 'get') {
    const cacheKey = normalizeCacheKey(String(config.url || ''));
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return Promise.reject({
        cached: true,
        data: cached.data,
        config,
      });
    }
  }

  // NOTE: token must be set via `setAuthToken(token)` from AuthProvider or login/logout flows.

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[API] Request:', config.method?.toUpperCase(), `${config.baseURL}${config.url}`);
  }

  return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => {
  if (response.config.method?.toLowerCase() === 'get') {
    const cacheKey = normalizeCacheKey(String(response.config.url || ''));
    responseCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now(),
    });
  }

  return response;
}, (error) => {
  if (error?.cached) {
    return Promise.resolve({
      data: error.data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: error.config,
      request: {},
    });
  }

  return Promise.reject(error);
});

const originalGet = api.get.bind(api);
api.get = ((url: string, config?: any) => {
  const cacheKey = normalizeCacheKey(url);
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve({
      data: cached.data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { url, method: 'get' },
      request: {},
    });
  }

  return originalGet(url, config).then((response) => {
    responseCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now(),
    });
    return response;
  });
}) as typeof api.get;

const originalPost = api.post.bind(api);
api.post = ((url: string, data?: any, config?: any) => originalPost(url, data, config).then((response) => {
  clearCache(url);
  return response;
})) as typeof api.post;

const originalDelete = api.delete.bind(api);
api.delete = ((url: string, config?: any) => originalDelete(url, config).then((response) => {
  clearCache(url);
  return response;
})) as typeof api.delete;

export default api;

// Helper to set auth token programmatically (used by AuthContext)
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try { localStorage.setItem('token', token); } catch {}
  } else {
    delete api.defaults.headers.common['Authorization'];
    try { localStorage.removeItem('token'); } catch {}
  }
};
