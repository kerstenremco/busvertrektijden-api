export const REDIS_SETTINGS = {
  URL: process.env.REDIS_URL || "redis://localhost:6379",
  CACHE_TTL_SECONDS: Number(process.env.REDIS_CACHE_TTL_SECONDS) || 300,
  INTERVAL_TRIPUPDATE_SYNC_MINUTES: Number(process.env.SYNC_TRIPUPDATE_INTERVAL_MIN) || 2,
  INTERVAL_TRIPUPDATE_SYNC_SECONDS: Number(process.env.SYNC_TRIPUPDATE_INTERVAL_MIN) * 60 || 120,
  INTERVAL_ALERTS_SYNC_MINUTES: Number(process.env.SYNC_ALERTS_INTERVAL_MIN) || 10,
};

export const GTFS_SETTINGS = {
  USER_AGENT: process.env.USER_AGENT || "APP/DEVELOPMENT",
  TRIP_UPDATES_URL: "https://gtfs.ovapi.nl/nl/tripUpdates.pb",
  ALERTS_URL: "https://gtfs.ovapi.nl/nl/alerts.pb",
};

export const SERVER_SETTINGS = {
  RATE_LIMIT_PER_10_MINUTES: Number(process.env.RATE_LIMIT_PER_10_MINUTES) || 100,
  PROXIES: Number(process.env.SERVER_PROXIES) || 1,
};
