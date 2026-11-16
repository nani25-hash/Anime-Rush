import React from 'react';
import { HudSnapshot } from '../types/game';
import { CoinIcon, HomeIcon, RestartIcon, SakuraIcon } from './Icons';

interface GameOverModalProps {
  hud: HudSnapshot;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ hud, onRestart, onHome }) => {
  const earnedXp = Math.max(40, Math.floor(hud.distance / 8) + hud.coins * 2 + 60);

  return (
    <div className="modal-backdrop">
      <div className="modal-card" data-testid="gameover-modal">
        <h2 className="modal-title">FIN DE COURSE</h2>

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
            <span className="stat-label">Neko Pièces</span>
            <span className="stat-value" style={{ color: '#facc15', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CoinIcon size={17} /> +{hud.coins}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Sakura & XP</span>
            <span className="stat-value" style={{ color: '#f472b6', display: 'flex', alignItems: 'center', gap: 6, fontSize: 16 }}>
              <SakuraIcon size={15} /> +{hud.sakuraTokens} · +{earnedXp} XP
            </span>
          </div>
        </div>

        <div className="stat-box" style={{ width: '100%', textAlign: 'center' }}>
          <span className="stat-label">Ton Record</span>
          <span className="stat-value" style={{ color: '#38bdf8' }}>
            {hud.bestScore.toLocaleString('fr-FR')} pts
          </span>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="play-cta"
            onClick={onRestart}
            data-testid="restart-button"
          >
            <RestartIcon size={22} />
            <span>REJOUER</span>
          </button>

          <button type="button" className="secondary-btn" onClick={onHome} data-testid="home-button">
            <HomeIcon size={18} />
            <span>ACCUEIL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
