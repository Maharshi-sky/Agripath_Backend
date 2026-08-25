const apiCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour TTL

export function getCache(key) {
  const item = apiCache.get(key);
  if (item && (Date.now() - item.timestamp < CACHE_TTL_MS)) {
    return item.data;
  }
  return null;
}

export function setCache(key, data) {
  if (data) {
    apiCache.set(key, { data, timestamp: Date.now() });
  }
}