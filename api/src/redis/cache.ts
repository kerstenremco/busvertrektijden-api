import { redisClient } from "./client";
import { REDIS_SETTINGS } from "../settings";
import { QueryResult, QueryResultSchema, StopTime, StopTimeSchema } from "../types";

function getQueryKey(query: string): string {
  return `cache:q:${query}`;
}

function getByStopKey(date: string, stopId: string): string {
  return `cache:date:${date}:stop:${stopId}`;
}

export async function getCachedQuery(query: string): Promise<QueryResult | null> {
  const key = getQueryKey(query);
  const result = await redisClient.get(key);
  if (!result) return null;

  try {
    const parsed = JSON.parse(result);
    return QueryResultSchema.parse(parsed);
  } catch (_e) {
    return null;
  }
}

export async function setCachedQuery(query: string, data: QueryResult): Promise<void> {
  const ttl = REDIS_SETTINGS.CACHE_TTL_SECONDS;
  const key = getQueryKey(query);
  await redisClient.setEx(key, ttl, JSON.stringify(data));
}

export async function getCachedStopTimesByStop(date: string, stopId: string): Promise<StopTime[] | null> {
  const key = getByStopKey(date, stopId);
  const result = await redisClient.get(key);
  if (!result) return null;

  try {
    const parsed = JSON.parse(result);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => StopTimeSchema.parse(item));
    } else {
      return null;
    }
  } catch (_e) {
    return null;
  }
}
export async function setCachedStopTimesByStop(date: string, stopId: string, data: StopTime[]): Promise<void> {
  const ttl = REDIS_SETTINGS.CACHE_TTL_SECONDS;
  const key = getByStopKey(date, stopId);
  await redisClient.setEx(key, ttl, JSON.stringify(data));
}
