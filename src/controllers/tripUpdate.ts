import { transit_realtime } from "gtfs-realtime-bindings";
import { realTimeUpdateCounter } from "../helpers/prometheus";
import { getLastModifiedHeader, setLastModifiedHeader, setTripUpdates } from "../redis/tripUpdate";
import { GTFS_SETTINGS } from "../settings";
import { NewTripUpdate } from "../types";
import logger from "../helpers/logger";

export async function sync() {
  try {
    logger.info(`[tripupdates-sync] Started syncing trip updates`);

    // Fetch feed
    const url = GTFS_SETTINGS.TRIP_UPDATES_URL;
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

    // Filter tripUpdates
    const result: NewTripUpdate[] = [];
    const tripUpdates = feed.entity.map((x) => x.tripUpdate).filter((x) => x != undefined);

    // Loop over tripUpdates
    tripUpdates.forEach((update) => {
      const date = update.trip.startDate;
      const tripId = update.trip.tripId;

      if (!date || !tripId) {
        realTimeUpdateCounter.inc({ type: "error_no_date_or_trip_id" });
        return;
      }

      update.stopTimeUpdate?.forEach((stopTimeUpdate) => {
        const stopId = stopTimeUpdate.stopId;
        if (!stopId) {
          realTimeUpdateCounter.inc({ type: "error_no_stop_id" });
          return;
        }

        const cancelled = stopTimeUpdate.scheduleRelationship === 1;
        const scheduled = stopTimeUpdate.scheduleRelationship === 0 || stopTimeUpdate.scheduleRelationship === 2;
        const delayArrival = stopTimeUpdate.arrival?.delay ?? 0;
        const delayDeparture = stopTimeUpdate.arrival?.delay ?? 0;
        const delay = Math.max(delayArrival, delayDeparture);

        if (!cancelled && !scheduled) {
          realTimeUpdateCounter.inc({ type: "error_not_cancelled_not_scheduled" });
          return;
        }
        if (scheduled && !delay) {
          realTimeUpdateCounter.inc({ type: "skipped_because_0_delay" });
          return;
        }
        if (cancelled) {
          realTimeUpdateCounter.inc({ type: "cancelled" });
        } else {
          realTimeUpdateCounter.inc({ type: "delayed" });
        }
        result.push({
          date,
          stopId,
          tripId,
          body: { cancelled, delay },
        });
      });
    });

    // Store tripUpdates in Redis
    await setTripUpdates(result);

    logger.info(`[tripupdates-sync] Stored ${result.length} trip updates in Redis`);
  } catch (error) {
    logger.error(error);
  }
}
