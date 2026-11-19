import { useCallback, useEffect, useState } from 'react';
import {
  ActiveRunBoosts,
  ChestReward,
  LeaderboardEntry,
  PlayerProfile,
  RunTelemetry,
  SocialBundle,
} from '../types/game';

declare global {
  interface Window {
    __ANIME_RUSH_BACK__?: () => void;
    __ANIME_RUSH_BRIDGE_EVENT__?: (eventType: string, payload: unknown) => void;
    AndroidBridge?: {
      exitApp: () => void;
      onGameReady?: () => void;
      requestSyncAll?: () => void;
      updateDisplayName?: (newName: string) => void;
      equipLoadout?: (heroId: string, companionId: string) => void;
      equipCar?: (carId: string) => void;
      claimFreeChest?: () => void;
      recordRunResult?: (
        score: number,
        distance: number,
        coinsEarned: number,
        sakuraTokensEarned: number,
        jumps: number,
        slides: number,
        consumedMagnet: boolean,
        consumedShield: boolean,
        consumedMultiplier: boolean,
        consumedHeadStart: boolean,
      ) => void;
      purchaseShopItem?: (
        itemType: string,
        itemId: string,
        currency: string,
        cost: number,
      ) => void;
      activateMultiplierBoost?: () => void;
      claimMission?: (missionId: string) => void;
      claimSeasonTier?: (tier: number) => void;
      claimEventMilestone?: (milestoneId: string) => void;
      claimAchievement?: (achievementId: string) => void;
      fetchLeaderboard?: () => void;
      searchPlayers?: (query: string) => void;
      sendFriendRequest?: (
        targetUid: string,
        targetDisplayName: string,
        targetLevel: number,
        targetBestScore: number,
        targetHeroId: string,
        targetCompanionId: string,
      ) => void;
      acceptFriendRequest?: (
        requestId: string,
        fromUid: string,
        fromDisplayName: string,
        fromLevel: number,
      ) => void;
      declineFriendRequest?: (requestId: string) => void;
      removeFriend?: (friendUid: string) => void;
      sendFriendGift?: (friendUid: string) => void;
      claimInboxMessage?: (messageId: string) => void;
      claimAllInbox?: () => void;
      purchaseUpgrade?: (upgradeId: string, cost: number) => void;
      spendGemsForRevive?: (cost: number) => void;
      triggerHaptic?: (kind: 'light' | 'medium' | 'heavy') => void;
      signOut?: () => void;
    };
  }
}

const DEFAULT_FALLBACK_PROFILE: PlayerProfile = {
  uid: 'local-preview',
  displayName: 'RyuPlayer',
  photoUrl: '',
  level: 1,
  xp: 0,
  xpToNextLevel: 1000,
  coins: 500,
  gems: 25,
  bestScore: 0,
  totalDistance: 0,
  totalRuns: 0,
  totalCoinsCollected: 0,
  activeMultiplier: 1,
  multiplierExpiresAt: 0,
  equippedHeroId: 'ryu',
  equippedCompanionId: 'shiba_classic',
  equippedCarId: 'yellow_cab_gt',
  unlockedHeroIds: ['ryu'],
  unlockedCompanionIds: ['shiba_classic'],
  unlockedCarIds: ['yellow_cab_gt'],
  upgradeMagnetLevel: 1,
  upgradeCarLevel: 1,
  upgradeShieldLevel: 1,
  upgradeScoreLevel: 1,
  collectionIds: ['card_tokyo_rails'],
  inventoryMagnets: 1,
  inventoryShields: 1,
  inventoryMultipliers: 0,
  inventoryHeadStarts: 0,
  nextFreeChestAt: 0,
  seasonLevel: 1,
  seasonXp: 0,
  claimedSeasonTiers: [],
  eventSakuraTokens: 0,
  claimedEventMilestones: [],
  claimedAchievementIds: [],
  dailyMissionCoins: 0,
  dailyMissionCoinsClaimed: false,
  dailyMissionRuns: 0,
  dailyMissionRunsClaimed: false,
  dailyMissionResetKey: '',
  weeklyMissionDistance: 0,
  weeklyMissionDistanceClaimed: false,
  weeklyMissionJumps: 0,
  weeklyMissionJumpsClaimed: false,
  weeklyMissionResetKey: '',
  totalJumps: 0,
  totalSlides: 0,
};

const EMPTY_SOCIAL: SocialBundle = {
  friends: [],
  friendRequests: [],
  inbox: [],
  leaderboard: [],
};

