export type GamePhase = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type QualityLevel = 'low' | 'medium' | 'high';

export type FpsLimit = 30 | 60;

export type TutorialStep = 'SWIPE_LR' | 'JUMP' | 'SLIDE';

export type LaneIndex = -1 | 0 | 1;

export type ObstacleKind =
  | 'LOW_BARRIER'
  | 'HIGH_BEAM'
  | 'FULL_PILLAR'
  | 'MOVING_CART'
  | 'WALL_GATE_1'
  | 'WALL_GATE_2';

export type BottomTab = 'home' | 'missions' | 'heroes' | 'shop' | 'pass';

export type ActiveModal =
  | null
  | 'shop'
  | 'heroes'
  | 'cars'
  | 'companions'
  | 'inventory'
  | 'collection'
  | 'missions'
  | 'achievements'
  | 'pass'
  | 'event'
  | 'daily_login'
  | 'leaderboard'
  | 'friends'
  | 'inbox'
  | 'settings'
  | 'chest_reward';

export type HeroPassiveType =
  | 'COIN_BONUS'
  | 'MAGNET_DURATION'
  | 'SCORE_BOOST'
  | 'FUEL_EFFICIENCY'
  | 'START_SHIELD'
  | 'SKILL_HASTE';

export type HeroActiveEffect =
  | 'SHIELD_SURGE'
  | 'MAGNET_WAVE'
  | 'SCORE_OVERDRIVE'
  | 'SONIC_BLAST'
  | 'FUEL_INJECT'
  | 'SAKURA_BURST'
  | 'SUPERNOVA';

export type CompanionPassiveType = HeroPassiveType;

export type CompanionActiveEffect =
  | 'COIN_X2'
  | 'MAGNET_AURA'
  | 'SHIELD_BARK'
  | 'FUEL_FETCH'
  | 'SAKURA_HOWL'
  | 'SHOCKWAVE_DASH';

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
  nearMisses: number;
  shibaActivations: number;
  carDistance: number;
  trainJumps: number;
  rushLettersMaskEarned: number;
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
  // Fuel & Open-Top Convertible Car Mode
  fuelPct: number;
  fuelCount: number;
  fuelMax: number;
  fuelReady: boolean;
  carRemaining: number;
  carActive: boolean;
  carName: string;
  // Dynamic Hero Power System
  heroName: string;
  heroPowerName: string;
  heroPowerAccent: string;
  heroPowerChargePct: number;
  heroPowerReady: boolean;
  heroPowerActiveRemaining: number;
  heroPassiveSummary: string;
  // Dynamic Shiba Companion Power System
  shibaName: string;
  shibaPowerName: string;
  shibaPowerAccent: string;
  shibaPowerChargePct: number;
  shibaPowerReady: boolean;
  shibaPowerActiveRemaining: number;
  shibaCoinX2Active: boolean;
  // Near-miss Combo, RUSH Word, Speed Lines, Tutorial & Record Gate
  nearMissCount: number;
  nearMissCombo: number;
  nearMissComboTimer: number;
  nearMissLabel: string | null;
  rushLettersMask: number;
  speedLinesIntensity: number;
  tutorialStep: TutorialStep | null;
  recordGateMeters: number | null;
  biomeName: string;
  canRevive: boolean;
  revivedUsed: boolean;
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
  equippedCarId: string;
  unlockedHeroIds: string[];
  unlockedCompanionIds: string[];
  unlockedCarIds: string[];
  upgradeMagnetLevel: number;
  upgradeCarLevel: number;
  upgradeShieldLevel: number;
  upgradeScoreLevel: number;
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
  dailyNearMisses: number;
  dailyNearMissesClaimed: boolean;
  dailyShibaUses: number;
  dailyShibaUsesClaimed: boolean;
  dailyMissionResetKey: string;
  weeklyMissionDistance: number;
  weeklyMissionDistanceClaimed: boolean;
  weeklyMissionJumps: number;
  weeklyMissionJumpsClaimed: boolean;
  weeklyCarDistance: number;
  weeklyCarDistanceClaimed: boolean;
  weeklyTrainJumps: number;
  weeklyTrainJumpsClaimed: boolean;
  weeklyMissionResetKey: string;
  totalJumps: number;
  totalSlides: number;
  rushLettersMask: number;
  rushResetKey: string;
  rushWordsCompleted: number;
  loginStreakDay: number;
  loginLastClaimKey: string;
  gachaDraws: number;
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

