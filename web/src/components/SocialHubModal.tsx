import React, { useEffect, useMemo, useState } from 'react';
import { getHeroById } from '../config/catalog';
import { PlayerProfile, SocialBundle } from '../types/game';
import { CloseIcon, CoinIcon, GemIcon, TrophyIcon } from './Icons';

interface SocialHubModalProps {
  initialTab: 'leaderboard' | 'inbox';
  profile: PlayerProfile;
  social: SocialBundle;
  onRefreshLeaderboard: () => void;
  onClaimInbox: (messageId: string) => void;
  onClaimAllInbox: () => void;
  onClose: () => void;
}

export const SocialHubModal: React.FC<SocialHubModalProps> = ({
  initialTab,
  profile,
  social,
  onRefreshLeaderboard,
  onClaimInbox,
  onClaimAllInbox,
  onClose,
}) => {
  const [tab, setTab] = useState<'leaderboard' | 'inbox'>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (tab === 'leaderboard') {
      onRefreshLeaderboard();
    }
  }, [tab, onRefreshLeaderboard]);

  const unclaimedCount = useMemo(
    () => social.inbox.filter((m) => !m.claimed).length,
    [social.inbox],
  );

  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()} data-testid="social-modal">
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">
              {tab === 'leaderboard' ? 'CLASSEMENT LOCAL' : 'MESSAGERIE & CADEAUX'}
            </h2>
            <p className="sheet-sub">
              {tab === 'leaderboard'
                ? 'Votre record personnel enregistré sur cet appareil'
                : 'Récupérez vos récompenses et bonus du Dojo'}
            </p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet-tabs">
          <button
            type="button"
            className={`sheet-tab ${tab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setTab('leaderboard')}
          >
            CLASSEMENT
          </button>
          <button
            type="button"
            className={`sheet-tab ${tab === 'inbox' ? 'active' : ''}`}
            onClick={() => setTab('inbox')}
          >
            MESSAGES {unclaimedCount > 0 ? `(${unclaimedCount})` : ''}
          </button>
        </div>

        <div className="sheet-scroll">
          {tab === 'leaderboard' && (
            <div className="cards-list">
              {social.leaderboard.length === 0 ? (
                <div className="empty-state">Aucun score enregistré sur cet appareil.</div>
              ) : (
                social.leaderboard.map((entry, idx) => {
                  const isMe = entry.uid === profile.uid;
                  const hero = getHeroById(entry.equippedHeroId);

                  return (
                    <div
                      key={entry.uid}
                      className={`shop-row-card ${isMe ? 'highlight-card' : ''}`}
                    >
                      <div className="rank-badge tabular">
                        {idx < 3 ? <TrophyIcon size={16} /> : null}
                        <span>#{idx + 1}</span>
                      </div>
                      <div className="shop-info" style={{ flex: 1 }}>
                        <div className="shop-name-row">
                          <span className="shop-name">
                            {entry.displayName} {isMe ? '(Toi)' : ''}
                          </span>
                          <span className="tag-pill tabular">Lv.{entry.level}</span>
                        </div>
                        <span className="shop-desc">
                          {hero.name} · Record :{' '}
                          <strong className="tabular">
                            {entry.bestScore.toLocaleString('fr-FR')} pts
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'inbox' && (
            <div className="cards-list">
              {unclaimedCount > 1 && (
                <button
                  type="button"
                  className="action-btn-gold"
                  style={{ width: '100%', padding: '12px' }}
                  onClick={onClaimAllInbox}
                  data-testid="claim-all-inbox"
                >
                  TOUT RÉCLAMER ({unclaimedCount})
                </button>
              )}

              {social.inbox.length === 0 ? (
                <div className="empty-state">Votre messagerie est vide pour le moment.</div>
              ) : (
                social.inbox.map((msg) => (
                  <div
                    key={msg.id}
                    className={`shop-row-card ${!msg.claimed ? 'highlight-card' : ''}`}
                  >
                    <div className="shop-info" style={{ flex: 1 }}>
                      <div className="shop-name-row">
                        <span className="shop-name">{msg.title}</span>
                        <span className="tag-pill">{msg.senderName}</span>
                      </div>
                      <p className="shop-desc">{msg.body}</p>
                      {(msg.rewardCoins > 0 || msg.rewardGems > 0) && (
                        <div className="reward-inline">
                          {msg.rewardCoins > 0 && (
                            <span className="reward-chip tabular">
                              <CoinIcon size={13} /> +{msg.rewardCoins}
                            </span>
                          )}
                          {msg.rewardGems > 0 && (
                            <span className="reward-chip tabular">
                              <GemIcon size={13} /> +{msg.rewardGems}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {msg.claimed ? (
                      <span className="status-equipped">RÉCLAMÉ</span>
                    ) : (
                      <button
                        type="button"
                        className="action-btn-gold"
                        onClick={() => onClaimInbox(msg.id)}
                        data-testid={`claim-msg-${msg.id}`}
                      >
                        RÉCLAMER
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