export interface GameProfileActions {
  syncAll: () => void;
  updateDisplayName: (name: string) => void;
  equipLoadout: (heroId: string, companionId: string) => void;
  equipCar: (carId: string) => void;
  claimFreeChest: () => void;
  recordRunResult: (telemetry: RunTelemetry) => void;
  purchaseShopItem: (
    itemType: 'hero' | 'companion' | 'car' | 'consumable' | 'chest',
    itemId: string,
    currency: 'coins' | 'gems',
    cost: number,
  ) => void;
  activateMultiplierBoost: () => void;
  claimMission: (missionId: string) => void;
  claimSeasonTier: (tier: number) => void;
  claimEventMilestone: (milestoneId: string) => void;
  claimAchievement: (achievementId: string) => void;
  fetchLeaderboard: () => void;
  searchPlayers: (query: string) => void;
  sendFriendRequest: (entry: LeaderboardEntry) => void;
  acceptFriendRequest: (
    requestId: string,
    fromUid: string,
    fromDisplayName: string,
    fromLevel: number,
  ) => void;
  declineFriendRequest: (requestId: string) => void;
  removeFriend: (friendUid: string) => void;
  sendFriendGift: (friendUid: string) => void;
  claimInboxMessage: (messageId: string) => void;
  claimAllInbox: () => void;
  purchaseUpgrade: (upgradeId: string, cost: number) => void;
  spendGemsForRevive: (cost: number) => void;
  signOut: () => void;
  clearChestReward: () => void;
  clearToast: () => void;
  showToast: (message: string) => void;
  toggleBoost: (key: keyof ActiveRunBoosts) => void;
  consumeBoostFlagsAfterRun: () => void;
}

