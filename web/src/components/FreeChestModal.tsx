import React from 'react';
import { ChestReward } from '../types/game';
import { ChestIcon, CoinIcon, GemIcon } from './Icons';

interface FreeChestModalProps {
  reward: ChestReward;
  onClose: () => void;
}

export const FreeChestModal: React.FC<FreeChestModalProps> = ({ reward, onClose }) => {
  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} data-testid="chest-reward-modal">
        <ChestIcon size={54} />
        <h2 className="modal-title">COFFRE OUVERT !</h2>

        <div className="stats-grid tabular">
          <div className="stat-box">
            <span className="stat-label">PIÈCES</span>
            <span className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#facc15' }}>
              <CoinIcon size={18} /> +{reward.coins}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">GEMMES</span>
            <span className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c084fc' }}>
              <GemIcon size={18} /> +{reward.gems}
            </span>
          </div>
        </div>

        <div className="new-record-badge">+{reward.xp} XP DE COMPTE !</div>

        <button type="button" className="play-cta" onClick={onClose}>
          <span>SUPER !</span>
        </button>
      </div>
    </div>
  );
};
