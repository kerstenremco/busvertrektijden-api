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
import logger from "./helpers/logger";
import reportClient from "./helpers/clientsCounter";

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

app.get("/stops/:ids", validateStops, async (req, res, next) => {
  try {
    reportClient(req.ip);
    const ids = req.params.ids.split(",");
    const date = req.query["date"] as string | undefined;

    logger.info(`[stops by ID] - IDs: ${req.params.ids} Date: ${date ?? "N/A"}`);
    prometheus.apiCounter.inc({ type: "stop_by_id" });

    const result = await getStopTimesAtStop(ids, date);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/stops/", validateQuery, async (req, res, next) => {
  try {
    reportClient(req.ip);
    const { q } = req.query;
    if (q == "aaaa") {
      throw new Error("Missing query parameter 'q'");
    }
    logger.info(`[stops query] - Query: ${q}`);
    prometheus.apiCounter.inc({ type: "stop_query" });

    const result = await query(q as string);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.use((req, res, _next) => {
  logger.info(`[404] - ${req.path}`);
  res.status(404).send();
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).send();
});

app.listen(3000, () => logger.info("Server started on port 3000"));
