import { PlayerProfile } from '../types/game';

export interface HeroDefinition {
  id: string;
  name: string;
  title: string;
  kanji: string;
  rarity: 'Commune' | 'Rare' | 'Épique' | 'Légendaire';
  description: string;
  bonusLabel: string;
  currency: 'coins' | 'gems';
  cost: number;
  primaryHex: number;
  accentHex: number;
  hairHex: number;
  hairTipHex: number;
  trimHex: number;
  uiAccent: string;
  badgeColor: string;
}

export interface CompanionDefinition {
  id: string;
  name: string;
  title: string;
  rarity: 'Fidèle' | 'Rare' | 'Mythique';
  description: string;
  bonusLabel: string;
  currency: 'coins' | 'gems';
  cost: number;
  coatHex: number;
  creamHex: number;
  bandanaHex: number;
  uiAccent: string;
}

export interface ShopItemDefinition {
  id: string;
  itemType: 'consumable' | 'chest';
  name: string;
  subtitle: string;
  currency: 'coins' | 'gems';
  cost: number;
  badge?: string;
  accent: string;
}

export interface CollectionCardDefinition {
  id: string;
  name: string;
  chapter: string;
  rarity: 'Argent' | 'Or' | 'Sakura' | 'Mythique';
  unlockHint: string;
  gradient: string;
  kanji: string;
}

export interface MissionDefinition {
  id: 'daily_coins' | 'daily_runs' | 'weekly_distance' | 'weekly_jumps';
  scope: 'daily' | 'weekly';
  title: string;
  target: number;
  rewardLabel: string;
  rewardKind: 'coins' | 'gems';
  rewardAmount: number;
  seasonXp: number;
  getProgress: (p: PlayerProfile) => number;
  isClaimed: (p: PlayerProfile) => boolean;
}

export interface AchievementDefinition {
  id: 'first_run' | 'distance_1km' | 'coins_1000' | 'acrobat_50' | 'score_10k';
  title: string;
  description: string;
  rewardGems: number;
  rewardXp: number;
  target: number;
  getCurrent: (p: PlayerProfile) => number;
}

export interface EventMilestoneDefinition {
  id: 'sakura_15' | 'sakura_40' | 'sakura_80';
  title: string;
  requiredTokens: number;
  rewardCoins: number;
  rewardGems: number;
  bonusCard?: string;
}

export const HERO_CATALOG: HeroDefinition[] = [
  {
    id: 'ryu',
    name: 'Ryu Hoshino',
    title: 'Coureur des Rails',
    kanji: '走',
    rarity: 'Rare',
    description: 'Jeune prodige au sweat rouge et noir. S’élance sur les rails de Tokyo avec son fidèle Shiba.',
    bonusLabel: 'Équilibré · Style Classique',
    currency: 'coins',
    cost: 0,
    primaryHex: 0x181b26,
    accentHex: 0xdc2626,
    hairHex: 0x17141d,
    hairTipHex: 0xef4444,
    trimHex: 0xf8fafc,
    uiAccent: '#ef4444',
    badgeColor: '#dc2626',
  },
  {
    id: 'akira_blue',
    name: 'Akira Volt',
    title: 'Éclair Shinkansen',
    kanji: '雷',
    rarity: 'Épique',
    description: 'Spécialiste des lignes express nocturnes. Veste bleu électrique et mèches cyan.',
    bonusLabel: '+15% XP de Saison en course',
    currency: 'coins',
    cost: 1500,
    primaryHex: 0x0f172a,
    accentHex: 0x0284c7,
    hairHex: 0x0f172a,
    hairTipHex: 0x38bdf8,
    trimHex: 0xe0f2fe,
    uiAccent: '#38bdf8',
    badgeColor: '#0284c7',
  },
  {
    id: 'sakura_kunoichi',
    name: 'Hana Sakura',
    title: 'Ombre des Cerisiers',
    kanji: '桜',
    rarity: 'Épique',
    description: 'Danseuse de rue agile vêtue d’un blouson rose sakura et d’un foulard blanc.',
    bonusLabel: 'Aime les pétales · Agilité maximale',
    currency: 'gems',
    cost: 45,
    primaryHex: 0x3b132b,
    accentHex: 0xec4899,
    hairHex: 0x2a1426,
    hairTipHex: 0xf9a8d4,
    trimHex: 0xfce7f3,
    uiAccent: '#f472b6',
    badgeColor: '#db2777',
  },
  {
    id: 'kuro_shadow',
    name: 'Kuro Kitsune',
    title: 'Légende Dorée',
    kanji: '影',
    rarity: 'Légendaire',
    description: 'Tenue de maître nocturne ornée d’or pur et de rubans écarlates.',
    bonusLabel: 'Prestige Légendaire du Sanctuaire',
    currency: 'gems',
    cost: 90,
    primaryHex: 0x111116,
    accentHex: 0xeab308,
    hairHex: 0x0f172a,
    hairTipHex: 0xfacc15,
    trimHex: 0xfef08a,
    uiAccent: '#facc15',
    badgeColor: '#ca8a04',
  },
];

