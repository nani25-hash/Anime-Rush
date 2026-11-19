import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomNavBar } from './components/BottomNavBar';
import { FreeChestModal } from './components/FreeChestModal';
import { GameHud } from './components/GameHud';
import { GameOverModal } from './components/GameOverModal';
import { HeroesModal } from './components/HeroesModal';
import { InventoryAndCollectionModal } from './components/InventoryAndCollectionModal';
import { LobbyOverlay } from './components/LobbyOverlay';
import { MissionsAndAchievementsModal } from './components/MissionsAndAchievementsModal';
import { PassAndEventModal } from './components/PassAndEventModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { ShopModal } from './components/ShopModal';
import { SocialHubModal } from './components/SocialHubModal';
import { TopBar } from './components/TopBar';
import { CAR_CATALOG, HERO_CATALOG } from './config/catalog';
import { AnimeRushEngine } from './game/AnimeRushEngine';
import { useGameProfile } from './state/useGameProfile';
import {
  ActiveModal,
  BottomTab,
  GAME_CONSTANTS,
  HudSnapshot,
  QualityLevel,
  RunTelemetry,
  loadBestScore,
  loadSavedHaptics,
  loadSavedMuted,
  loadSavedQuality,
  saveHaptics,
  saveMuted,
  saveQuality,
} from './types/game';

