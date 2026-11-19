import React from 'react';
import { PlayerProfile } from '../types/game';
import { BoltIcon, CoinIcon, GearIcon, GemIcon, PlusIcon } from './Icons';

interface TopBarProps {
  profile: PlayerProfile;
  displayMultiplier: number;
  onOpenShop: () => void;
  onOpenBoosts: () => void;
  onOpenSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  profile,
  displayMultiplier,
  onOpenShop,
  onOpenBoosts,
  onOpenSettings,
}) => {
  return (
    <header className="lobby-topbar interactive">
      {/* Left Cluster: Neo-Tokyo Currency Dock */}
      <div className="ar-currency-dock">
        <div
          className="ar-currency-cell"
          aria-label={`Gemmes : ${profile.gems}`}
          data-testid="gems-pill"
        >
          <GemIcon size={17} />
          <span className="tabular">{profile.gems.toLocaleString('fr-FR')}</span>
        </div>

        <span className="ar-currency-sep" aria-hidden="true" />

        <div
          className="ar-currency-cell"
          aria-label={`Pièces : ${profile.coins}`}
          data-testid="coins-pill"
        >
          <CoinIcon size={17} />
          <span className="tabular">{profile.coins.toLocaleString('fr-FR')}</span>
        </div>

        <button
          type="button"
          className="ar-plus-btn"
          onClick={onOpenShop}
          aria-label="Ouvrir la boutique"
          data-testid="topbar-shop-plus"
        >
          <PlusIcon size={14} />
        </button>
      </div>

      {/* Right Cluster: Skewed Anime Rank Multiplier + Hexagonal Gear */}
      <div className="ar-topbar-right">
        <button
          type="button"
          className={`ar-mult-tag ${displayMultiplier > 1 ? 'boosted' : ''}`}
          onClick={onOpenBoosts}
          aria-label={`Multiplicateur x${displayMultiplier}`}
          data-testid="multiplier-card"
        >
          <BoltIcon size={15} />
          <span className="ar-mult-val tabular">×{displayMultiplier}</span>
        </button>

        <button
          type="button"
          className="ar-gear-btn"
          onClick={onOpenSettings}
          aria-label="Profil, niveau et paramètres"
          data-testid="topbar-settings-btn"
        >
          <GearIcon size={21} />
        </button>
      </div>
    </header>
  );
};
