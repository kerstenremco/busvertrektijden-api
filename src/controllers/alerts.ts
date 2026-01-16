import { transit_realtime } from "gtfs-realtime-bindings";
import { NewAlert } from "../types";
import { getLastModifiedHeader, setAlerts, setLastModifiedHeader } from "../redis/alerts";
import { GTFS_SETTINGS } from "../settings";
import logger from "../helpers/logger";

// alert:stopId:xx - alert:routeId:xx - alert:tripId:xx
// from, to, header, description, effect, cause

async function fetchFeed(): Promise<transit_realtime.FeedMessage> {
  // Fetch feed
  const url = GTFS_SETTINGS.ALERTS_URL;
  const headers: Record<string, string> = {};
  headers["User-Agent"] = GTFS_SETTINGS.USER_AGENT;
  const lastModifiedHeader = await getLastModifiedHeader();
  if (lastModifiedHeader) {
    headers["If-Modified-Since"] = lastModifiedHeader;
  }
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const lastModified = response.headers.get("Last-Modified");
  if (!lastModified) {
    throw new Error("No Last-Modified header in response");
  }
  await setLastModifiedHeader(lastModified);

  // Decode feed
  const buffer = await response.arrayBuffer();
  const feed = transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
  return feed;
}

async function convertFeedToAlerts(feed: transit_realtime.FeedMessage): Promise<NewAlert[]> {
  const result: NewAlert[] = [];
  const alerts = feed.entity.map((x) => x.alert).filter((x) => x != undefined);

  alerts.forEach((alert) => {
    const from = alert.activePeriod?.at(0)?.start;
    const end = alert.activePeriod?.at(0)?.end;
    const header = alert.headerText?.translation?.at(0)?.text;
    const description = alert.descriptionText?.translation?.at(0)?.text;
    const informedEntity = alert.informedEntity;
    const effect = alert.effect || undefined;
    const cause = alert.cause || undefined;

    if (!from || !end || !header || !description || !informedEntity) {
      return logger.warn("[alerts-sync] Incomplete alert data, skipping alert");
    }

    informedEntity.forEach((entity) => {
      const stopId = entity.stopId;
      const routeId = entity.routeId || undefined;

      if (!stopId) {
        return logger.warn("[alerts-sync] Alert without stopId, skipping entity");
      }

      const newAlert: NewAlert = {
        stopId,
        body: {
          from: Number(from),
          end: Number(end),
          routeId,
          header,
          description,
          effect,
          cause,
        },
      };
      result.push(newAlert);
    });
  });
  return result;
}

export async function sync() {
  try {
    logger.info(`[alerts-sync] Started syncing alerts`);
    const feed = await fetchFeed();
    const alerts = await convertFeedToAlerts(feed);
    await setAlerts(alerts);
    logger.info(`[alerts-sync] Stored ${alerts.length} alerts in Redis`);
  } catch (error) {
    logger.error(error);
  }
}
