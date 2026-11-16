import React, { useEffect, useMemo, useState } from 'react';
import {
  ACHIEVEMENTS_CATALOG,
  COLLECTION_CARDS,
  EVENT_MILESTONES,
  MISSIONS_CATALOG,
} from '../config/catalog';
import { ActiveModal, ActiveRunBoosts, PlayerProfile, SocialBundle } from '../types/game';
import {
  AchievementIcon,
  ChestIcon,
  CollectionIcon,
  FriendsIcon,
  InventoryIcon,
  MailIcon,
  MissionsIcon,
  PlayIcon,
  SakuraIcon,
  TrophyIcon,
} from './Icons';

interface LobbyOverlayProps {
  profile: PlayerProfile;
  social: SocialBundle;
  selectedBoosts: ActiveRunBoosts;
  onStartRun: () => void;
  onClaimFreeChest: () => void;
  onShowToast: (msg: string) => void;
  onOpenModal: (modal: ActiveModal) => void;
}

function formatCountdown(msRemaining: number): string {
  const totalSec = Math.max(0, Math.floor(msRemaining / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':');
}

export const LobbyOverlay: React.FC<LobbyOverlayProps> = ({
  profile,
  social,
  selectedBoosts,
  onStartRun,
  onClaimFreeChest,
  onShowToast,
  onOpenModal,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const chestRemainingMs = Math.max(0, profile.nextFreeChestAt - nowMs);
  const chestReady = chestRemainingMs === 0;

  const multRemainingMs = Math.max(0, profile.multiplierExpiresAt - nowMs);
  const multiplierActive = profile.activeMultiplier > 1 && multRemainingMs > 0;
  const displayMultiplier = selectedBoosts.useMultiplier
    ? 5
    : multiplierActive
      ? profile.activeMultiplier
      : 1;

  const unreadInboxCount = useMemo(
    () => social.inbox.filter((m) => !m.claimed || !m.read).length,
    [social.inbox],
  );
  const incomingFriendRequestsCount = useMemo(
    () => social.friendRequests.filter((r) => r.toUid === profile.uid && r.status === 'pending').length,
    [social.friendRequests, profile.uid],
  );
  const claimableAchievementsCount = useMemo(
    () =>
      ACHIEVEMENTS_CATALOG.filter(
        (a) => !profile.claimedAchievementIds.includes(a.id) && a.getCurrent(profile) >= a.target,
      ).length,
    [profile],
  );
  const claimableEventCount = useMemo(
    () =>
      EVENT_MILESTONES.filter(
        (m) =>
          !profile.claimedEventMilestones.includes(m.id) &&
          profile.eventSakuraTokens >= m.requiredTokens,
      ).length,
    [profile.claimedEventMilestones, profile.eventSakuraTokens],
  );
  const claimableMissionsCount = useMemo(
    () =>
      MISSIONS_CATALOG.filter(
        (m) => !m.isClaimed(profile) && m.getProgress(profile) >= m.target,
      ).length,
    [profile],
  );

  const armedBoostCount = useMemo(
    () =>
      Number(selectedBoosts.useMagnet) +
      Number(selectedBoosts.useShield) +
      Number(selectedBoosts.useMultiplier) +
      Number(selectedBoosts.useHeadStart),
    [selectedBoosts],
  );

  const totalInventoryCount =
    profile.inventoryMagnets +
    profile.inventoryShields +
    profile.inventoryMultipliers +
    profile.inventoryHeadStarts;

  return (
    <div className="lobby-body">
      {/* Anime Rush Title Banner */}
      <div className="lobby-logo-row">
        <div className="lobby-logo-wrap">
          <svg viewBox="0 0 360 108" className="lobby-logo-svg" aria-label="Anime Rush">
            <defs>
              <linearGradient id="arTopGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="55%" stopColor="#E0F2FE" />
                <stop offset="100%" stopColor="#93C5FD" />
              </linearGradient>
              <linearGradient id="arBottomGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="52%" stopColor="#FB7185" />
                <stop offset="100%" stopColor="#EF4444" />
              </linearGradient>
            </defs>
            <g transform="skewX(-10)">
              <text
                x="185"
                y="45"
                textAnchor="middle"
                fontSize="44"
                fontWeight="900"
                fontStyle="italic"
                letterSpacing="3"
                fill="#0B1120"
                stroke="#0B1120"
                strokeWidth="8"
                strokeLinejoin="round"
              >
                ANIME
              </text>
              <text
                x="185"
                y="45"
                textAnchor="middle"
                fontSize="44"
                fontWeight="900"
                fontStyle="italic"
                letterSpacing="3"
                fill="url(#arTopGrad)"
              >
                ANIME
              </text>
              <text
                x="192"
                y="87"
                textAnchor="middle"
                fontSize="50"
                fontWeight="900"
                fontStyle="italic"
                letterSpacing="3"
                fill="#0B1120"
                stroke="#0B1120"
                strokeWidth="9"
                strokeLinejoin="round"
              >
                RUSH
              </text>
              <text
                x="192"
                y="87"
                textAnchor="middle"
                fontSize="50"
                fontWeight="900"
                fontStyle="italic"
                letterSpacing="3"
                fill="url(#arBottomGrad)"
              >
                RUSH
              </text>
            </g>
            <text
              x="180"
              y="103"
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              letterSpacing="3.5"
              fill="#E2E8F0"
            >
              - ENDLESS RUNNER -
            </text>
          </svg>
        </div>
      </div>

      {/* Middle 3-column Stage: Slim Left Rail | Unobstructed 3D Hero+Shiba Center | Compact Right Rail */}
      <div className="lobby-middle-grid">
        {/* Left Action Rail (Unique to Inventory, Collection & Missions - zero duplicates with Bottom Nav) */}
        <aside className="lobby-rail-left interactive">
          <button
            type="button"
            className={`side-tile ${armedBoostCount > 0 ? 'tile-armed' : ''}`}
            onClick={() => onOpenModal('inventory')}
            data-testid="rail-inventory"
          >
            {armedBoostCount > 0 ? (
              <span className="tile-armed-badge tabular">{armedBoostCount} PRÊT</span>
            ) : (
              totalInventoryCount > 0 && (
                <span className="tile-count-badge tabular">{totalInventoryCount}</span>
              )
            )}
            <InventoryIcon size={23} />
            <span>INVENTAIRE</span>
          </button>

          <button
            type="button"
            className="side-tile"
            onClick={() => onOpenModal('collection')}
            data-testid="rail-collection"
          >
            <span className="tile-count-badge tabular">
              {profile.collectionIds.length}/{COLLECTION_CARDS.length}
            </span>
            <CollectionIcon size={23} />
            <span>COLLECTION</span>
          </button>

          <button
            type="button"
            className="side-tile"
            onClick={() => onOpenModal('missions')}
            data-testid="rail-missions"
          >
            {claimableMissionsCount > 0 && (
              <span className="notif-dot">{claimableMissionsCount}</span>
            )}
            <MissionsIcon size={23} />
            <span>MISSIONS</span>
          </button>
        </aside>

        {/* Unobstructed Interactive 3D Hero & Shiba Tap Zone */}
        <button
          type="button"
          className="center-stage-trigger interactive"
          onClick={onStartRun}
          aria-label="Lancer la course depuis la scène 3D"
          data-testid="center-stage-play"
        />

        {/* Right Rail (Sakura Event Banner + Compact 2x2 Social/Progress Grid) */}
        <aside className="lobby-rail-right interactive">
          <button
            type="button"
            className="banner-card event-banner"
            onClick={() => onOpenModal('event')}
            data-testid="banner-event"
          >
            {claimableEventCount > 0 && <span className="notif-dot">!</span>}
            <span className="banner-kicker event-kicker">ÉVÉNEMENT</span>
            <span className="banner-title">COURSE DES SAKURA</span>
            <div className="event-token-pill">
              <SakuraIcon size={13} />
              <span className="tabular">{profile.eventSakuraTokens} jetons</span>
            </div>
          </button>

          <div className="social-tiles-grid">
            <button
              type="button"
              className="side-tile compact-tile"
              onClick={() => onOpenModal('leaderboard')}
              data-testid="rail-leaderboard"
            >
              <TrophyIcon size={20} />
              <span>CLASSEMENT</span>
            </button>

            <button
              type="button"
              className="side-tile compact-tile"
              onClick={() => onOpenModal('achievements')}
              data-testid="rail-achievements"
            >
              {claimableAchievementsCount > 0 && (
                <span className="notif-dot">{claimableAchievementsCount}</span>
              )}
              <AchievementIcon size={20} />
              <span>SUCCÈS</span>
            </button>

            <button
              type="button"
              className="side-tile compact-tile"
              onClick={() => onOpenModal('friends')}
              data-testid="rail-friends"
            >
              {incomingFriendRequestsCount > 0 && (
                <span className="notif-dot">{incomingFriendRequestsCount}</span>
              )}
              <FriendsIcon size={20} />
              <span>AMIS</span>
            </button>

            <button
              type="button"
              className="side-tile compact-tile"
              onClick={() => onOpenModal('inbox')}
              data-testid="rail-inbox"
            >
              {unreadInboxCount > 0 && <span className="notif-dot">{unreadInboxCount}</span>}
              <MailIcon size={20} />
              <span>MESSAGES</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Single Clean Lower Action Row: Free Chest + Main JOUER CTA + Record/Multiplier */}
      <section className="lobby-lower-dock interactive">
        <div className="lobby-cta-row">
          <button
            type="button"
            className={`free-chest-card ${chestReady ? 'ready' : ''}`}
            onClick={() =>
              chestReady
                ? onClaimFreeChest()
                : onShowToast(`Coffre gratuit prêt dans ${formatCountdown(chestRemainingMs)}`)
            }
            data-testid="free-chest-btn"
          >
            <span className="chest-label">COFFRE GRATUIT</span>
            <ChestIcon size={26} />
            <span className="chest-timer tabular">
              {chestReady ? 'OUVRIR !' : formatCountdown(chestRemainingMs)}
            </span>
          </button>

          <button
            type="button"
            className="lobby-jouer-cta"
            onClick={onStartRun}
            data-testid="play-button"
          >
            <PlayIcon size={24} />
            <span>JOUER</span>
            {armedBoostCount > 0 && (
              <span className="jouer-boost-pill tabular">+{armedBoostCount}</span>
            )}
          </button>

          <div className="lobby-stats-col">
            <div className="record-card">
              <span className="record-kicker">TON RECORD</span>
              <span className="record-val tabular">
                {profile.bestScore.toLocaleString('fr-FR')}
              </span>
            </div>
            <button
              type="button"
              className={`multiplier-card ${displayMultiplier > 1 ? 'boosted' : ''}`}
              onClick={() => onOpenModal('inventory')}
              data-testid="multiplier-card"
            >
              <span className="mult-badge">x{displayMultiplier}</span>
              <div className="mult-meta">
                <span className="mult-label">MULTIPLICATEUR</span>
                <span className="mult-sub tabular">
                  {multiplierActive ? formatCountdown(multRemainingMs) : 'ACTIF'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
