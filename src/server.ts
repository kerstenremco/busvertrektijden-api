import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import * as prometheus from "./helpers/prometheus";
import { query } from "./controllers/query";
import { getStopTimesAtStop } from "./controllers/byStopId";
import { validateQuery, validateStops } from "./helpers/validator";
import { rateLimit } from "express-rate-limit";
import { SERVER_SETTINGS } from "./settings";

const app = express();
app.set("trust proxy", SERVER_SETTINGS.PROXIES);

// Rate Limiter
const limitSettings = {
  windowMs: 10 * 60 * 1000,
  max: SERVER_SETTINGS.RATE_LIMIT_PER_10_MINUTES,
  standardHeaders: false,
  legacyHeaders: false,
  message: "Too many requests, try again later.",
};
app.use(rateLimit(limitSettings));

// Prometheus
app.get("/metrics", async (req, res) => {
  res.set("Content-Type", prometheus.promRegister.contentType);
  res.end(await prometheus.promRegister.metrics());
});

// Cors
app.use(cors());

app.get("/stops/:ids", validateStops, async (req, res) => {
  const ids = req.params.ids.split(",");
  const date = req.query["date"] as string | undefined;

  console.log(`[stops by ID] - IDs: ${req.params.ids} Date: ${date ?? "N/A"}`);
  prometheus.apiCounter.inc({ type: "stop_by_id" });

  const result = await getStopTimesAtStop(ids, date);
  return res.json(result);
});

app.get("/stops/", validateQuery, async (req, res) => {
  const { q } = req.query;

  console.log(`[stops query] - Query: ${q}`);
  prometheus.apiCounter.inc({ type: "stop_query" });

  const result = await query(q as string);
  return res.json(result);
});

app.use((req, res, _next) => {
  console.log(`[404] - ${req.path}`);
  res.status(404).send();
});

app.listen(3000, () => console.log("Server running on port 3000"));
