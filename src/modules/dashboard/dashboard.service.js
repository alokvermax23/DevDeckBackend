import prisma from "../../config/db.js";

function sumProblemSolved(platforms) {
    let total = 0;
    for (let i = 0; i < platforms.length; i++) {
        const solved = platforms[i].problemsSolved || 0;
        total = total + solved;
    }
    return total;
}

//heatmaps 
function mergeHeatMaps(heatmapsArray){
    let merged = {};
    for(let i = 0; i < heatmapsArray.length; i++){
        const currentHeatMaps = heatmapsArray[i] || {};

        for(const timestampKey in currentHeatMaps){
            let dateStr = timestampKey;
            if (!isNaN(timestampKey)) {
                const date = new Date(parseInt(timestampKey) * 1000);
                dateStr = date.toISOString().split("T")[0];
            }

            if(merged[dateStr]){
                merged[dateStr] = merged[dateStr] + currentHeatMaps[timestampKey];
            }
            else {
                merged[dateStr] = currentHeatMaps[timestampKey];
            }
        }
    }
    return merged;
}

//calculate current streak 
function calculateCurrentStreak(heatmap){
    let streak = 0;
    let currentDate = new Date();
    
    let dateKey = currentDate.toISOString().split("T")[0];
    if (!heatmap[dateKey]) {
        currentDate.setDate(currentDate.getDate() - 1);
    }

    while(true){
        const key = currentDate.toISOString().split("T")[0]; 
        if(heatmap[key] > 0){
            streak = streak + 1;
            currentDate.setDate(currentDate.getDate() - 1);
        }
        else {
            return streak;
        }
    }
}

//calculate longest streak 
function calculateMaxStreak(heatmap){
    const dates = Object.keys(heatmap).filter(date => heatmap[date] > 0);
    if (dates.length === 0) return 0;
    
    dates.sort();
    let maxStreak = 0;
    let currentStreak = 0;
    
    for(let i = 0; i < dates.length; i++){
        if(i === 0){
            currentStreak = 1;
        }
        else {
            const prevDate = new Date(dates[i-1]);
            const currDate = new Date(dates[i]);
            const prevUTC = Date.UTC(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
            const currUTC = Date.UTC(currDate.getFullYear(), currDate.getMonth(), currDate.getDate());
            const diffInDays = (currUTC - prevUTC) / (1000 * 60 * 60 * 24);
            
            if(diffInDays === 1){
                currentStreak = currentStreak + 1;
            }
            else if (diffInDays > 1) {
                currentStreak = 1;
            }
        }
        if(currentStreak > maxStreak){
            maxStreak = currentStreak;
        }
    }
    return maxStreak;
}

export async function getDashboardSummary(userId) {
  const platformLinks = await prisma.platformLink.findMany({
    where: { userId, isValid: true },
    include: {
      stats: {
        orderBy: { syncedAt: 'desc' },
        take: 1
      }
    }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true }
  });

  const platforms = platformLinks.map(link => {
      const latestStat = link.stats[0] || {};
      return {
          platform: link.platform,
          externalUsername: link.externalUsername,
          problemsSolved: latestStat.problemsSolved,
          heatmapData: latestStat.heatmapData
      };
  });

  const totalProblemsSolved = sumProblemSolved(platforms);  

  const githubPlatform = platforms.find(p => p.platform === 'GITHUB');
  const githubCommits = githubPlatform?.problemsSolved || 0;
  const problemsSolved = totalProblemsSolved - githubCommits;

  // All heatmaps merged
  const heatmapsArray = platforms
    .map(p => p.heatmapData)     
    .filter(h => h);              
  const heatmap = mergeHeatMaps(heatmapsArray);  

  // GitHub-only heatmap
  const githubHeatmapArray = platforms
    .filter(p => p.platform === 'GITHUB')
    .map(p => p.heatmapData)
    .filter(h => h);
  const githubHeatmap = mergeHeatMaps(githubHeatmapArray);

  // Problems-only heatmap (non-GitHub platforms)
  const problemsHeatmapArray = platforms
    .filter(p => p.platform !== 'GITHUB')
    .map(p => p.heatmapData)
    .filter(h => h);
  const problemsHeatmap = mergeHeatMaps(problemsHeatmapArray);

  const currentStreak = calculateCurrentStreak(heatmap);   
  const maxStreak = calculateMaxStreak(heatmap);      

  return {
    totalProblemsSolved: problemsSolved,
    githubCommits,
    currentStreak,
    maxStreak,
    platformCount: platforms.length,
    heatmap,
    githubHeatmap,
    problemsHeatmap,
    platforms,
    avatarUrl: user?.avatarUrl
  };
}