import { getStopIdsInArea, getStopTimes } from "../database/stops";
import { todayYyyymmdd, yyyymmddToDayjs } from "../helpers/time";
import { getServicesByDate } from "../database/service";
import { Alert, StopTimesResult } from "../types";
import { getTripUpdate } from "../redis/tripUpdate";
import { getCachedStopTimesByStop, setCachedStopTimesByStop } from "../redis/cache";
import dayjs from "dayjs";
import { getAlerts } from "../redis/alerts";

async function getUniqueStopIds(ids: string[]): Promise<string[]> {
  // For each area, get stopIds
  const stopIds = ids.filter((i) => i.startsWith("stoparea") == false);
  const areas = ids.filter((i) => i.startsWith("stoparea"));

  for await (const area of areas) {
    const result = await getStopIdsInArea(area);
    stopIds.push(...result);
  }

  // Unique
  const unique = [...new Set(stopIds)];

  // Return
  return unique;
}

export async function getStopTimesAtStop(ids: string[], date: string | undefined): Promise<StopTimesResult> {
  const result: StopTimesResult = { results: [] };
  const allIds = await getUniqueStopIds(ids);

  // Get valid serviceIds for today
  const dateString = date || todayYyyymmdd();
  const svcIds = await getServicesByDate(dateString);

  // Get stops
  for await (const stopId of allIds) {
    const cached = await getCachedStopTimesByStop(dateString, stopId);
    if (cached) {
      cached.forEach((s) => result.results.push({ stopTimeCached: true, stopTime: s }));
      continue;
    } else {
      const stops = await getStopTimes(stopId, svcIds);
      stops.forEach((s) => result.results.push({ stopTimeCached: false, stopTime: s }));
      await setCachedStopTimesByStop(dateString, stopId, stops);
    }
  }

  // TODO: Add real time info and alert, cache
  for (const stop of result.results) {
    const tripUpdate = await getTripUpdate(dateString, stop.stopTime.stopId, stop.stopTime.tripId);
    const delay = tripUpdate?.delay || 0;
    const cancelled = tripUpdate?.cancelled || false;
    // Calculate actual arrival time
    let [h, min] = stop.stopTime.arrivalTime.split(":").map((x) => parseInt(x));

    let calculatedArrivalTime = yyyymmddToDayjs(dateString)!.set("hour", h).set("minute", min).set("second", 0).add(delay, "second");

    // Round
    if (calculatedArrivalTime.second() > 0) {
      calculatedArrivalTime = calculatedArrivalTime.add(1, "minute").set("second", 0);
    }

    // Calculate minutes until
    const minutesUntill = calculatedArrivalTime.diff(dayjs(), "minute");
    const computedTripUpdate = {
      delay,
      cancelled,
      calculatedArrivalTime: calculatedArrivalTime.format("HH:mm"),
      minutesUntill,
    };
    stop.tripUpdate = computedTripUpdate;
  }

  // Get alerts
  for await (const stopId of allIds) {
    const stopAlerts = await getAlerts(stopId);

    result.results.forEach((item) => {
      item.alerts = stopAlerts.filter((alert) => {
        const sameRoute = alert.routeId == undefined || alert.routeId == item.stopTime.routeId;
        if (!sameRoute) return false;

        // Time
        let [h, min] = item.stopTime.arrivalTime.split(":").map((x) => parseInt(x));
        let time = yyyymmddToDayjs(dateString)!.set("hour", h).set("minute", min).set("second", 0);
        const activeNow = alert.from <= time.unix() && alert.end >= time.unix();
        return activeNow;
      });
    });
  }

  // TODO: Filter, sort and return
  result.results.sort((a, b) => (a.tripUpdate?.minutesUntill || 1) - (b.tripUpdate?.minutesUntill || 1));
  if (date === undefined) {
    result.results = result.results.filter((x) => (x.tripUpdate?.minutesUntill || 1) >= 0);
  }
  return result;
}
