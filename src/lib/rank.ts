import { C } from '@/src/theme';

export interface RankInfo {
  title: string;
  icon: string;
  color: string;
  min: number;
  max: number | null;
}

export const RANKS: RankInfo[] = [
  { title: 'Çaylak', icon: 'medal', color: C.rank.bronze, min: 0, max: 50 },          // Bronz
  { title: 'Odaklı', icon: 'medal', color: C.rank.silver, min: 50, max: 200 },        // Gümüş
  { title: 'Akademisyen', icon: 'award', color: C.rank.gold, min: 200, max: 500 },  // Altın
  { title: 'Usta', icon: 'gem', color: C.rank.emerald, min: 500, max: 1000 },          // Zümrüt
  { title: 'Efsane', icon: 'crown', color: C.rank.amethyst, min: 1000, max: null },     // Ametist / Mor
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