export const App: React.FC = () => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<AnimeRushEngine | null>(null);
  const { profile, social, chestReward, toastMessage, selectedBoosts, actions } =
    useGameProfile();

  const [quality, setQuality] = useState<QualityLevel>(() => loadSavedQuality());
  const [muted, setMuted] = useState<boolean>(() => loadSavedMuted());
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => loadSavedHaptics());
  const [engineError, setEngineError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [hud, setHud] = useState<HudSnapshot>(() => ({
    phase: 'TITLE',
    score: 0,
    distance: 0,
    coins: 0,
    sakuraTokens: 0,
    speedMultiplier: 1.0,
    scoreMultiplier: 1,
    bestScore: loadBestScore(),
    isNewRecord: false,
    milestoneLabel: null,
    dangerActive: false,
    magnetRemaining: 0,
    hasShield: false,
    jumps: 0,
    slides: 0,
    headStartActive: false,
    fuelPct: 0,
    fuelCount: 0,
    fuelMax: 100,
    fuelReady: false,
    carRemaining: 0,
    carActive: false,
    carName: 'Yellow Cab GT',
    heroName: 'Ryu Hoshino',
    heroPowerName: 'Élan Torii',
    heroPowerAccent: '#ef4444',
    heroPowerChargePct: 45,
    heroPowerReady: false,
    heroPowerActiveRemaining: 0,
    heroPassiveSummary: '+10% Score final en course',
    nearMissCount: 0,
    nearMissLabel: null,
    biomeName: 'Sakura Ueno',
    canRevive: true,
    revivedUsed: false,
  }));

  const selectedBoostsRef = useRef(selectedBoosts);
  selectedBoostsRef.current = selectedBoosts;

  const activeModalRef = useRef<ActiveModal>(activeModal);
  activeModalRef.current = activeModal;

  const chestRewardRef = useRef(chestReward);
  chestRewardRef.current = chestReward;

  const recordRunRef = useRef<(telemetry: RunTelemetry) => void>(() => {});
  recordRunRef.current = (telemetry: RunTelemetry) => {
    actions.recordRunResult(telemetry);
    actions.consumeBoostFlagsAfterRun();
  };

  useEffect(() => {
    const container = stageRef.current;
    if (!container) return;

    let engine: AnimeRushEngine | null = null;
    try {
      engine = new AnimeRushEngine(
        container,
        quality,
        muted,
        (snapshot) => setHud(snapshot),
        (telemetry) => recordRunRef.current(telemetry),
      );
      engineRef.current = engine;
      requestAnimationFrame(() => {
        window.AndroidBridge?.onGameReady?.();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Initialisation WebGL échouée';
      setEngineError(msg);
      window.AndroidBridge?.onGameReady?.();
      return;
    }

    const onAppPause = () => {
      engine?.pauseRun();
    };
    window.addEventListener('anime-rush-pause', onAppPause);

    window.__ANIME_RUSH_BACK__ = () => {
      if (chestRewardRef.current) {
        actions.clearChestReward();
        return;
      }
      if (activeModalRef.current !== null) {
        setActiveModal(null);
        return;
      }
      if (!engine) {
        window.AndroidBridge?.exitApp();
        return;
      }
      const currentPhase = engine.getPhase();
      if (currentPhase === 'PLAYING') {
        engine.pauseRun();
      } else if (currentPhase === 'PAUSED') {
        engine.resumeRun();
      } else if (currentPhase === 'GAME_OVER') {
        engine.returnToTitle();
      } else {
        window.AndroidBridge?.exitApp();
      }
    };

    const onKeyStartOrRestart = (e: KeyboardEvent) => {
      if (activeModalRef.current !== null || chestRewardRef.current !== null) return;
      if (!engine || (e.code !== 'Enter' && e.code !== 'Space')) return;
      const p = engine.getPhase();
      if (p === 'TITLE') {
        e.preventDefault();
        engine.startRun(selectedBoostsRef.current);
      } else if (p === 'GAME_OVER') {
        e.preventDefault();
        engine.restartRun(selectedBoostsRef.current);
      }
    };
    window.addEventListener('keydown', onKeyStartOrRestart);

    return () => {
      window.removeEventListener('anime-rush-pause', onAppPause);
      window.removeEventListener('keydown', onKeyStartOrRestart);
      delete window.__ANIME_RUSH_BACK__;
      engine?.dispose();
      engineRef.current = null;
    };
    // Initial mount only; runtime settings flow through setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync equipped 3D Hero + Shiba Companion + Convertible Car skins, upgrades, haptics & stats to 3D engine
  useEffect(() => {
    engineRef.current?.setLoadout(
      profile.equippedHeroId,
      profile.equippedCompanionId,
      profile.equippedCarId,
    );
    const multActive =
      profile.activeMultiplier > 1 && profile.multiplierExpiresAt > Date.now()
        ? profile.activeMultiplier
        : 1;
    engineRef.current?.setProfileStats(profile.bestScore, multActive);
    engineRef.current?.setUpgrades(
      profile.upgradeMagnetLevel,
      profile.upgradeCarLevel,
      profile.upgradeShieldLevel,
      profile.upgradeScoreLevel,
    );
    engineRef.current?.setHapticsEnabled(hapticsEnabled);
  }, [
    profile.equippedHeroId,
    profile.equippedCompanionId,
    profile.equippedCarId,
    profile.bestScore,
    profile.activeMultiplier,
    profile.multiplierExpiresAt,
    profile.upgradeMagnetLevel,
    profile.upgradeCarLevel,
    profile.upgradeShieldLevel,
    profile.upgradeScoreLevel,
    hapticsEnabled,
  ]);

  // Pause idle 3D simulation while full-screen modal sheet is covering the viewport
  useEffect(() => {
    const shouldPause3D = hud.phase === 'TITLE' && (activeModal !== null || chestReward !== null);
    engineRef.current?.setSimulationPaused(shouldPause3D);
  }, [hud.phase, activeModal, chestReward]);

  useEffect(() => {
    if (chestReward) {
      engineRef.current?.playChestSound();
    }
  }, [chestReward]);

  const handlePlay = useCallback(() => {
    setActiveModal(null);
    engineRef.current?.startRun(selectedBoostsRef.current);
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseRun();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeRun();
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.restartRun(selectedBoostsRef.current);
  }, []);

  const handleHome = useCallback(() => {
    setActiveModal(null);
    engineRef.current?.returnToTitle();
  }, []);

  const handleActivateCar = useCallback(() => {
    engineRef.current?.activateCarMode();
  }, []);

  const handleActivateHeroPower = useCallback(() => {
    engineRef.current?.activateHeroPower();
  }, []);

  const handleQualityChange = useCallback((nextQuality: QualityLevel) => {
    setQuality(nextQuality);
    saveQuality(nextQuality);
    engineRef.current?.setQuality(nextQuality);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      saveMuted(next);
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleToggleHaptics = useCallback(() => {
    setHapticsEnabled((prev) => {
      const next = !prev;
      saveHaptics(next);
      engineRef.current?.setHapticsEnabled(next);
      return next;
    });
  }, []);

  const handleRevive = useCallback(() => {
    if (profile.gems < GAME_CONSTANTS.REVIVE_GEM_COST) return;
    actions.spendGemsForRevive(GAME_CONSTANTS.REVIVE_GEM_COST);
    engineRef.current?.reviveRun();
  }, [profile.gems, actions]);

  const handleOpenModal = useCallback((modal: ActiveModal) => {
    engineRef.current?.playUiSound();
    setActiveModal(modal);
  }, []);

  const handleSelectBottomTab = useCallback((tab: BottomTab) => {
    engineRef.current?.playUiSound();
    if (tab === 'home') {
      setActiveModal(null);
    } else if (tab === 'heroes') {
      setActiveModal('heroes');
    } else if (tab === 'shop') {
      setActiveModal('shop');
    } else if (tab === 'pass') {
      setActiveModal('pass');
    }
  }, []);

  const activeBottomTab: BottomTab = useMemo(() => {
    if (activeModal === 'heroes') return 'heroes';
    if (activeModal === 'shop') return 'shop';
    if (activeModal === 'pass' || activeModal === 'event') return 'pass';
    return 'home';
  }, [activeModal]);

  const hasClaimablePassTier = useMemo(() => {
    for (let t = 1; t <= Math.min(10, profile.seasonLevel); t++) {
      if (!profile.claimedSeasonTiers.includes(t)) return true;
    }
    return false;
  }, [profile.seasonLevel, profile.claimedSeasonTiers]);

  const canAffordNewHero = useMemo(
    () =>
      HERO_CATALOG.some(
        (h) =>
          !profile.unlockedHeroIds.includes(h.id) &&
          (h.currency === 'coins' ? profile.coins >= h.cost : profile.gems >= h.cost),
      ) ||
      CAR_CATALOG.some(
        (c) =>
          !profile.unlockedCarIds.includes(c.id) &&
          (c.currency === 'coins' ? profile.coins >= c.cost : profile.gems >= c.cost),
      ),
    [profile.coins, profile.gems, profile.unlockedHeroIds, profile.unlockedCarIds],
  );

  return (
    <main className="app-shell">
      <div ref={stageRef} className="canvas-stage" />

      {engineError && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 className="modal-title">ERREUR WEBGL</h2>
            <p className="control-hint">{engineError}</p>
          </div>
        </div>
      )}

      {!engineError && hud.phase === 'TITLE' && (
        <div className="lobby-shell">
          <TopBar
            profile={profile}
            onOpenSettings={() => handleOpenModal('settings')}
          />

          <LobbyOverlay
            profile={profile}
            social={social}
            selectedBoosts={selectedBoosts}
            onStartRun={handlePlay}
            onClaimFreeChest={actions.claimFreeChest}
            onShowToast={actions.showToast}
            onOpenModal={handleOpenModal}
          />

          <BottomNavBar
            activeTab={activeBottomTab}
            heroesBadge={canAffordNewHero}
            passBadge={hasClaimablePassTier}
            onSelectTab={handleSelectBottomTab}
          />
        </div>
      )}

      {!engineError && hud.phase === 'PLAYING' && (
        <GameHud
          hud={hud}
          onPause={handlePause}
          onActivateCar={handleActivateCar}
          onActivateHeroPower={handleActivateHeroPower}
        />
      )}

      {!engineError && hud.phase === 'PAUSED' && (
        <PauseModal
          quality={quality}
          muted={muted}
          onResume={handleResume}
          onRestart={handleRestart}
          onHome={handleHome}
          onQualityChange={handleQualityChange}
          onToggleMute={handleToggleMute}
        />
      )}

      {!engineError && hud.phase === 'GAME_OVER' && (
        <GameOverModal
          hud={hud}
          gemsBalance={profile.gems}
          onRevive={handleRevive}
          onRestart={handleRestart}
          onHome={handleHome}
        />
      )}

      {/* Lobby Functional Modals */}
      {hud.phase === 'TITLE' && activeModal === 'shop' && (
        <ShopModal
          profile={profile}
          onBuyItem={(itemType, itemId, currency, cost) => {
            engineRef.current?.playCashSound();
            actions.purchaseShopItem(itemType, itemId, currency, cost);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {hud.phase === 'TITLE' && activeModal === 'heroes' && (
        <HeroesModal
          profile={profile}
          onEquip={(heroId, compId) => {
            engineRef.current?.playUiSound();
            actions.equipLoadout(heroId, compId);
          }}
          onEquipCar={(carId) => {
            engineRef.current?.playUiSound();
            actions.equipCar(carId);
          }}
          onBuyCharacter={(itemType, itemId, currency, cost) => {
            engineRef.current?.playUnlockSound();
            actions.purchaseShopItem(itemType, itemId, currency, cost);
          }}
          onPurchaseUpgrade={(upgradeId, cost) => {
            engineRef.current?.playUpgradeSound();
            actions.purchaseUpgrade(upgradeId, cost);
          }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {hud.phase === 'TITLE' &&
        (activeModal === 'inventory' || activeModal === 'collection') && (
          <InventoryAndCollectionModal
            mode={activeModal}
            profile={profile}
            selectedBoosts={selectedBoosts}
            onToggleBoost={actions.toggleBoost}
            onActivateMultiplier={actions.activateMultiplierBoost}
            onOpenShop={() => setActiveModal('shop')}
            onClose={() => setActiveModal(null)}
          />
        )}

      {hud.phase === 'TITLE' &&
        (activeModal === 'missions' || activeModal === 'achievements') && (
          <MissionsAndAchievementsModal
            mode={activeModal}
            profile={profile}
            onClaimMission={actions.claimMission}
            onClaimAchievement={actions.claimAchievement}
            onClose={() => setActiveModal(null)}
          />
        )}

      {hud.phase === 'TITLE' && (activeModal === 'pass' || activeModal === 'event') && (
        <PassAndEventModal
          mode={activeModal}
          profile={profile}
          onClaimSeasonTier={actions.claimSeasonTier}
          onClaimEventMilestone={actions.claimEventMilestone}
          onClose={() => setActiveModal(null)}
        />
      )}

      {hud.phase === 'TITLE' &&
        (activeModal === 'leaderboard' || activeModal === 'inbox') && (
          <SocialHubModal
            initialTab={activeModal}
            profile={profile}
            social={social}
            onRefreshLeaderboard={actions.fetchLeaderboard}
            onClaimInbox={actions.claimInboxMessage}
            onClaimAllInbox={actions.claimAllInbox}
            onClose={() => setActiveModal(null)}
          />
        )}

      {hud.phase === 'TITLE' && activeModal === 'settings' && (
        <SettingsModal
          profile={profile}
          quality={quality}
          muted={muted}
          hapticsEnabled={hapticsEnabled}
          onSaveDisplayName={actions.updateDisplayName}
          onQualityChange={handleQualityChange}
          onToggleMute={handleToggleMute}
          onToggleHaptics={handleToggleHaptics}
          onClose={() => setActiveModal(null)}
        />
      )}

      {chestReward && (
        <FreeChestModal reward={chestReward} onClose={actions.clearChestReward} />
      )}

      {toastMessage && (
        <div className="toast-banner" role="status" onClick={actions.clearToast}>
          {toastMessage}
        </div>
      )}
    </main>
  );
};
