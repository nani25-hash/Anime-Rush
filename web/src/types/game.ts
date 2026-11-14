export type GamePhase = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type QualityLevel = 'low' | 'medium' | 'high';

export type LaneIndex = -1 | 0 | 1;

export type ObstacleKind = 'LOW_BARRIER' | 'HIGH_BEAM' | 'FULL_PILLAR';

export interface HudSnapshot {
  phase: GamePhase;
  score: number;
  distance: number;
  coins: number;
  speedMultiplier: number;
  bestScore: number;
  isNewRecord: boolean;
  milestoneLabel: string | null;
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
    fogDensity: 0.0155,
    farPlane: 130,
  },
  medium: {
    label: 'Moyenne',
    maxDpr: 1.5,
    shadows: true,
    shadowMapSize: 1024,
    petalCount: 140,
    fogDensity: 0.0125,
    farPlane: 165,
  },
  high: {
    label: 'Haute',
    maxDpr: 2.0,
    shadows: true,
    shadowMapSize: 2048,
    petalCount: 240,
    fogDensity: 0.0105,
    farPlane: 200,
  },
};

export const GAME_CONSTANTS = {
  LANE_WIDTH: 2.35,
  ROAD_WIDTH: 8.2,
  SEGMENT_LENGTH: 24,
  SEGMENT_COUNT: 8,
  BASE_SPEED: 14.5,
  MAX_SPEED: 32.0,
  SPEED_ACCEL_PER_SEC: 0.24,
  JUMP_VELOCITY: 14.2,
  GRAVITY: 38.0,
  FAST_FALL_VELOCITY: -26.0,
  SLIDE_DURATION: 0.68,
  LANE_LERP_RATE: 17.0,
  INPUT_BUFFER_SEC: 0.14,
  COYOTE_TIME_SEC: 0.09,
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
