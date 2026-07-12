import axios from "axios";

const GITHUB_QUERY = `
  query($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetch stats from GitHub GraphQL API.
 * @param {string} username 
 * @returns {Promise<{ success: true, data: import('./types').NormalizedStats } | { success: false, error: string }>}
 */
export async function fetchProfile(username) {
  try {
    const token = process.env.GITHUB_PAT;
    if (!token) {
      return { success: false, error: "GITHUB_PAT is not defined in environment variables" };
    }

    const res = await axios.post(
      "https://api.github.com/graphql",
      { query: GITHUB_QUERY, variables: { username } },
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    if (res.data.errors) {
      return { success: false, error: res.data.errors[0].message };
    }

    const user = res.data?.data?.user;
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const calendar = user.contributionsCollection?.contributionCalendar;
    if (!calendar) {
      return { success: false, error: "Contributions calendar not found" };
    }

    const totalContributions = calendar.totalContributions || 0;
    
    // Normalize heatmap data to { "YYYY-MM-DD": count }
    const heatmapData = {};
    for (const week of calendar.weeks) {
      for (const day of week.contributionDays) {
        if (day.contributionCount > 0) {
          heatmapData[day.date] = day.contributionCount;
        }
      }
    }

    return {
      success: true,
      data: {
        problemsSolved: totalContributions, // Mapping to problemsSolved
        easyCount: null,
        mediumCount: null,
        hardCount: null,
        rank: null,
        heatmapData,
      },
    };
  } catch (error) {
    console.error("GitHub fetch error:", error.message);
    const errorMessage = error.response?.data?.message || error.message;
    return { success: false, error: errorMessage };
  }
}
