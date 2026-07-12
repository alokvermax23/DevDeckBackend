import prisma from "../../config/db.js";
import { enqueueImmediateSync } from "./sync/scheduler.js";

// Fetchers
import { fetchProfile as fetchCodeforces } from "./fetchers/codeforces.fetcher.js";
import { fetchProfile as fetchLeetcode } from "./fetchers/leetcode.fetcher.js";
import { fetchProfile as fetchGFG } from "./fetchers/geeksforgeeks.fetcher.js";
import { fetchProfile as fetchCodechef } from "./fetchers/codechef.fetcher.js";
import { fetchProfile as fetchGithub } from "./fetchers/github.fetcher.js";

const fetchers = {
  CODEFORCES: fetchCodeforces,
  LEETCODE: fetchLeetcode,
  GEEKSFORGEEKS: fetchGFG,
  CODECHEF: fetchCodechef,
  GITHUB: fetchGithub,
};

export const linkPlatform = async (req, res) => {
  const { platform, username } = req.body;
  const userId = req.user.id;

  if (!platform || !username) {
    return res.status(400).json({ error: "Platform and username are required" });
  }

  if (!fetchers[platform]) {
    return res.status(400).json({ error: "Unsupported platform" });
  }

  try {
    // Check if link already exists
    const existing = await prisma.platformLink.findUnique({
      where: {
        userId_platform: {
          userId,
          platform,
        },
      },
    });

    if (existing) {
      return res.status(409).json({ error: "Platform already linked" });
    }

    // Validate externally and fetch stats
    const fetcher = fetchers[platform];
    const result = await fetcher(username);

    if (!result.success) {
      return res.status(400).json({ error: `Validation failed: ${result.error}` });
    }

    // Create link
    const newLink = await prisma.platformLink.create({
      data: {
        userId,
        platform,
        externalUsername: username,
        lastSyncedAt: new Date(),
        lastSyncStatus: "SUCCESS",
      },
    });

    // Save stats immediately
    await prisma.platformStats.create({
      data: {
        platformLinkId: newLink.id,
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

    res.json({
      message: "Platform successfully linked",
      platformLink: newLink,
    });
  } catch (error) {
    console.error("Error linking platform:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const unlinkPlatform = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const link = await prisma.platformLink.findUnique({
      where: { id },
    });

    if (!link || link.userId !== userId) {
      return res.status(404).json({ error: "Platform link not found" });
    }

    await prisma.platformLink.delete({
      where: { id },
    });

    res.json({ message: "Platform link removed successfully" });
  } catch (error) {
    console.error("Error unlinking platform:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLinkedPlatforms = async (req, res) => {
  const userId = req.user.id;

  try {
    const links = await prisma.platformLink.findMany({
      where: { userId },
      include: {
        stats: {
          orderBy: { syncedAt: "desc" },
          take: 1,
        },
      },
    });

    res.json({ platformLinks: links });
  } catch (error) {
    console.error("Error fetching linked platforms:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const refreshPlatform = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const link = await prisma.platformLink.findUnique({
      where: { id },
    });

    if (!link || link.userId !== userId) {
      return res.status(404).json({ error: "Platform link not found" });
    }

    const fetcher = fetchers[link.platform];
    const result = await fetcher(link.externalUsername);

    if (!result.success) {
      await prisma.platformLink.update({
        where: { id: link.id },
        data: {
          lastSyncedAt: new Date(),
          lastSyncStatus: "FAILED",
        },
      });
      return res.status(400).json({ error: `Fetch failed: ${result.error}` });
    }

    // Save stats
    const newStats = await prisma.platformStats.create({
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

    res.status(200).json({ message: "Platform refreshed successfully", stats: newStats });
  } catch (error) {
    console.error("Error refreshing platform:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const refreshAllPlatforms = async (req, res) => {
  const userId = req.user.id;

  try {
    const links = await prisma.platformLink.findMany({
      where: { userId },
    });

    if (!links || links.length === 0) {
      return res.status(404).json({ error: "No platforms linked" });
    }

    const results = await Promise.allSettled(
      links.map(async (link) => {

        const fetcher = fetchers[link.platform];
        if (!fetcher) throw new Error("Unsupported platform");

        const result = await fetcher(link.externalUsername);
        if (!result.success) {
          await prisma.platformLink.update({
            where: { id: link.id },
            data: { lastSyncedAt: new Date(), lastSyncStatus: "FAILED" },
          });
          throw new Error(`Fetch failed: ${result.error}`);
        }

        const newStats = await prisma.platformStats.create({
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

        await prisma.platformLink.update({
          where: { id: link.id },
          data: { lastSyncedAt: new Date(), lastSyncStatus: "SUCCESS" },
        });

        return { linkId: link.id, platform: link.platform, stats: newStats };
      })
    );

    const successfulSyncs = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    
    const failedSyncs = results
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason.message);

    res.status(200).json({
      message: "Refresh complete",
      successful: successfulSyncs,
      failed: failedSyncs,
    });
  } catch (error) {
    console.error("Error refreshing all platforms:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
