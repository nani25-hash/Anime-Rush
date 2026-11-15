import React, { useEffect, useMemo, useState } from 'react';
import {
  ACHIEVEMENTS_CATALOG,
  COLLECTION_CARDS,
  EVENT_MILESTONES,
  HERO_CATALOG,
  MISSIONS_CATALOG,
} from '../config/catalog';
import { ActiveModal, ActiveRunBoosts, PlayerProfile, SocialBundle } from '../types/game';
import {
  AchievementIcon,
  ChestIcon,
  CoinIcon,
  CollectionIcon,
  FriendsIcon,
  GemIcon,
  HeroIcon,
  InventoryIcon,
  MagnetIcon,
  MailIcon,
  PlayIcon,
  SakuraIcon,
  ShieldIcon,
  ShopIcon,
  TrophyIcon,
} from './Icons';

interface LobbyOverlayProps {
  profile: PlayerProfile;
  social: SocialBundle;
  selectedBoosts: ActiveRunBoosts;
  onStartRun: () => void;
  onToggleBoost: (key: keyof ActiveRunBoosts) => void;
  onClaimFreeChest: () => void;
  onClaimMission: (missionId: string) => void;
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
  onToggleBoost,
  onClaimFreeChest,
  onClaimMission,
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
  const canAffordNewHero = useMemo(
    () =>
      HERO_CATALOG.some(
        (h) =>
          !profile.unlockedHeroIds.includes(h.id) &&
          (h.currency === 'coins' ? profile.coins >= h.cost : profile.gems >= h.cost),
      ),
    [profile.coins, profile.gems, profile.unlockedHeroIds],
  );

  const totalInventoryCount =
    profile.inventoryMagnets +
    profile.inventoryShields +
    profile.inventoryMultipliers +
    profile.inventoryHeadStarts;

  const dailyMission = MISSIONS_CATALOG[0];
  const weeklyMission = MISSIONS_CATALOG[2];
  const dailyProg = Math.min(dailyMission.target, dailyMission.getProgress(profile));
  const dailyReady = !dailyMission.isClaimed(profile) && dailyProg >= dailyMission.target;
  const weeklyProg = Math.min(weeklyMission.target, weeklyMission.getProgress(profile));
  const weeklyReady = !weeklyMission.isClaimed(profile) && weeklyProg >= weeklyMission.target;

  return (
    <div className="lobby-body">
      {/* Anime Rush Title Banner */}
      <div className="lobby-logo-row">
        <div className="lobby-logo-wrap">
          <svg viewBox="0 0 360 112" className="lobby-logo-svg" aria-label="Anime Rush">
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
                y="46"
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
                y="46"
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
                y="88"
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
                y="88"
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
              y="105"
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

        <div className="lobby-quote-sticker" aria-hidden="true">
          <span>COURIR</span>
          <span>RÊVER</span>
          <span>DÉPASSER SES LIMITES</span>
        </div>
      </div>

      {/* Middle 3-column Stage: Left Action Rail | Interactive 3D Hero+Shiba Tap Zone | Right Season/Event/Social Rail */}
      <div className="lobby-middle-grid">
        {/* Left Action Rail */}
        <aside className="lobby-rail-left interactive">
          <button
            type="button"
            className="side-tile"
            onClick={() => onOpenModal('shop')}
            data-testid="rail-shop"
          >
            <ShopIcon size={24} />
            <span>BOUTIQUE</span>
          </button>

          <button
            type="button"
            className="side-tile"
            onClick={() => onOpenModal('heroes')}
            data-testid="rail-heroes"
          >
            {canAffordNewHero && <span className="notif-dot">!</span>}
            <HeroIcon size={24} />
            <span>HÉROS</span>
          </button>

          <button
            type="button"
            className="side-tile"
            onClick={() => onOpenModal('inventory')}
            data-testid="rail-inventory"
          >
            {totalInventoryCount > 0 && <span className="tile-count-badge tabular">{totalInventoryCount}</span>}
            <InventoryIcon size={24} />
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
            <CollectionIcon size={24} />
            <span>COLLECTION</span>
          </button>
        </aside>

        {/* Interactive Center 3D Scene Hitzone (Tapping Hero & Shiba immediately starts a run!) */}
        <button
          type="button"
          className="center-stage-trigger interactive"
          onClick={onStartRun}
          aria-label="Lancer la course depuis la scène 3D"
          data-testid="center-stage-play"
        >
          <span className="center-stage-hint">TOUCHE POUR COURIR</span>
        </button>

        {/* Right Season / Event / Social Rail */}
        <aside className="lobby-rail-right interactive">
          <button
            type="button"
            className="banner-card season-banner"
            onClick={() => onOpenModal('pass')}
            data-testid="banner-season"
          >
            <span className="banner-kicker">SAISON 1</span>
            <span className="banner-title">ESPRITS DU JAPON</span>
            <div className="banner-prog-row">
              <div className="banner-prog-bar">
                <div className="banner-prog-fill" style={{ width: `${Math.min(100, profile.seasonXp)}%` }} />
              </div>
              <span className="banner-level-badge tabular">{profile.seasonLevel}</span>
            </div>
          </button>

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

          <div className="social-tiles-stack">
            <button
              type="button"
              className="side-tile"
              onClick={() => onOpenModal('leaderboard')}
              data-testid="rail-leaderboard"
            >
              <TrophyIcon size={22} />
              <span>CLASSEMENT</span>
            </button>

            <button
              type="button"
              className="side-tile"
              onClick={() => onOpenModal('achievements')}
              data-testid="rail-achievements"
            >
              {claimableAchievementsCount > 0 && (
                <span className="notif-dot">{claimableAchievementsCount}</span>
              )}
              <AchievementIcon size={22} />
              <span>SUCCÈS</span>
            </button>

            <button
              type="button"
              className="side-tile"
              onClick={() => onOpenModal('friends')}
              data-testid="rail-friends"
            >
              {incomingFriendRequestsCount > 0 && (
                <span className="notif-dot">{incomingFriendRequestsCount}</span>
              )}
              <FriendsIcon size={22} />
              <span>AMIS</span>
            </button>

            <button
              type="button"
              className="side-tile"
              onClick={() => onOpenModal('inbox')}
              data-testid="rail-inbox"
            >
              {unreadInboxCount > 0 && <span className="notif-dot">{unreadInboxCount}</span>}
              <MailIcon size={22} />
              <span>MESSAGERIE</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Bottom Dock: Free Chest + Central JOUER + Record/Multiplier + Quick Missions */}
      <section className="lobby-lower-dock interactive">
        {/* Pre-run Power-Up Toggle Strip (only interactive when owned) */}
        <div className="boost-toggle-strip">
          <button
            type="button"
            className={`boost-pill ${selectedBoosts.useMagnet ? 'active' : ''}`}
            disabled={profile.inventoryMagnets <= 0}
            onClick={() => onToggleBoost('useMagnet')}
          >
            <MagnetIcon size={14} />
            <span className="tabular">Aimant ({profile.inventoryMagnets})</span>
          </button>
          <button
            type="button"
            className={`boost-pill ${selectedBoosts.useShield ? 'active' : ''}`}
            disabled={profile.inventoryShields <= 0}
            onClick={() => onToggleBoost('useShield')}
          >
            <ShieldIcon size={14} />
            <span className="tabular">Bouclier ({profile.inventoryShields})</span>
          </button>
          <button
            type="button"
            className={`boost-pill ${selectedBoosts.useMultiplier ? 'active' : ''}`}
            disabled={profile.inventoryMultipliers <= 0}
            onClick={() => onToggleBoost('useMultiplier')}
          >
            <span className="tabular">x5 ({profile.inventoryMultipliers})</span>
          </button>
          <button
            type="button"
            className={`boost-pill ${selectedBoosts.useHeadStart ? 'active' : ''}`}
            disabled={profile.inventoryHeadStarts <= 0}
            onClick={() => onToggleBoost('useHeadStart')}
          >
            <span className="tabular">Turbo ({profile.inventoryHeadStarts})</span>
          </button>
        </div>

