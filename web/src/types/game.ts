export type GamePhase = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type QualityLevel = 'low' | 'medium' | 'high';

export type LaneIndex = -1 | 0 | 1;

export type ObstacleKind = 'LOW_BARRIER' | 'HIGH_BEAM' | 'FULL_PILLAR' | 'MOVING_CART';

export type BottomTab = 'home' | 'heroes' | 'play' | 'shop' | 'pass';

export type ActiveModal =
  | null
  | 'shop'
  | 'heroes'
  | 'inventory'
  | 'collection'
  | 'missions'
  | 'achievements'
  | 'pass'
  | 'event'
  | 'leaderboard'
  | 'friends'
  | 'inbox'
  | 'settings'
  | 'chest_reward';

export interface ActiveRunBoosts {
  useMagnet: boolean;
  useShield: boolean;
  useMultiplier: boolean;
  useHeadStart: boolean;
}

export interface RunTelemetry {
  score: number;
  distance: number;
  coinsEarned: number;
  sakuraTokensEarned: number;
  jumps: number;
  slides: number;
  consumedMagnet: boolean;
  consumedShield: boolean;
  consumedMultiplier: boolean;
  consumedHeadStart: boolean;
}

export interface HudSnapshot {
  phase: GamePhase;
  score: number;
  distance: number;
  coins: number;
  sakuraTokens: number;
  speedMultiplier: number;
  scoreMultiplier: number;
  bestScore: number;
  isNewRecord: boolean;
  milestoneLabel: string | null;
  dangerActive: boolean;
  magnetRemaining: number;
  hasShield: boolean;
  jumps: number;
  slides: number;
  headStartActive: boolean;
}

export interface PlayerProfile {
  uid: string;
  displayName: string;
  photoUrl: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  coins: number;
  gems: number;
  bestScore: number;
  totalDistance: number;
  totalRuns: number;
  totalCoinsCollected: number;
  activeMultiplier: number;
  multiplierExpiresAt: number;
  equippedHeroId: string;
  equippedCompanionId: string;
  unlockedHeroIds: string[];
  unlockedCompanionIds: string[];
  collectionIds: string[];
  inventoryMagnets: number;
  inventoryShields: number;
  inventoryMultipliers: number;
  inventoryHeadStarts: number;
  nextFreeChestAt: number;
  seasonLevel: number;
  seasonXp: number;
  claimedSeasonTiers: number[];
  eventSakuraTokens: number;
  claimedEventMilestones: string[];
  claimedAchievementIds: string[];
  dailyMissionCoins: number;
  dailyMissionCoinsClaimed: boolean;
  dailyMissionRuns: number;
  dailyMissionRunsClaimed: boolean;
  dailyMissionResetKey: string;
  weeklyMissionDistance: number;
  weeklyMissionDistanceClaimed: boolean;
  weeklyMissionJumps: number;
  weeklyMissionJumpsClaimed: boolean;
  weeklyMissionResetKey: string;
  totalJumps: number;
  totalSlides: number;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  level: number;
  bestScore: number;
  equippedHeroId: string;
  equippedCompanionId: string;
}

export interface FriendLink {
  friendUid: string;
  displayName: string;
  level: number;
  bestScore: number;
  equippedHeroId: string;
  requestId: string;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromDisplayName: string;
  fromLevel: number;
  toUid: string;
  toDisplayName: string;
  status: string;
}

export interface InboxMessage {
  id: string;
  senderUid: string;
  senderName: string;
  title: string;
  body: string;
  type: string;
  rewardCoins: number;
  rewardGems: number;
  read: boolean;
  claimed: boolean;
  createdAtMs: number;
}

export interface SocialBundle {
  friends: FriendLink[];
  friendRequests: FriendRequest[];
  inbox: InboxMessage[];
  leaderboard: LeaderboardEntry[];
}

export interface ChestReward {
  coins: number;
  gems: number;
  xp: number;
  nextFreeChestAt: number;
}

export interface QualityPreset {
  label: string;
  maxDpr: number;
  shadows: boolean;
  shadowMapSize: number;
  petalCount: number;
  fogDensity: number;
  farPlane: number;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: {
    label: 'Basse',
    maxDpr: 1.0,
    shadows: false,
    shadowMapSize: 512,
    petalCount: 60,
    fogDensity: 0.0115,
    farPlane: 145,
  },
  medium: {
    label: 'Moyenne',
    maxDpr: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    petalCount: 150,
    fogDensity: 0.0088,
    farPlane: 185,
  },
  high: {
    label: 'Haute',
    maxDpr: 2.0,
    shadows: true,
    shadowMapSize: 2048,
    petalCount: 240,
    fogDensity: 0.0072,
    farPlane: 220,
  },
};

export const GAME_CONSTANTS = {
  LANE_WIDTH: 2.35,
  ROAD_WIDTH: 8.4,
  SEGMENT_LENGTH: 24,
  SEGMENT_COUNT: 8,
  BASE_SPEED: 14.5,
  MAX_SPEED: 33.5,
  SPEED_ACCEL_PER_SEC: 0.24,
  JUMP_VELOCITY: 14.4,
  GRAVITY: 34.0,
  FALL_GRAVITY_MULTIPLIER: 1.45,
  FAST_FALL_VELOCITY: -28.0,
  SLIDE_DURATION: 0.68,
  LANE_LERP_RATE: 17.5,
  INPUT_BUFFER_SEC: 0.14,
  COYOTE_TIME_SEC: 0.09,
  LIFE_REGEN_SEC: 4.2,
  MOVING_CART_SPEED: 8.5,
  MOVING_CART_TRIGGER_DIST: 52.0,
  COIN_SCORE_VALUE: 25,
  DISTANCE_SCORE_RATE: 10,
} as const;

const STORAGE_KEYS = {
  BEST_SCORE: 'anime_rush_best_score_v1',
  QUALITY: 'anime_rush_quality_v1',
  MUTED: 'anime_rush_muted_v1',
} as const;

export function loadBestScore(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BEST_SCORE);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BEST_SCORE, String(Math.floor(score)));
  } catch {
    // Ignore storage quota errors in restricted environments
  }
}

export function loadSavedQuality(): QualityLevel {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUALITY);
    if (raw === 'low' || raw === 'medium' || raw === 'high') {
      return raw;
    }
  } catch {
    // Ignore
  }
  return 'medium';
}

export function saveQuality(quality: QualityLevel): void {
  try {
    localStorage.setItem(STORAGE_KEYS.QUALITY, quality);
  } catch {
    // Ignore
  }
}

export function loadSavedMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.MUTED) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MUTED, muted ? '1' : '0');
  } catch {
    // Ignore
  }
}
