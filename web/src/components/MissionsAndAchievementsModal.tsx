import React, { useEffect, useMemo, useState } from 'react';
import { ACHIEVEMENTS_CATALOG, MISSIONS_CATALOG } from '../config/catalog';
import { PlayerProfile } from '../types/game';
import { CloseIcon, CoinIcon, GemIcon } from './Icons';

export type MissionsSheetTab = 'daily' | 'weekly' | 'achievements';

interface MissionsAndAchievementsModalProps {
  initialTab?: MissionsSheetTab;
  profile: PlayerProfile;
  onClaimMission: (missionId: string) => void;
  onClaimAchievement: (achievementId: string) => void;
  onClose: () => void;
}

export const MissionsAndAchievementsModal: React.FC<MissionsAndAchievementsModalProps> = ({
  initialTab = 'daily',
  profile,
  onClaimMission,
  onClaimAchievement,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<MissionsSheetTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const dailyReadyCount = useMemo(
    () =>
      MISSIONS_CATALOG.filter(
        (m) => m.scope === 'daily' && !m.isClaimed(profile) && m.getProgress(profile) >= m.target,
      ).length,
    [profile],
  );
  const weeklyReadyCount = useMemo(
    () =>
      MISSIONS_CATALOG.filter(
        (m) => m.scope === 'weekly' && !m.isClaimed(profile) && m.getProgress(profile) >= m.target,
      ).length,
    [profile],
  );
  const achievementsReadyCount = useMemo(
    () =>
      ACHIEVEMENTS_CATALOG.filter(
        (a) => !profile.claimedAchievementIds.includes(a.id) && a.getCurrent(profile) >= a.target,
      ).length,
    [profile],
  );

  const visibleMissions = useMemo(
    () => MISSIONS_CATALOG.filter((m) => m.scope === activeTab),
    [activeTab],
  );

  const title =
    activeTab === 'daily'
      ? 'MISSIONS JOURNALIÈRES'
      : activeTab === 'weekly'
        ? 'MISSIONS HEBDOMADAIRES'
        : 'SUCCÈS NINJA';

  const subtitle =
    activeTab === 'achievements'
      ? 'Relevez des défis permanents pour débloquer des gemmes'
      : 'Gagnez des pièces, des gemmes et de l’XP Saison 1';

  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div
        className="sheet-card"
        onClick={(e) => e.stopPropagation()}
        data-testid={activeTab === 'achievements' ? 'achievements-modal' : 'missions-modal'}
      >
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">{title}</h2>
            <p className="sheet-sub">{subtitle}</p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet-tabs" role="tablist" aria-label="Missions et Succès">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'daily'}
            className={`sheet-tab mission-scope-tab ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
            data-testid="mission-tab-daily"
          >
            <span>Journalières</span>
            {dailyReadyCount > 0 && (
              <span className="mission-tab-badge tabular">{dailyReadyCount}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'weekly'}
            className={`sheet-tab mission-scope-tab ${activeTab === 'weekly' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekly')}
            data-testid="mission-tab-weekly"
          >
            <span>Hebdo</span>
            {weeklyReadyCount > 0 && (
              <span className="mission-tab-badge tabular">{weeklyReadyCount}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'achievements'}
            className={`sheet-tab mission-scope-tab ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => setActiveTab('achievements')}
            data-testid="mission-tab-achievements"
          >
            <span>Succès</span>
            {achievementsReadyCount > 0 && (
              <span className="mission-tab-badge tabular">{achievementsReadyCount}</span>
            )}
          </button>
        </div>

        <div className="sheet-scroll">
          {activeTab !== 'achievements' ? (
            <div className="cards-list" data-testid={`missions-page-${activeTab}`}>
              {visibleMissions.map((m) => {
                const current = Math.min(m.target, m.getProgress(profile));
                const claimed = m.isClaimed(profile);
                const ready = !claimed && current >= m.target;
                const pct = Math.min(100, Math.round((current / m.target) * 100));

                return (
                  <div key={m.id} className="shop-row-card">
                    <div className="shop-info" style={{ flex: 1 }}>
                      <div className="shop-name-row">
                        <span className="tag-pill">
                          {m.scope === 'daily' ? 'JOURNALIÈRE' : 'HEBDO'}
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
            <div className="cards-list" data-testid="missions-page-achievements">
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
