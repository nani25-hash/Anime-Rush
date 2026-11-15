import React from 'react';
import { BottomTab } from '../types/game';
import { CartIcon, HeroIcon, HomeIcon, PassIcon, RunnerIcon } from './Icons';

interface BottomNavBarProps {
  activeTab: BottomTab;
  passBadge: boolean;
  onSelectTab: (tab: BottomTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  passBadge,
  onSelectTab,
}) => {
  return (
    <nav className="bottom-nav interactive" aria-label="Navigation principale">
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onSelectTab('home')}
        data-testid="nav-home"
      >
        <HomeIcon size={21} />
        <span>ACCUEIL</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'heroes' ? 'active' : ''}`}
        onClick={() => onSelectTab('heroes')}
        data-testid="nav-heroes"
      >
        <HeroIcon size={21} />
        <span>PERSONNAGES</span>
      </button>

      <button
        type="button"
        className="bottom-nav-play"
        onClick={() => onSelectTab('play')}
        data-testid="nav-play"
        aria-label="Jouer"
      >
        <div className="bottom-nav-play-inner">
          <RunnerIcon size={24} />
        </div>
        <span>JOUER</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'shop' ? 'active' : ''}`}
        onClick={() => onSelectTab('shop')}
        data-testid="nav-shop"
      >
        <CartIcon size={21} />
        <span>BOUTIQUE</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'pass' ? 'active' : ''}`}
        onClick={() => onSelectTab('pass')}
        data-testid="nav-pass"
      >
        <div className="nav-icon-wrap">
          <PassIcon size={21} />
          {passBadge && <span className="notif-dot">!</span>}
        </div>
        <span>PASS</span>
      </button>
    </nav>
  );
};
