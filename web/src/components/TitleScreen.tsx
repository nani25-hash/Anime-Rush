import React from 'react';
import { QUALITY_PRESETS, QualityLevel } from '../types/game';
import { PlayIcon, TrophyIcon, VolumeIcon } from './Icons';

interface TitleScreenProps {
  bestScore: number;
  quality: QualityLevel;
  muted: boolean;
  onPlay: () => void;
  onQualityChange: (quality: QualityLevel) => void;
  onToggleMute: () => void;
}

const QUALITY_OPTIONS: QualityLevel[] = ['low', 'medium', 'high'];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  bestScore,
  quality,
  muted,
  onPlay,
  onQualityChange,
  onToggleMute,
}) => {
  return (
    <div className="overlay-layer title-screen">
      <div className="title-header-group">
        <div className="title-top-bar">
          <div className="record-pill interactive tabular" aria-label="Meilleur score">
            <TrophyIcon size={18} />
            <span>RECORD {bestScore.toLocaleString('fr-FR')}</span>
          </div>

          <button
            type="button"
            className="icon-btn metallic-btn interactive"
            onClick={onToggleMute}
            aria-label={muted ? 'Activer le son' : 'Couper le son'}
          >
            <VolumeIcon muted={muted} />
          </button>
        </div>

        <div className="title-lockup" aria-label="Anime Rush">
          <svg
            className="title-logo-svg"
            viewBox="0 0 380 136"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="ANIME RUSH"
          >
            <defs>
              <linearGradient id="plaqueWood" x1="0" y1="10" x2="0" y2="124" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#9A5328" />
                <stop offset="50%" stopColor="#7C3D19" />
                <stop offset="100%" stopColor="#4F230C" />
              </linearGradient>
              <linearGradient id="animeGrad" x1="0" y1="20" x2="0" y2="66" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="65%" stopColor="#F1F5F9" />
                <stop offset="100%" stopColor="#CBD5E1" />
              </linearGradient>
              <linearGradient id="rushGrad" x1="60" y1="68" x2="320" y2="122" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="50%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#FACC15" />
              </linearGradient>
            </defs>

            {/* Wooden shrine signboard plaque behind logo */}
            <path
              d="M36 22L344 16L334 114L46 120Z"
              fill="url(#plaqueWood)"
              stroke="#2C1206"
              strokeWidth="4.5"
              strokeLinejoin="round"
            />
            <path d="M44 52L338 48" stroke="#3D1908" strokeWidth="2.2" opacity="0.65" />
            <path d="M48 88L334 84" stroke="#3D1908" strokeWidth="2.2" opacity="0.65" />
            <circle cx="52" cy="34" r="4" fill="#D97706" stroke="#2C1206" strokeWidth="1.5" />
            <circle cx="328" cy="30" r="4" fill="#D97706" stroke="#2C1206" strokeWidth="1.5" />
            <circle cx="58" cy="106" r="4" fill="#D97706" stroke="#2C1206" strokeWidth="1.5" />
            <circle cx="322" cy="102" r="4" fill="#D97706" stroke="#2C1206" strokeWidth="1.5" />

            <text
              x="190"
              y="64"
              textAnchor="middle"
              fill="url(#animeGrad)"
              stroke="#1A0F0A"
              strokeWidth="7"
              paintOrder="stroke"
              fontSize="48"
              fontWeight="900"
              fontStyle="italic"
              letterSpacing="3"
            >
              ANIME
            </text>
            <text
              x="190"
              y="112"
              textAnchor="middle"
              fill="url(#rushGrad)"
              stroke="#1A0F0A"
              strokeWidth="8"
              paintOrder="stroke"
              fontSize="54"
              fontWeight="900"
              fontStyle="italic"
              letterSpacing="4"
            >
              RUSH
            </text>
          </svg>
        </div>
      </div>

      <div className="title-bottom-dock interactive">
        <div className="quality-segmented" role="group" aria-label="Qualité graphique">
          {QUALITY_OPTIONS.map((q) => (
            <button
              key={q}
              type="button"
              className={`quality-btn quality-${q} ${quality === q ? 'active' : ''}`}
              onClick={() => onQualityChange(q)}
            >
              {QUALITY_PRESETS[q].label}
            </button>
          ))}
        </div>

        <button type="button" className="play-cta" onClick={onPlay} data-testid="play-button">
          <PlayIcon size={24} />
          <span>JOUER</span>
        </button>

        <p className="control-hint">
          ↔ GLISSER : Gauche/Droite · ↑ SAUTER · ↓ GLISSER
        </p>
      </div>
    </div>
  );
};
