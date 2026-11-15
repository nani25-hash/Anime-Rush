import React from 'react';
import { ACHIEVEMENTS_CATALOG, MISSIONS_CATALOG } from '../config/catalog';
import { PlayerProfile } from '../types/game';
import { CloseIcon, CoinIcon, GemIcon } from './Icons';

interface MissionsAndAchievementsModalProps {
  mode: 'missions' | 'achievements';
  profile: PlayerProfile;
  onClaimMission: (missionId: string) => void;
  onClaimAchievement: (achievementId: string) => void;
  onClose: () => void;
}

export const MissionsAndAchievementsModal: React.FC<MissionsAndAchievementsModalProps> = ({
  mode,
  profile,
  onClaimMission,
  onClaimAchievement,
  onClose,
}) => {
  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()} data-testid={`${mode}-modal`}>
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">
              {mode === 'missions' ? 'MISSIONS DU JOUR & HEBDO' : 'SUCCÈS NINJA'}
            </h2>
            <p className="sheet-sub">
              {mode === 'missions'
                ? 'Gagnez des pièces, des gemmes et de l’XP Saison 1'
                : 'Relevez des défis permanents pour débloquer des gemmes'}
            </p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet-scroll">
          {mode === 'missions' ? (
            <div className="cards-list">
              {MISSIONS_CATALOG.map((m) => {
                const current = Math.min(m.target, m.getProgress(profile));
                const claimed = m.isClaimed(profile);
                const ready = !claimed && current >= m.target;
                const pct = Math.min(100, Math.round((current / m.target) * 100));

                return (
                  <div key={m.id} className="shop-row-card">
                    <div className="shop-info" style={{ flex: 1 }}>
                      <div className="shop-name-row">
                        <span className="tag-pill">
                          {m.scope === 'daily' ? 'QUOTIDIENNE' : 'HEBDO'}
                        </span>
                        <span className="shop-name">{m.title}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                        <span className="tabular">
                          {current.toLocaleString('fr-FR')} / {m.target.toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    {claimed ? (
                      <span className="status-equipped">RÉCLAMÉE</span>
                    ) : (
                      <button
                        type="button"
                        className={ready ? 'action-btn-gold' : 'action-btn-muted'}
                        disabled={!ready}
                        onClick={() => onClaimMission(m.id)}
                      >
                        {m.rewardKind === 'coins' ? <CoinIcon size={14} /> : <GemIcon size={14} />}
                        <span className="tabular">{ready ? 'RÉCLAMER' : m.rewardLabel}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cards-list">
              {ACHIEVEMENTS_CATALOG.map((ach) => {
                const current = Math.min(ach.target, ach.getCurrent(profile));
                const claimed = profile.claimedAchievementIds.includes(ach.id);
                const ready = !claimed && current >= ach.target;
                const pct = Math.min(100, Math.round((current / ach.target) * 100));

                return (
                  <div key={ach.id} className="shop-row-card">
                    <div className="shop-info" style={{ flex: 1 }}>
                      <div className="shop-name-row">
                        <span className="shop-name">{ach.title}</span>
                        <span className="tag-pill tabular">+{ach.rewardGems} gemmes</span>
                      </div>
                      <p className="shop-desc">{ach.description}</p>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                        <span className="tabular">
                          {current.toLocaleString('fr-FR')} / {ach.target.toLocaleString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    {claimed ? (
                      <span className="status-equipped">ACQUIS</span>
                    ) : (
                      <button
                        type="button"
                        className={ready ? 'action-btn-gold' : 'action-btn-muted'}
                        disabled={!ready}
                        onClick={() => onClaimAchievement(ach.id)}
                      >
                        {ready ? 'RÉCLAMER' : 'EN COURS'}
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
