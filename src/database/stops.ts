import { formatHmstoHm } from "../helpers/time";
import { dbClient } from "./client";
import { QueryResult, StopTime, StopTimesResult } from "../types";

export async function queryStops(query: string): Promise<QueryResult> {
  const words = query.split(" ").filter((w) => w.length > 0);
  if (words.length === 0) {
    words.push("");
  }

  // Find stops without parentstation
  const sqlResult = await dbClient.stop.findMany({
    where: {
      AND: [{ parent_station: { equals: null } }, { stop_name: { equals: `%${words.join("%")}%`, mode: "insensitive" } }],
    },
    select: { stop_id: true, stop_name: true },
  });

  // Merge stops
  const merged: { [key: string]: string[] } = {};

  sqlResult.forEach((stop) => {
    const name = stop.stop_name;
    if (name == undefined) return; // Skip invalid stops

    // If object not exist, create
    const keyExist = Object.keys(merged).includes(name);
    if (!keyExist) {
      merged[name] = [];
    }

    // Add stop ID
    merged[name].push(stop.stop_id);
  });

  // Create result
  const result: QueryResult = { results: [] };
  for (const [key, value] of Object.entries(merged)) {
    const name = key;
    const ids = value;
    const url = `/stops/${ids.join(",")}`;
    result.results.push({ name, ids, url });
  }

  // Return
  return result;
}

export async function getStopIdsInArea(areaId: string): Promise<string[]> {
  const stops = await dbClient.stop.findMany({
    where: {
      parent_station: { equals: areaId },
    },
    select: { stop_id: true },
  });
  return stops.map((s) => s.stop_id);
}

export async function getStopTimes(stopId: string, svcIds: number[]): Promise<StopTime[]> {
  const queryResult = await dbClient.stopTime.findMany({
    where: {
      stop_id: stopId,
      trip: { route: { route_type: 3 }, service_id: { in: svcIds } },
    },
    select: {
      stop_id: true,
      arrival_time: true,
      departure_time: true,
      stop_headsign: true,
      trip: {
        select: {
          trip_id: true,
          trip_headsign: true,
          route: {
            select: { route_short_name: true, route_long_name: true, route_id: true },
          },
        },
      },
      stop: { select: { stop_name: true } },
    },
  });

  return queryResult.map((x) => ({
    arrivalTime: formatHmstoHm(x.arrival_time),
    departureTime: formatHmstoHm(x.departure_time),
    stopId: x.stop_id,
    routeId: x.trip.route.route_id,
    routeShortName: x.trip.route.route_short_name || "",
    routeLongName: x.trip.route.route_long_name || "",
    stopHeadsign: x.stop_headsign || "",
    tripId: x.trip.trip_id.toString(),
    tripHeadSign: x.trip.trip_headsign || "",
  }));
}
