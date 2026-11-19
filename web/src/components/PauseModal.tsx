import React from 'react';
import { FpsLimit, QUALITY_PRESETS, QualityLevel } from '../types/game';
import { HomeIcon, PlayIcon, RestartIcon, VolumeIcon } from './Icons';

interface PauseModalProps {
  quality: QualityLevel;
  fpsLimit: FpsLimit;
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onQualityChange: (quality: QualityLevel) => void;
  onFpsLimitChange: (fps: FpsLimit) => void;
  onToggleMute: () => void;
}

const QUALITY_OPTIONS: QualityLevel[] = ['low', 'medium', 'high'];

export const PauseModal: React.FC<PauseModalProps> = ({
  quality,
  fpsLimit,
  muted,
  onResume,
  onRestart,
  onHome,
  onQualityChange,
  onFpsLimitChange,
  onToggleMute,
}) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h2 className="modal-title">PAUSE</h2>

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

        <div className="quality-segmented" role="group" aria-label="Limite FPS">
          <button
            type="button"
            className={`quality-btn ${fpsLimit === 30 ? 'active' : ''}`}
            onClick={() => onFpsLimitChange(30)}
          >
            30 FPS
          </button>
          <button
            type="button"
            className={`quality-btn ${fpsLimit === 60 ? 'active' : ''}`}
            onClick={() => onFpsLimitChange(60)}
          >
            60 FPS
          </button>
        </div>

        <div className="modal-actions">
          <button type="button" className="play-cta" onClick={onResume}>
            <PlayIcon size={22} />
            <span>REPRENDRE</span>
          </button>

          <button type="button" className="secondary-btn" onClick={onRestart}>
            <RestartIcon size={18} />
            <span>REJOUER</span>
          </button>

          <button type="button" className="secondary-btn" onClick={onToggleMute}>
            <VolumeIcon muted={muted} size={18} />
            <span>{muted ? 'ACTIVER LE SON' : 'COUPER LE SON'}</span>
          </button>

          <button type="button" className="secondary-btn" onClick={onHome}>
            <HomeIcon size={18} />
            <span>ACCUEIL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
