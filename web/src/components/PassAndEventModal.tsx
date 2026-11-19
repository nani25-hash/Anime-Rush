import React, { useEffect, useState } from 'react';
import { EVENT_MILESTONES, SEASON_TIERS } from '../config/catalog';
import { PlayerProfile } from '../types/game';
import { ChestIcon, CloseIcon, CoinIcon, GemIcon, PassIcon, SakuraIcon } from './Icons';

interface PassAndEventModalProps {
  mode: 'pass' | 'event';
  profile: PlayerProfile;
  onClaimSeasonTier: (tier: number) => void;
  onClaimEventMilestone: (milestoneId: string) => void;
  onClaimFreeChest: () => void;
  onShowToast: (msg: string) => void;
  onClose: () => void;
}

function formatCountdown(msRemaining: number): string {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':');
}

export const PassAndEventModal: React.FC<PassAndEventModalProps> = ({
  mode,
  profile,
  onClaimSeasonTier,
  onClaimEventMilestone,
  onClaimFreeChest,
  onShowToast,
  onClose,
}) => {
  const [tab, setTab] = useState<'pass' | 'event'>(mode);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setTab(mode);
  }, [mode]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const maxTier = SEASON_TIERS.length;
  const currentTier = Math.min(maxTier, Math.max(1, profile.seasonLevel));
  const isMaxTier = currentTier >= maxTier;
  const displayXp = isMaxTier ? 100 : Math.min(100, Math.max(0, profile.seasonXp));

  const chestRemainingMs = Math.max(0, profile.nextFreeChestAt - nowMs);
  const chestReady = chestRemainingMs === 0;

  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()} data-testid={`${tab}-modal`}>
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">
              {tab === 'pass'
                ? 'SAISON 1 · ESPRITS DU JAPON'
                : 'ÉVÉNEMENT · COURSE DES SAKURA'}
            </h2>
            <p className="sheet-sub">
              {tab === 'pass'
                ? isMaxTier
                  ? `Palier Max ${currentTier} / ${maxTier} atteint · Coffre & Récompenses`
                  : `Palier ${currentTier} / ${maxTier} · ${displayXp}/100 XP vers le palier suivant`
                : `Collectez des jetons roses sur les rails (${profile.eventSakuraTokens} jetons)`}
            </p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet-tabs" role="tablist" aria-label="Pass Saison et Événement">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pass'}
            className={`sheet-tab ${tab === 'pass' ? 'active' : ''}`}
            onClick={() => setTab('pass')}
            data-testid="pass-tab-season"
          >
            PASS &amp; COFFRE
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'event'}
            className={`sheet-tab ${tab === 'event' ? 'active' : ''}`}
            onClick={() => setTab('event')}
            data-testid="pass-tab-event"
          >
            COURSE DES SAKURA
          </button>
        </div>

        <div className="sheet-scroll">
          {tab === 'pass' ? (
            <div className="cards-list">
              {/* Free Chest moved into Pass as requested */}
              <div
                className={`shop-row-card pass-chest-card ${chestReady ? 'highlight-card' : ''}`}
                data-testid="pass-free-chest-card"
              >
                <div className="shop-icon-box" style={{ background: '#1d4ed833' }}>
                  <ChestIcon size={30} />
                </div>
                <div className="shop-info" style={{ flex: 1 }}>
                  <div className="shop-name-row">
                    <span className="shop-name">Coffre Gratuit du Dojo</span>
                    <span className="tag-pill tabular">
                      {chestReady ? 'PRÊT' : formatCountdown(chestRemainingMs)}
                    </span>
                  </div>
                  <p className="shop-desc">
                    Contient des pièces, +12 gemmes et +180 XP de compte toutes les 4h.
                  </p>
                </div>
                <button
                  type="button"
                  className={chestReady ? 'action-btn-gold' : 'action-btn-muted'}
                  onClick={() =>
                    chestReady
                      ? onClaimFreeChest()
                      : onShowToast(`Coffre gratuit prêt dans ${formatCountdown(chestRemainingMs)}`)
                  }
                  data-testid="free-chest-btn"
                >
                  {chestReady ? 'OUVRIR !' : formatCountdown(chestRemainingMs)}
                </button>
              </div>

              <div className="season-summary-banner">
                <div className="season-summary-left">
                  <PassIcon size={28} />
                  <div>
                    <strong>
                      Palier actuel : {currentTier} / {maxTier}
                    </strong>
                    <p className="shop-desc">
                      {isMaxTier
                        ? 'Félicitations ! Tous les paliers de la Saison 1 sont débloqués.'
                        : 'Courez et validez vos missions pour monter en palier.'}
                    </p>
                  </div>
                </div>
                <div className="progress-track" style={{ marginTop: 8 }}>
                  <div className="progress-fill" style={{ width: `${displayXp}%` }} />
                  <span className="tabular">
                    {isMaxTier ? 'PALIER MAX (10 / 10)' : `${displayXp} / 100 XP`}
                  </span>
                </div>
              </div>

              {SEASON_TIERS.map((tierInfo) => {
                const reached = currentTier >= tierInfo.tier;
                const claimed = profile.claimedSeasonTiers.includes(tierInfo.tier);
                const claimable = reached && !claimed;

                return (
                  <div
                    key={tierInfo.tier}
                    className={`shop-row-card ${claimable ? 'highlight-card' : ''}`}
                  >
                    <div className="tier-badge tabular">#{tierInfo.tier}</div>
                    <div className="shop-info">
                      <div className="shop-name-row">
                        <span className="shop-name">{tierInfo.title}</span>
                        {tierInfo.bonusLabel && (
                          <span className="tag-pill">{tierInfo.bonusLabel}</span>
                        )}
                      </div>
                      <div className="reward-inline">
                        {tierInfo.coinsReward > 0 && (
                          <span className="reward-chip tabular">
                            <CoinIcon size={13} /> +{tierInfo.coinsReward}
                          </span>
                        )}
                        <span className="reward-chip tabular">
                          <GemIcon size={13} /> +{tierInfo.gemsReward}
                        </span>
                      </div>
                    </div>

                    {claimed ? (
                      <span className="status-equipped">RÉCLAMÉ</span>
                    ) : (
                      <button
                        type="button"
                        className={claimable ? 'action-btn-gold' : 'action-btn-muted'}
                        disabled={!claimable}
                        onClick={() => onClaimSeasonTier(tierInfo.tier)}
                        data-testid={`claim-tier-${tierInfo.tier}`}
                      >
                        {claimable ? 'RÉCLAMER' : `NIV. ${tierInfo.tier}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cards-list">
              <div className="event-summary-banner">
                <SakuraIcon size={32} />
                <div>
                  <strong className="tabular">
                    {profile.eventSakuraTokens} Jetons Sakura collectés
                  </strong>
                  <p className="shop-desc">
                    Attrapez les cristaux Sakura roses flottants sur les rails pour débloquer la carte mythique !
                  </p>
                </div>
              </div>

              {EVENT_MILESTONES.map((ms) => {
                const current = Math.min(ms.requiredTokens, profile.eventSakuraTokens);
                const claimed = profile.claimedEventMilestones.includes(ms.id);
                const ready = !claimed && profile.eventSakuraTokens >= ms.requiredTokens;
                const pct = Math.min(100, Math.round((current / ms.requiredTokens) * 100));

                return (
                  <div key={ms.id} className={`shop-row-card ${ready ? 'highlight-card' : ''}`}>
                    <div className="shop-info" style={{ flex: 1 }}>
                      <div className="shop-name-row">
                        <span className="shop-name">{ms.title}</span>
                        {ms.bonusCard && <span className="tag-pill">CARTE MYTHIQUE</span>}
                      </div>
                      <div className="reward-inline">
                        <span className="reward-chip tabular">
                          <CoinIcon size={13} /> +{ms.rewardCoins}
                        </span>
                        <span className="reward-chip tabular">
                          <GemIcon size={13} /> +{ms.rewardGems}
                        </span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill sakura-fill" style={{ width: `${pct}%` }} />
                        <span className="tabular">
                          {current} / {ms.requiredTokens} jetons
                        </span>
                      </div>
                    </div>

                    {claimed ? (
                      <span className="status-equipped">RÉCLAMÉ</span>
                    ) : (
                      <button
                        type="button"
                        className={ready ? 'action-btn-gold' : 'action-btn-muted'}
                        disabled={!ready}
                        onClick={() => onClaimEventMilestone(ms.id)}
                        data-testid={`claim-event-${ms.id}`}
                      >
                        {ready ? 'RÉCLAMER' : 'VERROUILLÉ'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
