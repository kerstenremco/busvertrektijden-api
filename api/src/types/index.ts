import * as z from "zod";

// TripUpdate types and schema

export const TripUpdateSchema = z.object({
  delay: z.number().min(0),
  cancelled: z.boolean(),
});

export type TripUpdate = z.infer<typeof TripUpdateSchema>;

export const TripUpdateComputedSchema = z.object({
  delay: z.number().min(0),
  cancelled: z.boolean(),
  calculatedArrivalTime: z.string(),
  minutesUntill: z.number().min(0),
});

export type TripUpdateComputed = z.infer<typeof TripUpdateComputedSchema>;

export const NewTripUpdateSchema = z.object({
  date: z.string(),
  stopId: z.string(),
  tripId: z.string(),
  body: TripUpdateSchema,
});

export type NewTripUpdate = z.infer<typeof NewTripUpdateSchema>;

// Stop types and schema
export const StopTimeSchema = z.object({
  arrivalTime: z.string(),
  departureTime: z.string(),
  stopId: z.string(),
  stopHeadsign: z.string(),
  routeId: z.string(),
  routeShortName: z.string(),
  routeLongName: z.string(),
  tripId: z.string(),
  tripHeadSign: z.string(),
});

export type StopTime = z.infer<typeof StopTimeSchema>;

// Query API
export const QuerySchema = z.object({
  name: z.string(),
  ids: z.array(z.string()),
  url: z.string(),
});

export const QueryResultSchema = z.object({
  cache: z.boolean().optional(),
  results: z.array(QuerySchema),
});

export type QueryResult = z.infer<typeof QueryResultSchema>;

// Stop API
export const StopTimesResultSchema = z.object({
  results: z.array(
    z.object({
      stopTimeCached: z.boolean(),
      stopTime: StopTimeSchema,
      tripUpdate: TripUpdateComputedSchema.optional(),
    })
  ),
});

export type StopTimesResult = z.infer<typeof StopTimesResultSchema>;
