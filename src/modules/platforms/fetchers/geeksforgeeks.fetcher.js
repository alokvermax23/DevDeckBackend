import axios from "axios";
import { redisClient } from "../../../config/redis.js";

/**
 * Fetch stats from GeeksforGeeks API (Internal).
 * Note: this is an unofficial/internal endpoint, may break without warning.
 * @param {string} username 
 * @returns {Promise<{ success: true, data: import('./types').NormalizedStats } | { success: false, error: string }>}
 */
export async function fetchProfile(username) {
  const cacheKey = `platform-cache:GEEKSFORGEEKS:${username}`;
  
  try {
    // Check cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return { success: true, data: JSON.parse(cached) };
    }

    const res = await axios.post(
      "https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/",
      { 
        handle: username, 
        requestType: "", 
        year: "", 
        month: "" 
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    if (res.data.status !== "success") {
      return { success: false, error: "GFG fetch failed" };
    }

    const result = res.data.result || {};
    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;
    let problemsSolved = 0;
    const heatmap = {};

    for (const [difficulty, problems] of Object.entries(result)) {
      const count = Object.keys(problems).length;
      problemsSolved += count;
      if (difficulty === "Easy") easyCount += count;
      else if (difficulty === "Medium") mediumCount += count;
      else if (difficulty === "Hard") hardCount += count;

      for (const [id, problem] of Object.entries(problems)) {
        if (problem.user_subtime) {
           const dateStr = problem.user_subtime.split(" ")[0]; // "2025-10-08"
           heatmap[dateStr] = (heatmap[dateStr] || 0) + 1;
        }
      }
    }

    const data = { 
      problemsSolved, 
      easyCount, 
      mediumCount, 
      hardCount, 
      heatmapData: Object.keys(heatmap).length > 0 ? heatmap : null 
    };

    // Cache the result for 6 hours
    await redisClient.set(cacheKey, JSON.stringify(data), "EX", 6 * 60 * 60);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("GFG fetch error:", error.message);
    return { success: false, error: error.message };
  }
}