export function useGameProfile(): {
  profile: PlayerProfile;
  social: SocialBundle;
  searchResults: LeaderboardEntry[];
  chestReward: ChestReward | null;
  toastMessage: string | null;
  selectedBoosts: ActiveRunBoosts;
  actions: GameProfileActions;
} {
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_FALLBACK_PROFILE);
  const [social, setSocial] = useState<SocialBundle>(EMPTY_SOCIAL);
  const [searchResults, setSearchResults] = useState<LeaderboardEntry[]>([]);
  const [chestReward, setChestReward] = useState<ChestReward | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedBoosts, setSelectedBoosts] = useState<ActiveRunBoosts>({
    useMagnet: false,
    useShield: false,
    useMultiplier: false,
    useHeadStart: false,
  });

  useEffect(() => {
    window.__ANIME_RUSH_BRIDGE_EVENT__ = (eventType: string, payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const obj = payload as Record<string, unknown>;
      switch (eventType) {
        case 'profile':
          setProfile(obj as unknown as PlayerProfile);
          break;
        case 'socialBundle':
          setSocial({
            friends: Array.isArray(obj.friends) ? obj.friends : [],
            friendRequests: Array.isArray(obj.friendRequests) ? obj.friendRequests : [],
            inbox: Array.isArray(obj.inbox) ? obj.inbox : [],
            leaderboard: Array.isArray(obj.leaderboard) ? obj.leaderboard : [],
          });
          break;
        case 'leaderboard':
          if (Array.isArray(obj.entries)) {
            setSocial((prev) => ({
              ...prev,
              leaderboard: obj.entries as LeaderboardEntry[],
            }));
          }
          break;
        case 'playerSearch':
          if (Array.isArray(obj.entries)) {
            setSearchResults(obj.entries as LeaderboardEntry[]);
          }
          break;
        case 'chestReward':
          setChestReward(obj as unknown as ChestReward);
          break;
        case 'purchaseSuccess':
          setToastMessage('Achat confirmé et sauvegardé !');
          break;
        case 'toast':
          if (typeof obj.message === 'string') {
            setToastMessage(obj.message);
          }
          break;
        case 'error':
          if (typeof obj.message === 'string') {
            setToastMessage(obj.message);
          }
          break;
      }
    };

    window.AndroidBridge?.requestSyncAll?.();

    return () => {
      delete window.__ANIME_RUSH_BRIDGE_EVENT__;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  const syncAll = useCallback(() => {
    window.AndroidBridge?.requestSyncAll?.();
  }, []);

  const updateDisplayName = useCallback((name: string) => {
    if (window.AndroidBridge?.updateDisplayName) {
      window.AndroidBridge.updateDisplayName(name);
    } else {
      setProfile((p) => ({ ...p, displayName: name.trim().slice(0, 24) || p.displayName }));
      setToastMessage('Pseudo mis à jour !');
    }
  }, []);

  const equipLoadout = useCallback((heroId: string, companionId: string) => {
    setProfile((p) => ({ ...p, equippedHeroId: heroId, equippedCompanionId: companionId }));
    window.AndroidBridge?.equipLoadout?.(heroId, companionId);
  }, []);

  const equipCar = useCallback((carId: string) => {
    setProfile((p) => ({ ...p, equippedCarId: carId }));
    window.AndroidBridge?.equipCar?.(carId);
  }, []);

  const claimFreeChest = useCallback(() => {
    if (window.AndroidBridge?.claimFreeChest) {
      window.AndroidBridge.claimFreeChest();
    } else {
      const nextAt = Date.now() + 4 * 60 * 60 * 1000;
      const reward: ChestReward = { coins: 275, gems: 12, xp: 180, nextFreeChestAt: nextAt };
      setChestReward(reward);
      setProfile((p) => ({
        ...p,
        coins: p.coins + reward.coins,
        gems: p.gems + reward.gems,
        xp: p.xp + reward.xp,
        nextFreeChestAt: nextAt,
      }));
    }
  }, []);

  const recordRunResult = useCallback((t: RunTelemetry) => {
    if (window.AndroidBridge?.recordRunResult) {
      window.AndroidBridge.recordRunResult(
        t.score,
        t.distance,
        t.coinsEarned,
        t.sakuraTokensEarned,
        t.jumps,
        t.slides,
        t.consumedMagnet,
        t.consumedShield,
        t.consumedMultiplier,
        t.consumedHeadStart,
      );
    } else {
      setProfile((p) => ({
        ...p,
        coins: p.coins + t.coinsEarned,
        bestScore: Math.max(p.bestScore, t.score),
        totalDistance: p.totalDistance + t.distance,
        totalRuns: p.totalRuns + 1,
        eventSakuraTokens: p.eventSakuraTokens + t.sakuraTokensEarned,
        dailyMissionCoins: p.dailyMissionCoins + t.coinsEarned,
        dailyMissionRuns: p.dailyMissionRuns + 1,
        weeklyMissionDistance: p.weeklyMissionDistance + t.distance,
        weeklyMissionJumps: p.weeklyMissionJumps + t.jumps,
      }));
    }
  }, []);

  const purchaseShopItem = useCallback(
    (
      itemType: 'hero' | 'companion' | 'car' | 'consumable' | 'chest',
      itemId: string,
      currency: 'coins' | 'gems',
      cost: number,
    ) => {
      if (window.AndroidBridge?.purchaseShopItem) {
        window.AndroidBridge.purchaseShopItem(itemType, itemId, currency, cost);
      } else {
        setProfile((p) => {
          const canPay = currency === 'coins' ? p.coins >= cost : p.gems >= cost;
          if (!canPay) return p;
          const nextCoins = currency === 'coins' ? p.coins - cost : p.coins;
          const nextGems = currency === 'gems' ? p.gems - cost : p.gems;
          if (itemType === 'hero') {
            return {
              ...p,
              coins: nextCoins,
              gems: nextGems,
              unlockedHeroIds: Array.from(new Set([...p.unlockedHeroIds, itemId])),
              equippedHeroId: itemId,
            };
          }
          if (itemType === 'companion') {
            return {
              ...p,
              coins: nextCoins,
              gems: nextGems,
              unlockedCompanionIds: Array.from(new Set([...p.unlockedCompanionIds, itemId])),
              equippedCompanionId: itemId,
            };
          }
          if (itemType === 'car') {
            return {
              ...p,
              coins: nextCoins,
              gems: nextGems,
              unlockedCarIds: Array.from(new Set([...p.unlockedCarIds, itemId])),
              equippedCarId: itemId,
            };
          }
          return { ...p, coins: nextCoins, gems: nextGems };
        });
        setToastMessage('Achat effectué (aperçu local)');
      }
    },
    [],
  );

  const activateMultiplierBoost = useCallback(() => {
    window.AndroidBridge?.activateMultiplierBoost?.();
  }, []);

  const claimMission = useCallback((missionId: string) => {
    window.AndroidBridge?.claimMission?.(missionId);
  }, []);

  const claimSeasonTier = useCallback((tier: number) => {
    window.AndroidBridge?.claimSeasonTier?.(tier);
  }, []);

  const claimEventMilestone = useCallback((milestoneId: string) => {
    window.AndroidBridge?.claimEventMilestone?.(milestoneId);
  }, []);

  const claimAchievement = useCallback((achievementId: string) => {
    window.AndroidBridge?.claimAchievement?.(achievementId);
  }, []);

  const fetchLeaderboard = useCallback(() => {
    window.AndroidBridge?.fetchLeaderboard?.();
  }, []);

  const searchPlayers = useCallback((query: string) => {
    window.AndroidBridge?.searchPlayers?.(query);
  }, []);

  const sendFriendRequest = useCallback((entry: LeaderboardEntry) => {
    window.AndroidBridge?.sendFriendRequest?.(
      entry.uid,
      entry.displayName,
      entry.level,
      entry.bestScore,
      entry.equippedHeroId,
      entry.equippedCompanionId,
    );
  }, []);

  const acceptFriendRequest = useCallback(
    (requestId: string, fromUid: string, fromDisplayName: string, fromLevel: number) => {
      window.AndroidBridge?.acceptFriendRequest?.(requestId, fromUid, fromDisplayName, fromLevel);
    },
    [],
  );

  const declineFriendRequest = useCallback((requestId: string) => {
    window.AndroidBridge?.declineFriendRequest?.(requestId);
  }, []);

  const removeFriend = useCallback((friendUid: string) => {
    window.AndroidBridge?.removeFriend?.(friendUid);
  }, []);

  const sendFriendGift = useCallback((friendUid: string) => {
    window.AndroidBridge?.sendFriendGift?.(friendUid);
  }, []);

  const claimInboxMessage = useCallback((messageId: string) => {
    window.AndroidBridge?.claimInboxMessage?.(messageId);
  }, []);

  const claimAllInbox = useCallback(() => {
    window.AndroidBridge?.claimAllInbox?.();
  }, []);

  const purchaseUpgrade = useCallback((upgradeId: string, cost: number) => {
    if (window.AndroidBridge?.purchaseUpgrade) {
      window.AndroidBridge.purchaseUpgrade(upgradeId, cost);
    } else {
      setProfile((p) => {
        if (p.coins < cost) return p;
        const field =
          upgradeId === 'upgrade_magnet'
            ? 'upgradeMagnetLevel'
            : upgradeId === 'upgrade_car'
              ? 'upgradeCarLevel'
              : upgradeId === 'upgrade_shield'
                ? 'upgradeShieldLevel'
                : 'upgradeScoreLevel';
        const cur = p[field];
        if (cur >= 5) return p;
        return { ...p, coins: p.coins - cost, [field]: cur + 1 };
      });
      setToastMessage('Amélioration renforcée (aperçu) !');
    }
  }, []);

  const spendGemsForRevive = useCallback((cost: number) => {
    if (window.AndroidBridge?.spendGemsForRevive) {
      window.AndroidBridge.spendGemsForRevive(cost);
    } else {
      setProfile((p) => (p.gems >= cost ? { ...p, gems: p.gems - cost } : p));
      setToastMessage('Seconde chance activée !');
    }
  }, []);

  const signOut = useCallback(() => {
    window.AndroidBridge?.signOut?.();
  }, []);

  const clearChestReward = useCallback(() => setChestReward(null), []);
  const clearToast = useCallback(() => setToastMessage(null), []);
  const showToast = useCallback((message: string) => setToastMessage(message), []);

  const toggleBoost = useCallback(
    (key: keyof ActiveRunBoosts) => {
      setSelectedBoosts((prev) => {
        if (key === 'useMagnet' && profile.inventoryMagnets <= 0 && !prev.useMagnet) return prev;
        if (key === 'useShield' && profile.inventoryShields <= 0 && !prev.useShield) return prev;
        if (key === 'useMultiplier' && profile.inventoryMultipliers <= 0 && !prev.useMultiplier)
          return prev;
        if (key === 'useHeadStart' && profile.inventoryHeadStarts <= 0 && !prev.useHeadStart)
          return prev;
        return { ...prev, [key]: !prev[key] };
      });
    },
    [
      profile.inventoryHeadStarts,
      profile.inventoryMagnets,
      profile.inventoryMultipliers,
      profile.inventoryShields,
    ],
  );

  const consumeBoostFlagsAfterRun = useCallback(() => {
    setSelectedBoosts({
      useMagnet: false,
      useShield: false,
      useMultiplier: false,
      useHeadStart: false,
    });
  }, []);

  return {
    profile,
    social,
    searchResults,
    chestReward,
    toastMessage,
    selectedBoosts,
    actions: {
      syncAll,
      updateDisplayName,
      equipLoadout,
      equipCar,
      claimFreeChest,
      recordRunResult,
      purchaseShopItem,
      activateMultiplierBoost,
      claimMission,
      claimSeasonTier,
      claimEventMilestone,
      claimAchievement,
      fetchLeaderboard,
      searchPlayers,
      sendFriendRequest,
      acceptFriendRequest,
      declineFriendRequest,
      removeFriend,
      sendFriendGift,
      claimInboxMessage,
      claimAllInbox,
      purchaseUpgrade,
      spendGemsForRevive,
      signOut,
      clearChestReward,
      clearToast,
      showToast,
      toggleBoost,
      consumeBoostFlagsAfterRun,
    },
  };
}