export interface LoginRewardResult {
  day: number;
  title: string;
  summary: string;
  coins: number;
  gems: number;
  magnets: number;
  shields: number;
  multipliers: number;
  headStarts: number;
  sakuraTokens: number;
}

export interface RushWordResult {
  coins: number;
  gems: number;
  seasonXp: number;
  wordsCompleted: number;
}

export interface GachaDrawResult {
  rewardId: string;
  title: string;
  rarity: string;
  description: string;
  coinsAdded: number;
  gemsAdded: number;
  sakuraAdded: number;
  unlockedType: string;
  unlockedId: string;
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
    farPlane: 230,
  },
  medium: {
    label: 'Moyenne',
    maxDpr: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    petalCount: 150,
    fogDensity: 0.0088,
    farPlane: 245,
  },
  high: {
    label: 'Haute',
    maxDpr: 2.0,
    shadows: true,
    shadowMapSize: 2048,
    petalCount: 240,
    fogDensity: 0.0072,
    farPlane: 275,
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
  MOVING_CART_SPEED: 11.2,
  MOVING_CART_TRIGGER_DIST: 96.0,
  COIN_SCORE_VALUE: 25,
  DISTANCE_SCORE_RATE: 10,
  FUEL_MAX_UNITS: 100,
  FUEL_CAN_UNITS: 20,
  CAR_TURBO_DURATION_SEC: 10.0,
  CAR_TURBO_SPEED: 30.5,
  REVIVE_GEM_COST: 15,
} as const;

const STORAGE_KEYS = {
  BEST_SCORE: 'anime_rush_best_score_v1',
  QUALITY: 'anime_rush_quality_v1',
  MUTED: 'anime_rush_muted_v1',
  HAPTICS: 'anime_rush_haptics_v1',
  FPS_LIMIT: 'anime_rush_fps_limit_v1',
  MUSIC_VOL: 'anime_rush_music_vol_v1',
  SFX_VOL: 'anime_rush_sfx_vol_v1',
  TUTORIAL_DONE: 'anime_rush_tutorial_done_v1',
} as const;

export function getTodayUtcKey(nowMs = Date.now()): string {
  const d = new Date(nowMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

export function loadSavedHaptics(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HAPTICS);
    return raw !== '0';
  } catch {
    return true;
  }
}

export function saveHaptics(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HAPTICS, enabled ? '1' : '0');
  } catch {
    // Ignore
  }
}

export function loadSavedFpsLimit(): FpsLimit {
  try {
    return localStorage.getItem(STORAGE_KEYS.FPS_LIMIT) === '30' ? 30 : 60;
  } catch {
    return 60;
  }
}

export function saveFpsLimit(fps: FpsLimit): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FPS_LIMIT, String(fps));
  } catch {
    // Ignore
  }
}

export function loadMusicVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MUSIC_VOL);
    if (raw === null) return 0.55;
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.55;
  } catch {
    return 0.55;
  }
}

export function saveMusicVolume(vol: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MUSIC_VOL, String(Math.max(0, Math.min(1, vol))));
  } catch {
    // Ignore
  }
}

export function loadSfxVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SFX_VOL);
    if (raw === null) return 0.8;
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.8;
  } catch {
    return 0.8;
  }
}

export function saveSfxVolume(vol: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SFX_VOL, String(Math.max(0, Math.min(1, vol))));
  } catch {
    // Ignore
  }
}

export function loadTutorialDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.TUTORIAL_DONE) === '1';
  } catch {
    return false;
  }
}

export function saveTutorialDone(done: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TUTORIAL_DONE, done ? '1' : '0');
  } catch {
    // Ignore
  }
}
