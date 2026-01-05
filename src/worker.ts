import dotenv from "dotenv";
dotenv.config();
import cron from "node-cron";
import * as tripUpdate from "./controllers/tripUpdate";
import * as alerts from "./controllers/alerts";
import { REDIS_SETTINGS } from "./settings";

async function main(args: string[]) {
  if (args.includes("tripupdate")) {
    await tripUpdate.sync();
    process.exit(0);
  } else if (args.includes("alerts")) {
    await alerts.sync();
    process.exit(0);
  } else {
    // Tripupdate
    await tripUpdate.sync();
    const tripUpdateInterval = REDIS_SETTINGS.INTERVAL_TRIPUPDATE_SYNC_MINUTES;
    cron.schedule(`30 */${tripUpdateInterval} * * * *`, tripUpdate.sync);

    // Alerts
    await alerts.sync();
    const alertsInterval = REDIS_SETTINGS.INTERVAL_ALERTS_SYNC_MINUTES;
    cron.schedule(`0 */${alertsInterval} * * * *`, alerts.sync);
  }
}

main(process.argv);
