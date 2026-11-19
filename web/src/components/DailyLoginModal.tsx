import React from 'react';
import { DAILY_LOGIN_REWARDS } from '../config/catalog';
import { LoginRewardResult, PlayerProfile, getTodayUtcKey } from '../types/game';
import { ChestIcon, CloseIcon, CoinIcon, GemIcon, SakuraIcon } from './Icons';

interface DailyLoginModalProps {
  profile: PlayerProfile;
  loginReward: LoginRewardResult | null;
  onClaim: () => void;
  onClearReward: () => void;
  onClose: () => void;
}

export const DailyLoginModal: React.FC<DailyLoginModalProps> = ({
  profile,
  loginReward,
  onClaim,
  onClearReward,
  onClose,
}) => {
  const todayKey = getTodayUtcKey();
  const canClaimToday = profile.loginLastClaimKey !== todayKey;
  const currentStreak = Math.max(0, Math.min(7, profile.loginStreakDay || 0));
  const nextClaimDay = currentStreak <= 0 || currentStreak >= 7 ? 1 : currentStreak + 1;

  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div
        className="sheet-card"
        onClick={(e) => e.stopPropagation()}
        data-testid="daily-login-modal"
      >
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">CALENDRIER 7 JOURS</h2>
            <p className="sheet-sub">
              Série actuelle : Jour {canClaimToday ? Math.max(0, nextClaimDay - 1) : currentStreak} / 7
            </p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet-balance-bar">
          <span className="balance-pill tabular">
            <CoinIcon size={16} /> {profile.coins.toLocaleString('fr-FR')}
          </span>
          <span className="balance-pill tabular">
            <GemIcon size={16} /> {profile.gems.toLocaleString('fr-FR')}
          </span>
          <span className="balance-pill tabular">
            <SakuraIcon size={16} /> {profile.eventSakuraTokens}
          </span>
        </div>

        <div className="sheet-scroll">
          {loginReward && (
            <div className="login-reward-banner" data-testid="login-reward-banner">
              <div className="login-reward-head">
                <ChestIcon size={26} />
                <div>
                  <strong>{loginReward.title}</strong>
                  <p className="shop-desc">{loginReward.summary}</p>
                </div>
              </div>
              <button type="button" className="action-btn-gold" onClick={onClearReward}>
                SUPER !
              </button>
            </div>
          )}

          <div className="login-days-grid">
            {DAILY_LOGIN_REWARDS.map((def) => {
              const isClaimed = canClaimToday
                ? currentStreak < 7 && def.day < nextClaimDay
                : def.day <= currentStreak;
              const isTodayTarget = canClaimToday && def.day === nextClaimDay;

              return (
                <div
                  key={def.day}
                  className={`login-day-card ${def.isGrand ? 'grand' : ''} ${
                    isClaimed ? 'claimed' : ''
                  } ${isTodayTarget ? 'claimable' : ''}`}
                  style={{ '--day-accent': def.accent } as React.CSSProperties}
                >
                  <div className="login-day-top">
                    <span className="login-day-num tabular">JOUR {def.day}</span>
                    {isClaimed && <span className="tag-pill">REÇU ✓</span>}
                    {isTodayTarget && <span className="tag-pill ready-pill">DISPO</span>}
                  </div>
                  <strong className="login-day-title">{def.title.replace(/^Jour \d+ · /, '')}</strong>
                  <p className="login-day-summary">{def.summary}</p>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className={`play-cta ${canClaimToday ? '' : 'disabled'}`}
            disabled={!canClaimToday}
            onClick={onClaim}
            data-testid="claim-daily-login-btn"
            style={{ width: '100%', marginTop: 12 }}
          >
            {canClaimToday ? `RÉCLAMER LE JOUR ${nextClaimDay}` : 'REVIENS DEMAIN !'}
          </button>
        </div>
      </div>
    </div>
  );
};