export const COMPANION_CATALOG: CompanionDefinition[] = [
  {
    id: 'shiba_classic',
    name: 'Shiba Ninja',
    title: 'Compagnon Fidèle',
    rarity: 'Fidèle',
    description: 'Le Shiba roux au bandana noir "忍" qui bondit sur les rails aux côtés du héros.',
    bonusLabel: 'Aura amicale sur les rails',
    currency: 'coins',
    cost: 0,
    coatHex: 0xd95826,
    creamHex: 0xfff3dc,
    bandanaHex: 0x18181b,
    uiAccent: '#f97316',
  },
  {
    id: 'shiba_gold',
    name: 'Kintaro Doré',
    title: 'Shiba Impérial',
    rarity: 'Rare',
    description: 'Pelage or brillant avec foulard cramoisi du temple.',
    bonusLabel: 'Éclat doré en pleine vitesse',
    currency: 'coins',
    cost: 1200,
    coatHex: 0xf59e0b,
    creamHex: 0xfef9c3,
    bandanaHex: 0xb91c1c,
    uiAccent: '#facc15',
  },
  {
    id: 'kitsune_sakura',
    name: 'Mochi Kitsune',
    title: 'Esprit des Cerisiers',
    rarity: 'Mythique',
    description: 'Petit renard blanc-rosé bénit par les sakura d’Ueno.',
    bonusLabel: 'Sillage floral rose Sakura',
    currency: 'gems',
    cost: 40,
    coatHex: 0xf472b6,
    creamHex: 0xfff1f2,
    bandanaHex: 0x581c87,
    uiAccent: '#ec4899',
  },
];

export const SHOP_ITEMS: ShopItemDefinition[] = [
  {
    id: 'magnet',
    itemType: 'consumable',
    name: 'Aimant Neko',
    subtitle: 'Attire automatiquement les pièces pendant 12s.',
    currency: 'coins',
    cost: 150,
    accent: '#38bdf8',
  },
  {
    id: 'shield',
    itemType: 'consumable',
    name: 'Bouclier Dojo',
    subtitle: 'Absorbe un choc fatal pendant votre course.',
    currency: 'coins',
    cost: 200,
    accent: '#22c55e',
  },
  {
    id: 'headstart',
    itemType: 'consumable',
    name: 'Turbo Départ',
    subtitle: 'Propulse le héros à haute vitesse dès le départ (120m).',
    currency: 'coins',
    cost: 350,
    accent: '#f97316',
  },
  {
    id: 'multiplier_x5',
    itemType: 'consumable',
    name: 'Boost Multiplicateur x5',
    subtitle: 'Stocke un multiplicateur x5 activable à tout moment.',
    currency: 'coins',
    cost: 450,
    badge: 'POPULAIRE',
    accent: '#facc15',
  },
  {
    id: 'coins_chest',
    itemType: 'chest',
    name: 'Coffre Shinobi',
    subtitle: 'Contient 350 pièces + 1 Aimant + 1 Bouclier.',
    currency: 'gems',
    cost: 20,
    accent: '#38bdf8',
  },
  {
    id: 'sakura_chest',
    itemType: 'chest',
    name: 'Grand Coffre Sakura',
    subtitle: '800 pièces + 30 gemmes offertes + 1 Aimant + 1 Bouclier !',
    currency: 'gems',
    cost: 50,
    badge: 'MÉGA',
    accent: '#ec4899',
  },
];

export const COLLECTION_CARDS: CollectionCardDefinition[] = [
  {
    id: 'card_tokyo_rails',
    name: 'Rails de Tokyo',
    chapter: 'District 01 · Shinjuku',
    rarity: 'Argent',
    unlockHint: 'Débloquée dès votre arrivée dans Anime Rush.',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 55%, #ec4899 100%)',
    kanji: '鉄',
  },
  {
    id: 'card_torii_sanctuary',
    name: 'Portail Torii Vermillon',
    chapter: 'District 02 · Asakusa',
    rarity: 'Or',
    unlockHint: 'Parcourez 500 m cumulés au total.',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 55%, #facc15 100%)',
    kanji: '鳥',
  },
  {
    id: 'card_sakura_express',
    name: 'Express RUSH Sakura',
    chapter: 'District 03 · Ueno',
    rarity: 'Sakura',
    unlockHint: 'Collectez 5 jetons Sakura en 1 course ou 20 au total.',
    gradient: 'linear-gradient(135deg, #831843 0%, #ec4899 55%, #fbcfe8 100%)',
    kanji: '桜',
  },
  {
    id: 'card_fuji_dawn',
    name: 'Horizon Mont Fuji',
    chapter: 'District 04 · Sommet',
    rarity: 'Or',
    unlockHint: 'Atteignez un meilleur score de 5 000 pts.',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #4f46e5 55%, #f97316 100%)',
    kanji: '富',
  },
  {
    id: 'card_sakura_spirit',
    name: 'Esprit du Japon',
    chapter: 'District 05 · Sanctuaire',
    rarity: 'Mythique',
    unlockHint: 'Réclamez le dernier palier de l’événement Course des Sakura (80 jetons).',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #db2777 50%, #facc15 100%)',
    kanji: '神',
  },
];

