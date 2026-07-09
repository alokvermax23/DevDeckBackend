import axios from "axios";
import { redisClient } from "../../../config/redis.js";

/**
 * Fetch stats from CodeChef HTML profile.
 * @param {string} username 
 * @returns {Promise<{ success: true, data: import('./types').NormalizedStats } | { success: false, error: string }>}
 */
export async function fetchProfile(username) {
  const cacheKey = `platform-cache:CODECHEF:${username}`;

  try {
    // Check cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return { success: true, data: JSON.parse(cached) };
    }

    const res = await axios.get(`https://www.codechef.com/users/${username}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 10000,
    });

    const html = res.data;

    const heatmapMatch = html.match(/var userDailySubmissionsStats = (\[.*?\]);/);
    const solvedMatch = html.match(/Total Problems Solved: (\d+)/);

    if (!heatmapMatch || !solvedMatch) {
      return { success: false, error: "Could not parse CodeChef profile" };
    }

    const rawHeatmap = JSON.parse(heatmapMatch[1]);
    const problemsSolved = parseInt(solvedMatch[1], 10);

    const heatmapData = {};
    for (const item of rawHeatmap) {
      // item.date is like "2026-7-9", normalize to "YYYY-MM-DD"
      const [year, month, day] = item.date.split("-");
      const normalizedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      heatmapData[normalizedDate] = item.value;
    }

    const data = {
      problemsSolved,
      heatmapData,
    };

    // Cache the result for 6 hours
    await redisClient.set(cacheKey, JSON.stringify(data), "EX", 6 * 60 * 60);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("CodeChef fetch error:", error.message);
    return { success: false, error: error.message };
  }
}
