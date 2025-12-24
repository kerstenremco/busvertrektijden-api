import { createClient } from "redis";
import { REDIS_SETTINGS } from "../settings";

const redisClient = createClient({ url: REDIS_SETTINGS.URL });
redisClient.connect();

export { redisClient };