export const MISSIONS_CATALOG: MissionDefinition[] = [
  {
    id: 'daily_coins',
    scope: 'daily',
    title: 'Collecte 500 pièces',
    target: 500,
    rewardLabel: '1 000',
    rewardKind: 'coins',
    rewardAmount: 1000,
    seasonXp: 40,
    getProgress: (p) => p.dailyMissionCoins,
    isClaimed: (p) => p.dailyMissionCoinsClaimed,
  },
  {
    id: 'daily_runs',
    scope: 'daily',
    title: 'Termine 3 courses',
    target: 3,
    rewardLabel: '600 + 10',
    rewardKind: 'coins',
    rewardAmount: 600,
    seasonXp: 50,
    getProgress: (p) => p.dailyMissionRuns,
    isClaimed: (p) => p.dailyMissionRunsClaimed,
  },
  {
    id: 'weekly_distance',
    scope: 'weekly',
    title: 'Fais 5 000 mètres',
    target: 5000,
    rewardLabel: '50',
    rewardKind: 'gems',
    rewardAmount: 50,
    seasonXp: 100,
    getProgress: (p) => p.weeklyMissionDistance,
    isClaimed: (p) => p.weeklyMissionDistanceClaimed,
  },
  {
    id: 'weekly_jumps',
    scope: 'weekly',
    title: 'Effectue 60 sauts',
    target: 60,
    rewardLabel: '1 500 + 20',
    rewardKind: 'gems',
    rewardAmount: 20,
    seasonXp: 80,
    getProgress: (p) => p.weeklyMissionJumps,
    isClaimed: (p) => p.weeklyMissionJumpsClaimed,
  },
];

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  {
    id: 'first_run',
    title: 'Première Course',
    description: 'Terminez votre première course à Tokyo Sakura.',
    rewardGems: 15,
    rewardXp: 150,
    target: 1,
    getCurrent: (p) => p.totalRuns,
  },
  {
    id: 'distance_1km',
    title: 'Coureur 1 km',
    description: 'Parcourez 1 000 mètres au total.',
    rewardGems: 25,
    rewardXp: 250,
    target: 1000,
    getCurrent: (p) => p.totalDistance,
  },
  {
    id: 'coins_1000',
    title: 'Chasseur de Neko Pièces',
    description: 'Collectez 1 000 pièces cumulées.',
    rewardGems: 30,
    rewardXp: 300,
    target: 1000,
    getCurrent: (p) => p.totalCoinsCollected,
  },
  {
    id: 'acrobat_50',
    title: 'Acrobate Shinobi',
    description: 'Effectuez 50 sauts ou glissades.',
    rewardGems: 35,
    rewardXp: 350,
    target: 50,
    getCurrent: (p) => p.totalJumps + p.totalSlides,
  },
  {
    id: 'score_10k',
    title: 'Maître des Rails',
    description: 'Atteignez un score de 10 000 points.',
    rewardGems: 50,
    rewardXp: 500,
    target: 10000,
    getCurrent: (p) => p.bestScore,
  },
];

export const EVENT_MILESTONES: EventMilestoneDefinition[] = [
  {
    id: 'sakura_15',
    title: 'Éveil des Pétales',
    requiredTokens: 15,
    rewardCoins: 400,
    rewardGems: 10,
  },
  {
    id: 'sakura_40',
    title: 'Sprint du Temple',
    requiredTokens: 40,
    rewardCoins: 800,
    rewardGems: 25,
  },
  {
    id: 'sakura_80',
    title: 'Esprit du Japon (Carte Mythique)',
    requiredTokens: 80,
    rewardCoins: 1500,
    rewardGems: 50,
    bonusCard: 'Carte Esprit du Japon',
  },
];

export interface SeasonTierInfo {
  tier: number;
  title: string;
  coinsReward: number;
  gemsReward: number;
  bonusLabel?: string;
}

export const SEASON_TIERS: SeasonTierInfo[] = Array.from({ length: 10 }, (_, idx) => {
  const tier = idx + 1;
  return {
    tier,
    title: tier === 5 ? 'Pack Turbo x5' : tier === 10 ? 'Maître Esprits du Japon' : `Palier ${tier}`,
    coinsReward: tier % 2 === 1 ? 300 + tier * 50 : 0,
    gemsReward: tier % 2 === 0 ? 15 + tier * 2 : 5,
    bonusLabel: tier === 5 ? '+1 Multiplicateur x5' : undefined,
  };
});

export function getHeroById(id: string): HeroDefinition {
  return HERO_CATALOG.find((h) => h.id === id) ?? HERO_CATALOG[0];
}

export function getCompanionById(id: string): CompanionDefinition {
  return COMPANION_CATALOG.find((c) => c.id === id) ?? COMPANION_CATALOG[0];
}
