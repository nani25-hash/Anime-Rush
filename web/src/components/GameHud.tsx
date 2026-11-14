import React from 'react';
import { HudSnapshot } from '../types/game';
import { CoinIcon, PauseIcon } from './Icons';

interface GameHudProps {
  hud: HudSnapshot;
  onPause: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({ hud, onPause }) => {
  return (
    <div className="overlay-layer">
      <div className="hud-top-row">
        <div className="hud-stats-cluster tabular">
          <div className="hud-score-card">
            <span className="hud-score-value">{hud.score.toLocaleString('fr-FR')}</span>
            <span className="hud-distance-value">{hud.distance} m</span>
          </div>

          <div className="hud-sub-row">
            <div className="hud-chip">
              <CoinIcon size={16} />
              <span>{hud.coins}</span>
            </div>
            <div className="hud-chip hud-speed-chip">
              <span>{hud.speedMultiplier.toFixed(1)}x</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="icon-btn interactive"
          onClick={onPause}
          aria-label="Pause"
          data-testid="pause-button"
        >
          <PauseIcon size={22} />
        </button>
      </div>

      {hud.milestoneLabel && <div className="milestone-banner">{hud.milestoneLabel}</div>}

      <div />
    </div>
  );
};
