import axios from "axios";

const LEETCODE_QUERY = `
  query userProfile($username: String!) {
    matchedUser(username: $username) {
      username
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
      profile {
        ranking
        realName
      }
      userCalendar {
        submissionCalendar
      }
    }
  }
`;

/**
 * Fetch stats from LeetCode GraphQL API.
 * @param {string} username 
 * @returns {Promise<{ success: true, data: import('./types').NormalizedStats } | { success: false, error: string }>}
 */
export async function fetchProfile(username) {
  try {
    const res = await axios.post(
      "https://leetcode.com/graphql",
      { query: LEETCODE_QUERY, variables: { username } },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      }
    );

    const matchedUser = res.data?.data?.matchedUser;
    
    if (!matchedUser) {
      return { success: false, error: "User not found" };
    }

    const acSubmissionNum = matchedUser.submitStats?.acSubmissionNum || [];
    
    let problemsSolved = 0;
    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;

    for (const sub of acSubmissionNum) {
      if (sub.difficulty === "All") problemsSolved = sub.count;
      else if (sub.difficulty === "Easy") easyCount = sub.count;
      else if (sub.difficulty === "Medium") mediumCount = sub.count;
      else if (sub.difficulty === "Hard") hardCount = sub.count;
    }

    let heatmapData = null;
    if (matchedUser.userCalendar?.submissionCalendar) {
      try {
        heatmapData = JSON.parse(matchedUser.userCalendar.submissionCalendar);
      } catch (e) {
        console.warn("Failed to parse LeetCode submissionCalendar:", e.message);
      }
    }

    return {
      success: true,
      data: {
        problemsSolved,
        easyCount,
        mediumCount,
        hardCount,
        rank: matchedUser.profile?.ranking ? String(matchedUser.profile.ranking) : null,
        heatmapData,
      },
    };
  } catch (error) {
    console.error("LeetCode fetch error:", error.message);
    const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;
    return { success: false, error: errorMessage };
  }
}
