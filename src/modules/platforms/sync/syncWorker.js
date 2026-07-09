import { Worker } from "bullmq";
import { redisClient } from "../../../config/redis.js";
import prisma from "../../../config/db.js";

// Fetchers
import { fetchProfile as fetchCodeforces } from "../fetchers/codeforces.fetcher.js";
import { fetchProfile as fetchLeetcode } from "../fetchers/leetcode.fetcher.js";
import { fetchProfile as fetchGFG } from "../fetchers/geeksforgeeks.fetcher.js";
import { fetchProfile as fetchCodechef } from "../fetchers/codechef.fetcher.js";

const fetchers = {
  CODEFORCES: fetchCodeforces,
  LEETCODE: fetchLeetcode,
  GEEKSFORGEEKS: fetchGFG,
  CODECHEF: fetchCodechef,
};

export const syncWorker = new Worker(
  "platform-sync",
  async (job) => {
    const { platformLinkId } = job.data;

    const link = await prisma.platformLink.findUnique({
      where: { id: platformLinkId },
    });

    if (!link) {
      console.warn(`PlatformLink ${platformLinkId} not found. Skipping.`);
      return;
    }

    if (!link.isValid) {
      console.warn(`PlatformLink ${platformLinkId} is marked invalid. Skipping.`);
      return;
    }

    const fetcher = fetchers[link.platform];
    if (!fetcher) {
      throw new Error(`No fetcher defined for platform: ${link.platform}`);
    }

    // Call the fetcher
    const result = await fetcher(link.externalUsername);

    if (result.success) {
      // Upsert stats
      await prisma.platformStats.create({
        data: {
          platformLinkId: link.id,
          problemsSolved: result.data.problemsSolved ?? null,
          rating: result.data.rating ?? null,
          maxRating: result.data.maxRating ?? null,
          rank: result.data.rank ?? null,
          easyCount: result.data.easyCount ?? null,
          mediumCount: result.data.mediumCount ?? null,
          hardCount: result.data.hardCount ?? null,
          heatmapData: result.data.heatmapData ?? null,
        },
      });

      // Update link status
      await prisma.platformLink.update({
        where: { id: link.id },
        data: {
          lastSyncedAt: new Date(),
          lastSyncStatus: "SUCCESS",
        },
      });
    } else {
      // Update link status to FAILED
      await prisma.platformLink.update({
        where: { id: link.id },
        data: {
          lastSyncedAt: new Date(),
          lastSyncStatus: "FAILED",
        },
      });
      throw new Error(`Fetcher failed for ${link.platform} (${link.externalUsername}): ${result.error}`);
    }
  },
  {
    connection: redisClient,
    concurrency: parseInt(process.env.SYNC_CONCURRENCY || "5", 10),
  }
);

syncWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed: ${err.message}`);
});

syncWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});
