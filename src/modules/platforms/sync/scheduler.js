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
  // Determine frequency
  const isLight = platform === "CODEFORCES" || platform === "LEETCODE";
  const frequencyHours = isLight ? 4 : 12;

  // Stagger timing using a simple hash of the userId
  // to get a minute offset between 0 and 59
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash += userId.charCodeAt(i);
  }
  const minuteOffset = hash % 60;
  const cron = `${minuteOffset} */${frequencyHours} * * *`;

  await syncQueue.add(
    "sync-job",
    { platformLinkId },
    {
      repeat: { pattern: cron },
      jobId: `repeatable-${platformLinkId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    }
  );
}
