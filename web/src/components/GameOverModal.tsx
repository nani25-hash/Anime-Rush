import React from 'react';
import { HudSnapshot } from '../types/game';
import { HomeIcon, RestartIcon } from './Icons';

interface GameOverModalProps {
  hud: HudSnapshot;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ hud, onRestart, onHome }) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <img src="./assets/ar-emblem.jpg" alt="AR" className="modal-emblem" />

        <h2 className="modal-title">GAME OVER</h2>

        {hud.isNewRecord && <div className="new-record-badge">NOUVEAU RECORD !</div>}

        <div className="stats-grid tabular">
          <div className="stat-box">
            <span className="stat-label">Score</span>
            <span className="stat-value">{hud.score.toLocaleString('fr-FR')}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Distance</span>
            <span className="stat-value">{hud.distance} m</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Pièces</span>
            <span className="stat-value" style={{ color: '#facc15' }}>
              {hud.coins}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Record</span>
            <span className="stat-value" style={{ color: '#38bdf8' }}>
              {hud.bestScore.toLocaleString('fr-FR')}
            </span>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="play-cta"
            onClick={onRestart}
            data-testid="restart-button"
          >
            <RestartIcon size={22} />
            <span>RESTART</span>
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
