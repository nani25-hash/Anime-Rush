import React, { useEffect, useMemo, useState } from 'react';
import { getHeroById } from '../config/catalog';
import { LeaderboardEntry, PlayerProfile, SocialBundle } from '../types/game';
import { CloseIcon, CoinIcon, GemIcon, TrophyIcon } from './Icons';

interface SocialHubModalProps {
  initialTab: 'leaderboard' | 'friends' | 'inbox';
  profile: PlayerProfile;
  social: SocialBundle;
  searchResults: LeaderboardEntry[];
  onRefreshLeaderboard: () => void;
  onSearchPlayers: (query: string) => void;
  onSendFriendRequest: (entry: LeaderboardEntry) => void;
  onAcceptRequest: (
    requestId: string,
    fromUid: string,
    fromDisplayName: string,
    fromLevel: number,
  ) => void;
  onDeclineRequest: (requestId: string) => void;
  onRemoveFriend: (friendUid: string) => void;
  onSendGift: (friendUid: string) => void;
  onClaimInbox: (messageId: string) => void;
  onClaimAllInbox: () => void;
  onClose: () => void;
}

export const SocialHubModal: React.FC<SocialHubModalProps> = ({
  initialTab,
  profile,
  social,
  searchResults,
  onRefreshLeaderboard,
  onSearchPlayers,
  onSendFriendRequest,
  onAcceptRequest,
  onDeclineRequest,
  onRemoveFriend,
  onSendGift,
  onClaimInbox,
  onClaimAllInbox,
  onClose,
}) => {
  const [tab, setTab] = useState<'leaderboard' | 'friends' | 'inbox'>(initialTab);
  const [lbFilter, setLbFilter] = useState<'global' | 'friends'>('global');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (tab === 'leaderboard') {
      onRefreshLeaderboard();
    } else if (tab === 'friends') {
      onSearchPlayers('');
    }
  }, [tab, onRefreshLeaderboard, onSearchPlayers]);

  const friendUidSet = useMemo(
    () => new Set(social.friends.map((f) => f.friendUid)),
    [social.friends],
  );

  const displayedLeaderboard = useMemo(() => {
    if (lbFilter === 'global') return social.leaderboard;
    return social.leaderboard.filter(
      (entry) => entry.uid === profile.uid || friendUidSet.has(entry.uid),
    );
  }, [social.leaderboard, lbFilter, friendUidSet, profile.uid]);

  const incomingRequests = useMemo(
    () => social.friendRequests.filter((r) => r.toUid === profile.uid && r.status === 'pending'),
    [social.friendRequests, profile.uid],
  );

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
              {tab === 'leaderboard'
                ? 'CLASSEMENT MONDIAL'
                : tab === 'friends'
                  ? 'AMIS & RIVALITÉS'
                  : 'MESSAGERIE & CADEAUX'}
            </h2>
            <p className="sheet-sub">
              {tab === 'leaderboard'
                ? 'Top 30 des meilleurs coureurs Anime Rush'
                : tab === 'friends'
                  ? `${social.friends.length} ami(s) connecté(s) sur Firebase`
                  : 'Récupérez vos récompenses et cadeaux d’amis'}
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
            className={`sheet-tab ${tab === 'friends' ? 'active' : ''}`}
            onClick={() => setTab('friends')}
          >
            AMIS {incomingRequests.length > 0 ? `(${incomingRequests.length})` : ''}
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
              <div className="inline-filter-row">
                <button
                  type="button"
                  className={`filter-chip ${lbFilter === 'global' ? 'active' : ''}`}
                  onClick={() => setLbFilter('global')}
                >
                  TOP MONDIAL
                </button>
                <button
                  type="button"
                  className={`filter-chip ${lbFilter === 'friends' ? 'active' : ''}`}
                  onClick={() => setLbFilter('friends')}
                >
                  AMIS ({social.friends.length + 1})
                </button>
              </div>

              {displayedLeaderboard.length === 0 ? (
                <div className="empty-state">Aucun score enregistré dans ce classement.</div>
              ) : (
                displayedLeaderboard.map((entry, idx) => {
                  const isMe = entry.uid === profile.uid;
                  const isFriend = friendUidSet.has(entry.uid);
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
                      {!isMe && !isFriend && (
                        <button
                          type="button"
                          className="action-btn-primary"
                          onClick={() => onSendFriendRequest(entry)}
                        >
                          + AMI
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'friends' && (
            <div className="cards-list">
              {/* Incoming friend requests */}
              {incomingRequests.length > 0 && (
                <div className="subsection-block">
                  <h3 className="subsection-title">DEMANDES REÇUES ({incomingRequests.length})</h3>
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="shop-row-card highlight-card">
                      <div className="shop-info" style={{ flex: 1 }}>
                        <span className="shop-name">{req.fromDisplayName}</span>
                        <span className="shop-desc tabular">Niveau {req.fromLevel}</span>
                      </div>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="action-btn-gold"
                          onClick={() =>
                            onAcceptRequest(
                              req.id,
                              req.fromUid,
                              req.fromDisplayName,
                              req.fromLevel,
                            )
                          }
                        >
                          ACCEPTER
                        </button>
                        <button
                          type="button"
                          className="action-btn-muted"
                          onClick={() => onDeclineRequest(req.id)}
                        >
                          REFUSER
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Friends list */}
              <div className="subsection-block">
                <h3 className="subsection-title">MES AMIS ({social.friends.length})</h3>
                {social.friends.length === 0 ? (
                  <div className="empty-state">
                    Pas encore d’amis. Recherchez un pseudo ci-dessous pour en ajouter !
                  </div>
                ) : (
                  social.friends.map((friend) => (
                    <div key={friend.friendUid} className="shop-row-card">
                      <div className="shop-info" style={{ flex: 1 }}>
                        <div className="shop-name-row">
                          <span className="shop-name">{friend.displayName}</span>
                          <span className="tag-pill tabular">Lv.{friend.level}</span>
                        </div>
                        <span className="shop-desc tabular">
                          Record : {friend.bestScore.toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="action-btn-gold"
                          onClick={() => onSendGift(friend.friendUid)}
                        >
                          CADEAU
                        </button>
                        <button
                          type="button"
                          className="action-btn-muted"
                          onClick={() => onRemoveFriend(friend.friendUid)}
                        >
                          SUPPR.
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Search players */}
              <div className="subsection-block">
                <h3 className="subsection-title">AJOUTER UN JOUEUR</h3>
                <form
                  className="search-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSearchPlayers(searchText);
                  }}
                >
                  <input
                    type="text"
                    className="text-input"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Pseudo du coureur..."
                  />
                  <button type="submit" className="action-btn-primary">
                    CHERCHER
                  </button>
                </form>

                {searchResults.map((player) => {
                  const alreadyFriend = friendUidSet.has(player.uid);
                  return (
                    <div key={player.uid} className="shop-row-card">
                      <div className="shop-info" style={{ flex: 1 }}>
                        <div className="shop-name-row">
                          <span className="shop-name">{player.displayName}</span>
                          <span className="tag-pill tabular">Lv.{player.level}</span>
                        </div>
                        <span className="shop-desc tabular">
                          {player.bestScore.toLocaleString('fr-FR')} pts
                        </span>
                      </div>
                      {alreadyFriend ? (
                        <span className="status-equipped">AMI</span>
                      ) : (
                        <button
                          type="button"
                          className="action-btn-primary"
                          onClick={() => onSendFriendRequest(player)}
                        >
                          AJOUTER
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
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
