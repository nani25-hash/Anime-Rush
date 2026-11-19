import React, { useEffect, useMemo, useState } from 'react';
import {
  ACHIEVEMENTS_CATALOG,
  COLLECTION_CARDS,
  EVENT_MILESTONES,
  MISSIONS_CATALOG,
  SEASON_TIERS,
  getCarById,
  getCompanionById,
  getHeroById,
} from '../config/catalog';
import {
  ActiveModal,
  ActiveRunBoosts,
  PlayerProfile,
  SocialBundle,
  getTodayUtcKey,
} from '../types/game';
import {
  getAllCachedThumbnails,
  hydrateThumbnailCache,
  subscribeThumbnails,
} from '../game/thumbnailStore';
import {
  BoltIcon,
  CarIcon,
  ChestIcon,
  CollectionIcon,
  MailIcon,
  MissionsIcon,
  PassIcon,
  PawIcon,
  SakuraIcon,
  TrophyIcon,
} from './Icons';

interface LobbyOverlayProps {
  profile: PlayerProfile;
  social: SocialBundle;
  selectedBoosts: ActiveRunBoosts;
  displayMultiplier: number;
  onStartRun: () => void;
  onClaimFreeChest: () => void;
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
  displayMultiplier,
  onStartRun,
  onClaimFreeChest,
  onOpenModal,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [thumbs, setThumbs] = useState<Record<string, string>>(() => getAllCachedThumbnails());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    void hydrateThumbnailCache().then(() => {
      if (active) setThumbs(getAllCachedThumbnails());
    });
    const unsub = subscribeThumbnails(() => {
      if (active) setThumbs(getAllCachedThumbnails());
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const hero = getHeroById(profile.equippedHeroId);
  const car = getCarById(profile.equippedCarId);
  const shiba = getCompanionById(profile.equippedCompanionId);

  const heroThumb = thumbs[`hero:${hero.id}`];
  const carThumb = thumbs[`car:${car.id}`];
  const shibaThumb = thumbs[`comp:${shiba.id}`];
  const dailyLoginAvailable = profile.loginLastClaimKey !== getTodayUtcKey(nowMs);

  const chestRemainingMs = Math.max(0, profile.nextFreeChestAt - nowMs);
  const chestReady = chestRemainingMs === 0;

  const maxTier = SEASON_TIERS.length;
  const currentTier = Math.min(maxTier, Math.max(1, profile.seasonLevel));
  const passPct = Math.min(100, Math.max(12, Math.round((currentTier / maxTier) * 100)));

  const unreadInboxCount = useMemo(
    () => social.inbox.filter((m) => !m.claimed || !m.read).length,
    [social.inbox],
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
  const totalMissionsBadge = claimableMissionsCount + claimableAchievementsCount;

  const armedBoostCount = useMemo(
    () =>
      Number(selectedBoosts.useMagnet) +
      Number(selectedBoosts.useShield) +
      Number(selectedBoosts.useMultiplier) +
      Number(selectedBoosts.useHeadStart),
    [selectedBoosts],
  );

  return (
    <div className="lobby-body">
      {/* Full-viewport tap-to-play surface sitting behind HUD cards */}
      <button
        type="button"
        className="tap-play-backdrop interactive"
        onClick={onStartRun}
        aria-label="Touche pour jouer"
        data-testid="tap-anywhere-play"
      />

      {/* Top Two-Column Shonen HUD Framing */}
      <div className="lobby-stage-grid">
        {/* LEFT COLUMN: Hunter ID Plate (Profile + Best Score + Top Run) + Compact Manga Tickets */}
        <aside className="ar-lobby-left">
          <button
            type="button"
            className="ar-hunter-card interactive"
            onClick={() => onOpenModal('settings')}
            aria-label="Profil et meilleur score"
            data-testid="profile-chip"
          >
            <div
              className="ar-hunter-emblem"
              style={{
                borderColor: hero.uiAccent,
                background: `radial-gradient(circle at 35% 30%, ${hero.uiAccent}55, #090d1f 85%)`,
              }}
            >
              {heroThumb ? (
                <img src={heroThumb} alt={hero.name} className="ar-portrait-thumb" />
              ) : (
                <span className="ar-hunter-kanji">{hero.kanji}</span>
              )}
              <span className="ar-hunter-lv tabular">Niv.{profile.level}</span>
            </div>
            <div className="ar-hunter-score" data-testid="record-card">
              <span className="ar-score-kicker">RECORD · 記録</span>
              <span className="ar-score-val tabular">
                {profile.bestScore.toLocaleString('fr-FR')}
              </span>
            </div>
          </button>

          <button
            type="button"
            className="ar-toprun-pill interactive"
            onClick={() => onOpenModal('leaderboard')}
            aria-label="Classement Top Run"
            data-testid="rail-leaderboard"
          >
            <TrophyIcon size={17} />
            <span className="ar-toprun-kicker">CLASSEMENT</span>
            <span className="ar-toprun-val tabular">
              {profile.bestScore.toLocaleString('fr-FR')}
            </span>
          </button>

          <div className="ar-ticket-stack interactive">
            <button
              type="button"
              className="ar-manga-ticket"
              onClick={() => onOpenModal('inbox')}
              aria-label="Messages et cadeaux"
              data-testid="rail-inbox"
            >
              {unreadInboxCount > 0 && (
                <span className="ar-diamond-badge tabular">{unreadInboxCount}</span>
              )}
              <MailIcon size={20} />
              <div className="ar-ticket-text">
                <span className="ar-ticket-title">ACTUS</span>
                <span className="ar-ticket-sub">Courrier</span>
              </div>
            </button>

            <button
              type="button"
              className="ar-manga-ticket"
              onClick={() => onOpenModal('collection')}
              aria-label="Album Collection"
              data-testid="rail-collection"
            >
              <span className="ar-chip-count tabular">
                {profile.collectionIds.length}/{COLLECTION_CARDS.length}
              </span>
              <CollectionIcon size={20} />
              <div className="ar-ticket-text">
                <span className="ar-ticket-title">ALBUM</span>
                <span className="ar-ticket-sub">Cartes 3D</span>
              </div>
            </button>

            <button
              type="button"
              className="ar-manga-ticket"
              onClick={() => onOpenModal('daily_login')}
              aria-label="Cadeau quotidien 7 jours"
              data-testid="rail-daily-login"
            >
              {dailyLoginAvailable && <span className="ar-diamond-badge">!</span>}
              <ChestIcon size={20} />
              <div className="ar-ticket-text">
                <span className="ar-ticket-title">CADEAU 7J</span>
                <span className="ar-ticket-sub">
                  {dailyLoginAvailable ? 'À réclamer !' : `Jour ${Math.max(1, profile.loginStreakDay)}/7`}
                </span>
              </div>
            </button>

            <button
              type="button"
              className="ar-sakura-event-card"
              onClick={() => onOpenModal('event')}
              aria-label="Événement Course des Sakura"
              data-testid="banner-event"
            >
              {claimableEventCount > 0 && (
                <span className="ar-diamond-badge tabular">{claimableEventCount}</span>
              )}
              <div className="ar-sakura-head">
                <SakuraIcon size={20} />
                <span className="ar-sakura-tag">ÉVÉNEMENT</span>
              </div>
              <span className="ar-sakura-name">SAKURA RUSH</span>
              <span className="ar-sakura-tokens tabular">
                {profile.eventSakuraTokens} jetons 🌸
              </span>
            </button>
          </div>
        </aside>

        {/* CENTER CORRIDOR (3D Hero + Shiba + Neo-Tokyo Night Yard unobstructed) */}
        <div className="center-stage-spacer" />

        {/* RIGHT COLUMN: Cyber-Crate Reward, Katana Season Meter, Compact Loadout Deck */}
        <aside className="ar-lobby-right">
          <button
            type="button"
            className={`ar-crate-btn interactive ${chestReady ? 'ready' : ''}`}
            onClick={() => (chestReady ? onClaimFreeChest() : onOpenModal('pass'))}
            aria-label={chestReady ? 'Ouvrir coffre gratuit' : 'Voir le coffre gratuit dans le Pass'}
            data-testid="free-chest-btn"
          >
            <div className="ar-crate-copy">
              <span className="ar-crate-kicker">COFFRE DOJO</span>
              <span className="ar-crate-val tabular">
                {chestReady ? 'GRATUIT' : formatCountdown(chestRemainingMs)}
              </span>
            </div>
            <ChestIcon size={24} />
          </button>

          <button
            type="button"
            className="ar-pass-module interactive"
            onClick={() => onOpenModal('pass')}
            aria-label="Ouvrir le Pass Saison"
            data-testid="banner-season"
          >
            <div className="ar-pass-head">
              <span className="ar-pass-kicker">
                <PassIcon size={15} />
                <span>PASS S1</span>
              </span>
              <span className="ar-pass-tier tabular">
                {currentTier}/{maxTier}
              </span>
            </div>
            <div className="ar-pass-rail">
              <div className="ar-pass-fill" style={{ width: `${passPct}%` }} />
            </div>
          </button>

          <div className="ar-deck-slots interactive">
            <button
              type="button"
              className="ar-deck-slot slot-car"
              onClick={() => onOpenModal('cars')}
              title={car.name}
              aria-label={`Voiture : ${car.name}`}
              data-testid="rail-cars"
            >
              {carThumb ? (
                <img src={carThumb} alt={car.name} className="ar-slot-thumb" />
              ) : (
                <CarIcon size={21} />
              )}
              <div className="ar-slot-copy">
                <span className="ar-slot-kicker">BOLIDE</span>
                <span className="ar-slot-val">{car.name}</span>
              </div>
            </button>

            <button
              type="button"
              className="ar-deck-slot slot-shiba"
              onClick={() => onOpenModal('companions')}
              title={shiba.name}
              aria-label={`Compagnon : ${shiba.name}`}
              data-testid="rail-shiba"
            >
              {shibaThumb ? (
                <img src={shibaThumb} alt={shiba.name} className="ar-slot-thumb" />
              ) : (
                <PawIcon size={20} />
              )}
              <div className="ar-slot-copy">
                <span className="ar-slot-kicker">SHIBA</span>
                <span className="ar-slot-val">{shiba.name}</span>
              </div>
            </button>

            <button
              type="button"
              className={`ar-deck-slot slot-boost ${displayMultiplier > 1 ? 'boosted' : ''}`}
              onClick={() => onOpenModal('inventory')}
              aria-label="Inventaire et Boosts"
              data-testid="rail-boosts"
            >
              <BoltIcon size={20} />
              <div className="ar-slot-copy">
                <span className="ar-slot-kicker">BOOSTS</span>
                <span className="ar-slot-val tabular">
                  {armedBoostCount > 0 ? `${armedBoostCount} armé(s)` : `×${displayMultiplier}`}
                </span>
              </div>
            </button>

            <button
              type="button"
              className="ar-deck-slot slot-missions"
              onClick={() => onOpenModal('missions')}
              aria-label="Missions et Succès"
              data-testid="rail-missions"
            >
              {totalMissionsBadge > 0 && (
                <span className="ar-diamond-badge tabular">{totalMissionsBadge}</span>
              )}
              <MissionsIcon size={20} />
              <div className="ar-slot-copy">
                <span className="ar-slot-kicker">DÉFIS</span>
                <span className="ar-slot-val">
                  {totalMissionsBadge > 0 ? `${totalMissionsBadge} prêt(s)` : 'Voir'}
                </span>
              </div>
            </button>
          </div>
        </aside>
      </div>

      {/* Neo-Tokyo Shonen Katana-Slash "Touche pour jouer" Prompt (No Button) */}
      <section className="lobby-lower-dock">
        <div className="ar-dash-prompt" data-testid="tap-to-play-text">
          <div className="ar-dash-slash-wrap">
            <span className="ar-dash-jp">出撃準備完了 · ANIME RUSH</span>
            <span className="ar-dash-label">TOUCHE POUR JOUER</span>
            <span className="ar-dash-energy-line" aria-hidden="true" />
          </div>
          {armedBoostCount > 0 && (
            <span className="tap-boost-pill tabular">
              +{armedBoostCount} BOOST{armedBoostCount > 1 ? 'S' : ''} ACTIF
              {armedBoostCount > 1 ? 'S' : ''}
            </span>
          )}
        </div>
      </section>
    </div>
  );
};
