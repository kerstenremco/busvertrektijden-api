import { dbClient } from "./client";

export async function getServicesByDate(date: string): Promise<number[]> {
  const sqlResult = await dbClient.service.findMany({
    where: {
      date,
      exception_type: 1,
    },
    select: { service_id: true },
  });
  const serviceIds = sqlResult.map((s) => s.service_id);
  return serviceIds;
}
