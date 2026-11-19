import React from 'react';
import { BottomTab } from '../types/game';
import { AchievementIcon, CartIcon, HeroIcon, PassIcon } from './Icons';

interface BottomNavBarProps {
  activeTab: BottomTab;
  missionsBadgeCount: number;
  heroesBadge: boolean;
  shopBadgeCount: number;
  passBadge: boolean;
  onSelectTab: (tab: BottomTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  missionsBadgeCount,
  heroesBadge,
  shopBadgeCount,
  passBadge,
  onSelectTab,
}) => {
  return (
    <nav className="ar-bottom-dock interactive" aria-label="Navigation principale">
      <div className="ar-dock-tray">
        <button
          type="button"
          className={`ar-dock-tab ${activeTab === 'missions' ? 'active' : ''}`}
          onClick={() => onSelectTab('missions')}
          data-testid="nav-missions"
        >
          {missionsBadgeCount > 0 && (
            <span className="ar-diamond-badge tabular">{missionsBadgeCount}</span>
          )}
          <span className="ar-dock-icon">
            <AchievementIcon size={23} />
          </span>
          <span className="ar-dock-label">MISSIONS</span>
        </button>

        <button
          type="button"
          className={`ar-dock-tab ${activeTab === 'heroes' ? 'active' : ''}`}
          onClick={() => onSelectTab('heroes')}
          data-testid="nav-heroes"
        >
          {heroesBadge && <span className="ar-diamond-badge">!</span>}
          <span className="ar-dock-icon">
            <HeroIcon size={23} />
          </span>
          <span className="ar-dock-label">MON</span>
        </button>

        <button
          type="button"
          className={`ar-dock-tab ${activeTab === 'shop' ? 'active' : ''}`}
          onClick={() => onSelectTab('shop')}
          data-testid="nav-shop"
        >
          {shopBadgeCount > 0 && (
            <span className="ar-diamond-badge tabular">{shopBadgeCount}</span>
          )}
          <span className="ar-dock-icon">
            <CartIcon size={22} />
          </span>
          <span className="ar-dock-label">BOUTIQUE</span>
        </button>

        <button
          type="button"
          className={`ar-dock-tab ${activeTab === 'pass' ? 'active' : ''}`}
          onClick={() => onSelectTab('pass')}
          data-testid="nav-pass"
        >
          {passBadge && <span className="ar-diamond-badge">!</span>}
          <span className="ar-dock-icon">
            <PassIcon size={23} />
          </span>
          <span className="ar-dock-label">PASS</span>
        </button>
      </div>
    </nav>
  );
};
