import promClient from "prom-client";

export const promRegister = new promClient.Registry();

export const apiCounter = new promClient.Counter({
  name: "api_counter",
  help: "API requests",
  labelNames: ["type"],
});
promRegister.registerMetric(apiCounter);

export const realTimeUpdateCounter = new promClient.Counter({
  name: "rt_updates",
  help: "Realtime updates counter",
  labelNames: ["type"],
});
promRegister.registerMetric(realTimeUpdateCounter);

export const clientsGauge = new promClient.Gauge({
  name: "active_clients_last_minute",
  help: "Number of active clients in the last minute",
});
promRegister.registerMetric(clientsGauge);
