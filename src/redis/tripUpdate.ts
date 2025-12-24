import { redisClient } from "./client";
import { REDIS_SETTINGS } from "../settings";
import { TripUpdate, NewTripUpdate, TripUpdateSchema } from "../types";

function getKey(date: string, stopId: string, tripId: string): string {
  return `tu:date:${date}:stop:${stopId}:trip:${tripId}`;
}

export async function getLastModifiedHeader(): Promise<string | null> {
  const result = await redisClient.get(`lmh:tu`);
  return result;
}

export async function setLastModifiedHeader(header: string) {
  await redisClient.set(`lmh:tu`, header);
}

export async function getTripUpdate(date: string, stopId: string, tripId: string): Promise<TripUpdate | null> {
  const key = getKey(date, stopId, tripId);
  const result = await redisClient.get(key);
  if (!result) return null;

  try {
    const parsed = JSON.parse(result);
    return TripUpdateSchema.parse(parsed);
  } catch (_e) {
    return null;
  }
}

export async function setTripUpdates(updates: NewTripUpdate[]): Promise<void> {
  const ttl = REDIS_SETTINGS.INTERVAL_TRIPUPDATE_SYNC_SECONDS * 2.5;
  const pipeline = redisClient.multi();
  updates.forEach((item) => {
    const key = getKey(item.date, item.stopId, item.tripId);
    const body = {
      delay: item.body.delay,
      cancelled: item.body.cancelled,
    };
    pipeline.set(key, JSON.stringify(body));
    pipeline.expire(key, ttl);
  });
  await pipeline.exec();
}