        <div className="lobby-cta-row">
          {/* Free Chest */}
          <button
            type="button"
            className={`free-chest-card ${chestReady ? 'ready' : ''}`}
            onClick={onClaimFreeChest}
            data-testid="free-chest-btn"
          >
            <span className="chest-label">COFFRE GRATUIT</span>
            <ChestIcon size={28} />
            <span className="chest-timer tabular">
              {chestReady ? 'OUVRIR !' : formatCountdown(chestRemainingMs)}
            </span>
          </button>

          {/* Main JOUER CTA */}
          <button
            type="button"
            className="lobby-jouer-cta"
            onClick={onStartRun}
            data-testid="play-button"
          >
            <PlayIcon size={24} />
            <span>JOUER</span>
          </button>

          {/* Right Record & Multiplier Stats */}
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

        {/* Daily & Weekly Mission Quick Strip */}
        <div className="missions-strip">
          <button
            type="button"
            className={`mission-mini-card ${dailyReady ? 'claimable' : ''}`}
            onClick={() =>
              dailyReady ? onClaimMission(dailyMission.id) : onOpenModal('missions')
            }
            data-testid="mission-daily-card"
          >
            <div className="mission-mini-head">
              <span className="mission-mini-kicker">MISSIONS DU JOUR</span>
              <span className="mission-reward-tag tabular">
                <CoinIcon size={12} /> {dailyMission.rewardLabel}
              </span>
            </div>
            <div className="mission-mini-title">
              {dailyMission.isClaimed(profile)
                ? 'Réclamée ! Voir missions'
                : dailyReady
                  ? 'TERMINÉE · TOUCHER POUR RÉCLAMER'
                  : dailyMission.title}
            </div>
            <div className="mission-mini-bar">
              <div
                className="mission-mini-fill"
                style={{ width: `${Math.min(100, (dailyProg / dailyMission.target) * 100)}%` }}
              />
              <span className="tabular">
                {dailyProg} / {dailyMission.target}
              </span>
            </div>
          </button>

          <button
            type="button"
            className={`mission-mini-card ${weeklyReady ? 'claimable' : ''}`}
            onClick={() =>
              weeklyReady ? onClaimMission(weeklyMission.id) : onOpenModal('missions')
            }
            data-testid="mission-weekly-card"
          >
            <div className="mission-mini-head">
              <span className="mission-mini-kicker">MISSIONS HEBDO</span>
              <span className="mission-reward-tag tabular">
                <GemIcon size={12} /> {weeklyMission.rewardLabel}
              </span>
            </div>
            <div className="mission-mini-title">
              {weeklyMission.isClaimed(profile)
                ? 'Réclamée ! Voir missions'
                : weeklyReady
                  ? 'TERMINÉE · TOUCHER POUR RÉCLAMER'
                  : weeklyMission.title}
            </div>
            <div className="mission-mini-bar">
              <div
                className="mission-mini-fill"
                style={{ width: `${Math.min(100, (weeklyProg / weeklyMission.target) * 100)}%` }}
              />
              <span className="tabular">
                {weeklyProg.toLocaleString('fr-FR')} / {weeklyMission.target.toLocaleString('fr-FR')}
              </span>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
};
