import axios from "axios";

/**
 * Fetch stats from Codeforces API.
 * @param {string} username 
 * @returns {Promise<{ success: true, data: import('./types').NormalizedStats } | { success: false, error: string }>}
 */
export async function fetchProfile(username) {
  try {
    // Fetch user info and submissions concurrently
    const [infoRes, statusRes] = await Promise.all([
      axios.get(`https://codeforces.com/api/user.info?handles=${username}`, { timeout: 10000 }),
      axios.get(`https://codeforces.com/api/user.status?handle=${username}`, { timeout: 10000 }).catch(e => {
        console.warn(`Failed to fetch submissions for ${username}: ${e.message}`);
        return { data: { status: "FAILED", result: [] } };
      })
    ]);

    if (infoRes.data.status !== "OK") {
      return { success: false, error: infoRes.data.comment || "Codeforces fetch failed" };
    }

    const user = infoRes.data.result[0];

    // Process submissions
    const submissions = statusRes.data.result || [];
    const solvedProblems = new Set();
    const heatmap = {};
    
    submissions.forEach(sub => {
      if (sub.verdict === "OK" && sub.problem) {
        const problemId = `${sub.problem.contestId}-${sub.problem.index}`;
        solvedProblems.add(problemId);
        
        const date = new Date(sub.creationTimeSeconds * 1000);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        
        heatmap[dateString] = (heatmap[dateString] || 0) + 1;
      }
    });

    return {
      success: true,
      data: {
        rating: user.rating || 0,
        maxRating: user.maxRating || 0,
        rank: user.rank || "Unrated",
        problemsSolved: solvedProblems.size > 0 ? solvedProblems.size : null,
        heatmapData: Object.keys(heatmap).length > 0 ? heatmap : null,
      },
    };
  } catch (error) {
    console.error("Codeforces fetch error:", error.message);
    const errorMessage = error.response?.data?.comment || error.message;
    return { success: false, error: errorMessage };
  }
}
