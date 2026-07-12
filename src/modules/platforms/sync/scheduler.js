import { syncQueue } from "./syncQueue.js";
import prisma from "../../../config/db.js";

/**
 * Enqueue a single immediate sync job.
 * @param {string} platformLinkId 
 */
export async function enqueueImmediateSync(platformLinkId) {
  await syncQueue.add(
    "sync-job",
    { platformLinkId },
    {
      jobId: `immediate-${platformLinkId}-${Date.now()}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    }
  );
}

/**
 * Set up repeatable jobs for all active platform links.
 * Called at server startup.
 */
export async function setupRepeatableJobs() {
  // Clear any existing repeatable jobs to avoid duplicates on restart
  const repeatableJobs = await syncQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await syncQueue.removeRepeatableByKey(job.key);
  }

  const links = await prisma.platformLink.findMany({
    where: { isValid: true },
  });

  for (const link of links) {
    await scheduleRepeatableSync(link.id, link.platform, link.userId);
  }
}

/**
 * Schedule a repeatable job for a specific link.
 * @param {string} platformLinkId 
 * @param {string} platform 
 * @param {string} userId 
 */
export async function scheduleRepeatableSync(platformLinkId, platform, userId) {
  // Schedule for 5:30 AM IST
  await syncQueue.add(
    "sync-job",
    { platformLinkId },
    {
      repeat: { pattern: "30 5 * * *", tz: "Asia/Kolkata" },
      jobId: `repeatable-morning-${platformLinkId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    }
  );

  // Schedule for 10:30 PM IST
  await syncQueue.add(
    "sync-job",
    { platformLinkId },
    {
      repeat: { pattern: "30 22 * * *", tz: "Asia/Kolkata" },
      jobId: `repeatable-night-${platformLinkId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    }
  );
}
