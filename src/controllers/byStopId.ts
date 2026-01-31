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

export async function getStopTimesAtStop(
  ids: string[],
  date: string | undefined,
  shortNameFilter: string[],
  tripHeadSignFilter: string[],
): Promise<StopTimesResult> {
  const result: StopTimesResult = { results: [] };
  const allIds = await getUniqueStopIds(ids);

  // Get valid serviceIds for today
  const dateString = date || todayYyyymmdd();
  const serviceIds = await getServicesByDate(dateString);

  // Get stops
  const stopResults = await Promise.all(
    allIds.map(async (stopId) => {
      const cached = await getCachedStopTimesByStop(dateString, stopId);
      if (cached) {
        return cached.map((s) => ({ stopTimeCached: true, stopTime: s }));
      }

      const stops = await getStopTimes(stopId, serviceIds);
      await setCachedStopTimesByStop(dateString, stopId, stops);

      return stops.map((s) => ({ stopTimeCached: false, stopTime: s }));
    }),
  );

  result.results = stopResults.flat();

  // Apply filters
  const shortNameFilterLower = shortNameFilter.map((f) => f.toLowerCase());
  const tripHeadSignFilterLower = tripHeadSignFilter.map((f) => f.toLowerCase());

  result.results = result.results.filter((item) => {
    const itemShortName = item.stopTime.routeShortName.toLowerCase();
    const itemTripHeadSign = item.stopTime.tripHeadSign.toLowerCase();

    const passShortName = shortNameFilter.length == 0 || shortNameFilterLower.includes(itemShortName);
    const passTripHeadSign = tripHeadSignFilter.length == 0 || tripHeadSignFilterLower.includes(itemTripHeadSign);

    return passShortName && passTripHeadSign;
  });

  // TODO: Add real time info and alert, cache
  await Promise.all(
    result.results.map(async (stop) => {
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
    }),
  );

  // Get alerts
  await Promise.all(
    result.results.map(async (stop) => {
      const stopAlerts = await getAlerts(stop.stopTime.stopId);

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
    }),
  );

  // TODO: Filter, sort and return
  result.results.sort((a, b) => (a.tripUpdate?.minutesUntill || 1) - (b.tripUpdate?.minutesUntill || 1));
  if (date === undefined) {
    result.results = result.results.filter((x) => (x.tripUpdate?.minutesUntill || 1) >= 0);
  }
  return result;
}
