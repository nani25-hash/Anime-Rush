import React from 'react';
import { getHeroById } from '../config/catalog';
import { PlayerProfile } from '../types/game';
import { CoinIcon, GemIcon, MenuIcon } from './Icons';

interface TopBarProps {
  profile: PlayerProfile;
  onOpenSettings: () => void;
  onOpenShop: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  profile,
  onOpenSettings,
  onOpenShop,
}) => {
  const hero = getHeroById(profile.equippedHeroId);
  const xpPct = Math.min(100, Math.max(4, Math.round((profile.xp / Math.max(1, profile.xpToNextLevel)) * 100)));

  return (
    <header className="lobby-topbar interactive">
      {/* Profile Lv / Pseudo / XP Card */}
      <button
        type="button"
        className="profile-chip"
        onClick={onOpenSettings}
        aria-label="Profil et paramètres du joueur"
        data-testid="profile-chip"
      >
        <div
          className="profile-avatar"
          style={{ borderColor: hero.uiAccent, background: `linear-gradient(135deg, ${hero.uiAccent}33, #0f172a)` }}
        >
          <span className="profile-kanji">{hero.kanji}</span>
        </div>
        <div className="profile-meta">
          <div className="profile-name-row">
            <span className="profile-lv tabular">Lv.{profile.level}</span>
            <span className="profile-name">{profile.displayName}</span>
          </div>
          <div className="profile-xp-bar" title={`${profile.xp} / ${profile.xpToNextLevel} XP`}>
            <div className="profile-xp-fill" style={{ width: `${xpPct}%` }} />
            <span className="profile-xp-text tabular">
              XP {profile.xp.toLocaleString('fr-FR')} / {profile.xpToNextLevel.toLocaleString('fr-FR')}
            </span>
          </div>
        </div>
      </button>

      {/* Currencies (Coins + Gems only — NO Energy Bar) & Menu Button */}
      <div className="topbar-currencies">
        <button
          type="button"
          className="currency-pill"
          onClick={onOpenShop}
          aria-label="Pièces - Ouvrir la boutique"
          data-testid="coins-pill"
        >
          <CoinIcon size={17} />
          <span className="tabular">{profile.coins.toLocaleString('fr-FR')}</span>
          <span className="currency-plus">+</span>
        </button>

        <button
          type="button"
          className="currency-pill currency-gems"
          onClick={onOpenShop}
          aria-label="Gemmes - Ouvrir la boutique"
          data-testid="gems-pill"
        >
          <GemIcon size={17} />
          <span className="tabular">{profile.gems.toLocaleString('fr-FR')}</span>
          <span className="currency-plus">+</span>
        </button>

        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onOpenSettings}
          aria-label="Menu et paramètres"
          data-testid="settings-button"
        >
          <MenuIcon size={20} />
        </button>
      </div>
    </header>
  );
};
