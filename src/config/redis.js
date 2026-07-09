import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("REDIS_URL is not defined in the environment. BullMQ and caching will fail if they require a connection.");
}

// Create a single shared Redis instance for standard caching operations.
// BullMQ requires its own connection instance, so it can reuse this connection config.
export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisClient.on("error", (error) => {
  console.error("Redis Connection Error:", error);
});

redisClient.on("ready", () => {
  console.log("Redis Client Ready");
});
