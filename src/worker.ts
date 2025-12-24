import dotenv from "dotenv";
dotenv.config();
import cron from "node-cron";
import * as tripUpdate from "./controllers/tripUpdate";
import { REDIS_SETTINGS } from "./settings";

async function main(args: string[]) {
  if (args.includes("tripupdate")) {
    await tripUpdate.sync();
    process.exit(0);
  } else {
    await tripUpdate.sync();
    const tripUpdateInterval = REDIS_SETTINGS.INTERVAL_TRIPUPDATE_SYNC_MINUTES;
    cron.schedule(`30 */${tripUpdateInterval} * * * *`, tripUpdate.sync);
  }
}

main(process.argv);
