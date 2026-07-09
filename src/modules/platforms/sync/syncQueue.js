import { Queue } from "bullmq";
import { redisClient } from "../../../config/redis.js";

// Ensure we are connected to the same Redis for BullMQ Queue
export const syncQueue = new Queue("platform-sync", {
  connection: redisClient,
});
