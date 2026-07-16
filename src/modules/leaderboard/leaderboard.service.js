import prisma from '../../config/db.js';

export class LeaderboardService {
  static async getGlobalLeaderboard(limit = 10, offset = 0) {
    const users = await prisma.user.findMany({
      include: {
        platformLinks: {
          where: { isValid: true },
          include: {
            stats: {
              orderBy: { syncedAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    const leaderboard = users.map(user => {
      let totalProblemsSolved = 0;
      
      user.platformLinks.forEach(link => {
        if (link.stats.length > 0 && link.stats[0].problemsSolved) {
          totalProblemsSolved += link.stats[0].problemsSolved;
        }
      });

      return {
        userId: user.id,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        totalProblemsSolved
      };
    });

    leaderboard.sort((a, b) => b.totalProblemsSolved - a.totalProblemsSolved);

    return leaderboard.slice(offset, offset + limit);
  }

  static async getPlatformLeaderboard(platform, limit = 10, offset = 0) {
    const links = await prisma.platformLink.findMany({
      where: {
        platform: platform.toUpperCase(),
        isValid: true
      },
      include: {
        user: true,
        stats: {
          orderBy: { syncedAt: 'desc' },
          take: 1
        }
      }
    });

    const leaderboard = links.map(link => {
      const latestStats = link.stats[0] || {};
      return {
        userId: link.user.id,
        username: link.user.username,
        name: link.user.name,
        avatarUrl: link.user.avatarUrl,
        platformUsername: link.externalUsername,
        problemsSolved: latestStats.problemsSolved || 0,
        rating: latestStats.rating || 0,
        rank: latestStats.rank || null
      };
    });

    leaderboard.sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return b.problemsSolved - a.problemsSolved;
    });

    return leaderboard.slice(offset, offset + limit);
  }
}
