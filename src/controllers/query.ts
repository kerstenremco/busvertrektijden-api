import { queryStops } from "../database/stops";
import { getCachedQuery, setCachedQuery } from "../redis/cache";
import { QueryResult } from "../types";

export async function query(query: string): Promise<QueryResult> {
  const cachedResult = await getCachedQuery(query);
  if (cachedResult) {
    cachedResult.cache = true;
    return cachedResult;
  }

  const stops = await queryStops(query);
  await setCachedQuery(query, stops);

  return stops;
}
