import React from 'react';
import { EVENT_MILESTONES, SEASON_TIERS } from '../config/catalog';
import { PlayerProfile } from '../types/game';
import { CloseIcon, CoinIcon, GemIcon, PassIcon, SakuraIcon } from './Icons';

interface PassAndEventModalProps {
  mode: 'pass' | 'event';
  profile: PlayerProfile;
  onClaimSeasonTier: (tier: number) => void;
  onClaimEventMilestone: (milestoneId: string) => void;
  onClose: () => void;
}

export const PassAndEventModal: React.FC<PassAndEventModalProps> = ({
  mode,
  profile,
  onClaimSeasonTier,
  onClaimEventMilestone,
  onClose,
}) => {
  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()} data-testid={`${mode}-modal`}>
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">
              {mode === 'pass'
                ? 'SAISON 1 · ESPRITS DU JAPON'
                : 'ÉVÉNEMENT · COURSE DES SAKURA'}
            </h2>
            <p className="sheet-sub">
              {mode === 'pass'
                ? `Niveau de Saison ${profile.seasonLevel} · ${profile.seasonXp}/100 XP vers le palier suivant`
                : `Collectez des jetons roses sur les rails (${profile.eventSakuraTokens} jetons)`}
            </p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet-scroll">
          {mode === 'pass' ? (
            <div className="cards-list">
              <div className="season-summary-banner">
                <div className="season-summary-left">
                  <PassIcon size={28} />
                  <div>
                    <strong>Palier actuel : {profile.seasonLevel} / 10</strong>
                    <p className="shop-desc">Courez et validez vos missions pour monter en palier.</p>
                  </div>
                </div>
                <div className="progress-track" style={{ marginTop: 8 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, profile.seasonXp)}%` }}
                  />
                  <span className="tabular">{profile.seasonXp} / 100 XP</span>
                </div>
              </div>

              {SEASON_TIERS.map((tierInfo) => {
                const reached = profile.seasonLevel >= tierInfo.tier;
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
