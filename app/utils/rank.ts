export interface RankInfo {
  title: string;
  icon: string;
  color: string;
  min: number;
  max: number | null;
}

export const RANKS: RankInfo[] = [
  { title: 'Çaylak', icon: 'medal', color: '#cd7f32', min: 0, max: 50 },          // Bronz
  { title: 'Odaklı', icon: 'medal', color: '#C0C0C0', min: 50, max: 200 },        // Gümüş
  { title: 'Akademisyen', icon: 'award', color: '#FFD700', min: 200, max: 500 },  // Altın
  { title: 'Usta', icon: 'gem', color: '#2ecc71', min: 500, max: 1000 },          // Zümrüt
  { title: 'Efsane', icon: 'crown', color: '#9b59b6', min: 1000, max: null },     // Ametist / Mor
];

export const getRankInfo = (points: number): RankInfo => {
  const safePoints = points || 0;
  for (const rank of RANKS) {
    if (rank.max === null) {
      return rank; // Efsane
    }
    if (safePoints >= rank.min && safePoints < rank.max) {
      return rank;
    }
  }
  return RANKS[0];
};

export const getRankProgress = (points: number): { current: number; total: number; percentage: number; nextRank: string | null } => {
  const safePoints = points || 0;
  const currentRank = getRankInfo(safePoints);
  
  if (currentRank.max === null) {
    // Max seviye
    return { current: safePoints, total: safePoints, percentage: 100, nextRank: null };
  }

  const pointsInCurrentRank = safePoints - currentRank.min;
  const pointsNeededForNext = currentRank.max - currentRank.min;
  const percentage = (pointsInCurrentRank / pointsNeededForNext) * 100;
  
  const nextRankIndex = RANKS.findIndex(r => r.title === currentRank.title) + 1;
  const nextRank = RANKS[nextRankIndex]?.title || null;

  return {
    current: pointsInCurrentRank,
    total: pointsNeededForNext,
    percentage,
    nextRank
  };
};
