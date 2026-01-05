import { redisClient } from "./client";
import { Alert, NewAlert } from "../types";

function getKey(stopId: string): string {
  return `alert:stopId:${stopId}`;
}

export async function getLastModifiedHeader(): Promise<string | null> {
  const result = await redisClient.get(`lmh:alerts`);
  return result;
}

export async function setLastModifiedHeader(header: string) {
  await redisClient.set(`lmh:alerts`, header);
}

export async function getAlerts(stopId: string): Promise<Alert[]> {
  const key = getKey(stopId);
  const results = await redisClient.lRange(key, 0, -1);
  const alerts: Alert[] = results.map((item) => JSON.parse(item));
  return alerts;
}

export async function setAlerts(alerts: NewAlert[]): Promise<void> {
  const pipeline = redisClient.multi();

  // Remove all keys
  const keys = await redisClient.keys("alert:*");
  if (keys.length > 0) {
    pipeline.del(keys);
  }

  // Set new alerts
  alerts.forEach((update) => {
    const key = getKey(update.stopId);
    pipeline.lPush(key, JSON.stringify(update.body));
  });

  await pipeline.exec();
}
