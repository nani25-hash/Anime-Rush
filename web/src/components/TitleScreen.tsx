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
            <TrophyIcon size={17} />
            <span>RECORD {bestScore.toLocaleString('fr-FR')}</span>
          </div>

          <button
            type="button"
            className="icon-btn interactive"
            onClick={onToggleMute}
            aria-label={muted ? 'Activer le son' : 'Couper le son'}
          >
            <VolumeIcon muted={muted} />
          </button>
        </div>

        <div className="title-lockup" aria-label="Anime Rush">
          <svg
            className="title-logo-svg"
            viewBox="0 0 360 112"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="ANIME RUSH"
          >
            <defs>
              <linearGradient id="animeGrad" x1="0" y1="0" x2="0" y2="54" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#CBD5E1" />
              </linearGradient>
              <linearGradient id="rushGrad" x1="40" y1="52" x2="300" y2="105" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="50%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#FACC15" />
              </linearGradient>
            </defs>
            <text
              x="170"
              y="48"
              textAnchor="middle"
              fill="url(#animeGrad)"
              stroke="#070B19"
              strokeWidth="6"
              paintOrder="stroke"
              fontSize="44"
              fontWeight="900"
              fontStyle="italic"
              letterSpacing="4"
            >
              ANIME
            </text>
            <text
              x="180"
              y="98"
              textAnchor="middle"
              fill="url(#rushGrad)"
              stroke="#070B19"
              strokeWidth="7"
              paintOrder="stroke"
              fontSize="50"
              fontWeight="900"
              fontStyle="italic"
              letterSpacing="5"
            >
              RUSH
            </text>
            <path
              d="M312 18L318 32L332 38L318 44L312 58L306 44L292 38L306 32Z"
              fill="#E2E8F0"
              stroke="#070B19"
              strokeWidth="3"
            />
            <circle cx="312" cy="38" r="4" fill="#F97316" />
          </svg>
        </div>
      </div>

      <div className="title-bottom-dock interactive">
        <div className="quality-segmented" role="group" aria-label="Qualité graphique">
          {QUALITY_OPTIONS.map((q) => (
            <button
              key={q}
              type="button"
              className={`quality-btn ${quality === q ? 'active' : ''}`}
              onClick={() => onQualityChange(q)}
            >
              {QUALITY_PRESETS[q].label}
            </button>
          ))}
        </div>

        <button type="button" className="play-cta" onClick={onPlay} data-testid="play-button">
          <PlayIcon size={24} />
          <span>PLAY</span>
        </button>

        <p className="control-hint">
          Glisser : Gauche/Droite · Haut Sauter · Bas Glisser
        </p>
      </div>
    </div>
  );
};
