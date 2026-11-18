import type { HeroActiveEffect, HeroPassiveType, PlayerProfile } from '../types/game';

export interface HeroPowerSpec {
  passiveType: HeroPassiveType;
  passiveValue: number;
  passiveLabel: string;
  activeName: string;
  activeDescription: string;
  activeEffect: HeroActiveEffect;
  activeDurationSec: number;
  chargeCostSec: number;
}

export interface HeroDefinition {
  id: string;
  name: string;
  title: string;
  kanji: string;
  category: 'Actuels' | 'Canoniques' | 'Spécial 3D' | 'Nouveaux';
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
  useMissMaiaModel?: boolean;
  power: HeroPowerSpec;
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

export interface CarDefinition {
  id: string;
  name: string;
  subtitle: string;
  rarity: 'Commune' | 'Rare' | 'Épique' | 'Légendaire';
  description: string;
  perkLabel: string;
  currency: 'coins' | 'gems';
  cost: number;
  bodyHex: number;
  hoodHex: number;
  neonHex: number;
  flameHex: number;
  rimHex: number;
  interiorHex: number;
  uiAccent: string;
  hasCheckeredStripe: boolean;
  hasTwinWing: boolean;
  extraDurationSec: number;
  turboSpeedBonus: number;
  coinBonusRate: number;
  scoreBonusRate: number;
  sakuraOnActivate: number;
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
  // ================= 4 ACTUELS =================
  {
    id: 'ryu',
    name: 'Ryu Hoshino',
    title: 'Coureur des Rails',
    kanji: '走',
    category: 'Actuels',
    rarity: 'Rare',
    description: 'Jeune prodige au sweat rouge et noir. S’élance sur les rails de Tokyo avec son fidèle Shiba.',
    bonusLabel: '+10% Score · Élan Torii',
    currency: 'coins',
    cost: 0,
    primaryHex: 0x181b26,
    accentHex: 0xdc2626,
    hairHex: 0x17141d,
    hairTipHex: 0xef4444,
    trimHex: 0xf8fafc,
    uiAccent: '#ef4444',
    badgeColor: '#dc2626',
    power: {
      passiveType: 'SCORE_BOOST',
      passiveValue: 0.1,
      passiveLabel: '+10% Score final en course',
      activeName: 'Élan Torii',
      activeDescription: 'Active un aimant à pièces magnétique pendant 8 secondes.',
      activeEffect: 'MAGNET_WAVE',
      activeDurationSec: 8,
      chargeCostSec: 18,
    },
  },
  {
    id: 'akira_blue',
    name: 'Akira Volt',
    title: 'Éclair Shinkansen',
    kanji: '雷',
    category: 'Actuels',
    rarity: 'Épique',
    description: 'Spécialiste des lignes express nocturnes. Veste bleu électrique et mèches cyan haute tension.',
    bonusLabel: '+20% Recharge · Surtension',
    currency: 'coins',
    cost: 1500,
    primaryHex: 0x0f172a,
    accentHex: 0x0284c7,
    hairHex: 0x0f172a,
    hairTipHex: 0x38bdf8,
    trimHex: 0xe0f2fe,
    uiAccent: '#38bdf8',
    badgeColor: '#0284c7',
    power: {
      passiveType: 'SKILL_HASTE',
      passiveValue: 0.2,
      passiveLabel: '+20% Recharge de compétence',
      activeName: 'Surtension Éclair',
      activeDescription: 'Détruit les obstacles sur la piste et déclenche une onde magnétique.',
      activeEffect: 'SONIC_BLAST',
      activeDurationSec: 4,
      chargeCostSec: 16,
    },
  },
  {
    id: 'sakura_kunoichi',
    name: 'Hana Sakura',
    title: 'Ombre des Cerisiers',
    kanji: '桜',
    category: 'Actuels',
    rarity: 'Épique',
    description: 'Danseuse de rue agile vêtue d’un blouson rose sakura et d’un foulard blanc.',
    bonusLabel: '+20% Pièces · Tempête Sakura',
    currency: 'gems',
    cost: 45,
    primaryHex: 0x3b132b,
    accentHex: 0xec4899,
    hairHex: 0x2a1426,
    hairTipHex: 0xf9a8d4,
    trimHex: 0xfce7f3,
    uiAccent: '#f472b6',
    badgeColor: '#db2777',
    power: {
      passiveType: 'COIN_BONUS',
      passiveValue: 0.2,
      passiveLabel: '+20% Pièces gagnées en course',
      activeName: 'Tempête de Pétales',
      activeDescription: 'Blitz invincible de 5 secondes avec +3 jetons Sakura garantis.',
      activeEffect: 'SAKURA_BURST',
      activeDurationSec: 5,
      chargeCostSec: 20,
    },
  },
  {
    id: 'kuro_shadow',
    name: 'Kuro Kitsune',
    title: 'Légende Dorée',
    kanji: '影',
    category: 'Actuels',
    rarity: 'Légendaire',
    description: 'Tenue de maître nocturne ornée d’or pur et de rubans écarlates.',
    bonusLabel: '+25% Score · Éclipse x2',
    currency: 'gems',
    cost: 90,
    primaryHex: 0x111116,
    accentHex: 0xeab308,
    hairHex: 0x0f172a,
    hairTipHex: 0xfacc15,
    trimHex: 0xfef08a,
    uiAccent: '#facc15',
    badgeColor: '#ca8a04',
    power: {
      passiveType: 'SCORE_BOOST',
      passiveValue: 0.25,
      passiveLabel: '+25% Multiplicateur de score',
      activeName: 'Éclipse Dorée',
      activeDescription: 'Double temporairement votre multiplicateur de score pendant 8 secondes.',
      activeEffect: 'SCORE_OVERDRIVE',
      activeDurationSec: 8,
      chargeCostSec: 20,
    },
  },

  // ================= 8 HÉROS CANONIQUES =================
  {
    id: 'sigma',
    name: 'Sigma',
    title: 'Sentinelle Cybernétique',
    kanji: 'Σ',
    category: 'Canoniques',
    rarity: 'Légendaire',
    description: 'Héros tactique de la ligne centrale, équipé d’un manteau bleu nuit et de bandes cyan néon.',
    bonusLabel: '+30% Essence · Matrice Zéro',
    currency: 'coins',
    cost: 2400,
    primaryHex: 0x0b162c,
    accentHex: 0x06b6d4,
    hairHex: 0x1e293b,
    hairTipHex: 0x67e8f9,
    trimHex: 0xe2e8f0,
    uiAccent: '#22d3ee',
    badgeColor: '#0891b2',
    power: {
      passiveType: 'FUEL_EFFICIENCY',
      passiveValue: 0.3,
      passiveLabel: '+30% Charge des bidons d’essence',
      activeName: 'Matrice Zéro',
      activeDescription: 'Active un bouclier énergétique et pulvérise les obstacles proches.',
      activeEffect: 'SHIELD_SURGE',
      activeDurationSec: 6,
      chargeCostSec: 17,
    },
  },
  {
    id: 'mondesir',
    name: 'Mondesir',
    title: 'Souverain de l’Aube',
    kanji: '皇',
    category: 'Canoniques',
    rarity: 'Épique',
    description: 'Combattant charismatique au gilet émeraude et galons dorés royaux.',
    bonusLabel: '+25% Pièces · Aimant Royal',
    currency: 'coins',
    cost: 1800,
    primaryHex: 0x064e3b,
    accentHex: 0xf59e0b,
    hairHex: 0x111827,
    hairTipHex: 0xfde047,
    trimHex: 0xfef3c7,
    uiAccent: '#fbbf24',
    badgeColor: '#d97706',
    power: {
      passiveType: 'COIN_BONUS',
      passiveValue: 0.25,
      passiveLabel: '+25% Pièces collectées',
      activeName: 'Attraction Impériale',
      activeDescription: 'Déploie un aimant ultra-puissant pendant 10 secondes.',
      activeEffect: 'MAGNET_WAVE',
      activeDurationSec: 10,
      chargeCostSec: 18,
    },
  },
  {
    id: 'ulysse',
    name: 'Ulysse',
    title: 'Navigateur des Voies',
    kanji: '帆',
    category: 'Canoniques',
    rarity: 'Rare',
    description: 'Explorateur intrépide arborant les couleurs bleu marin et blanc argenté.',
    bonusLabel: 'Bouclier Départ · Égide',
    currency: 'coins',
    cost: 900,
    primaryHex: 0x1e3a8a,
    accentHex: 0x60a5fa,
    hairHex: 0x3b2f2f,
    hairTipHex: 0x93c5fd,
    trimHex: 0xf8fafc,
    uiAccent: '#60a5fa',
    badgeColor: '#2563eb',
    power: {
      passiveType: 'START_SHIELD',
      passiveValue: 1,
      passiveLabel: 'Démarre chaque course avec un Bouclier',
      activeName: 'Égide d’Odyssée',
      activeDescription: 'Restaure instantanément votre bouclier de protection.',
      activeEffect: 'SHIELD_SURGE',
      activeDurationSec: 5,
      chargeCostSec: 19,
    },
  },
  {
    id: 'manus',
    name: 'Manus',
    title: 'Poing d’Acier',
    kanji: '拳',
    category: 'Canoniques',
    rarity: 'Épique',
    description: 'Arts martiaux et puissance brute, vêtu d’une armure sombre et rubans bordeaux.',
    bonusLabel: '+25% Recharge · Impact Titan',
    currency: 'coins',
    cost: 1600,
    primaryHex: 0x271722,
    accentHex: 0xe11d48,
    hairHex: 0x1c1917,
    hairTipHex: 0xfb7185,
    trimHex: 0xd6d3d1,
    uiAccent: '#f43f5e',
    badgeColor: '#be123c',
    power: {
      passiveType: 'SKILL_HASTE',
      passiveValue: 0.25,
      passiveLabel: '+25% Vitesse de recharge du pouvoir',
      activeName: 'Impact Titan',
      activeDescription: 'Propulse une onde de choc brisant tous les obstacles devant vous.',
      activeEffect: 'SONIC_BLAST',
      activeDurationSec: 4,
      chargeCostSec: 16,
    },
  },
  {
    id: 'james',
    name: 'James',
    title: 'As de la Conduite',
    kanji: '星',
    category: 'Canoniques',
    rarity: 'Rare',
    description: 'Pilote élégant au blouson noir et lisérés turquoise, maître des ravitaillements rapides.',
    bonusLabel: '+4s Aimant · Injection Nitro',
    currency: 'coins',
    cost: 1100,
    primaryHex: 0x111827,
    accentHex: 0x14b8a6,
    hairHex: 0x292524,
    hairTipHex: 0x2dd4bf,
    trimHex: 0xf1f5f9,
    uiAccent: '#2dd4bf',
    badgeColor: '#0d9488',
    power: {
      passiveType: 'MAGNET_DURATION',
      passiveValue: 4,
      passiveLabel: '+4s de durée pour chaque Aimant',
      activeName: 'Injection Nitro',
      activeDescription: 'Ajoute +50% à la jauge d’essence voiture et accélère la course.',
      activeEffect: 'FUEL_INJECT',
      activeDurationSec: 4,
      chargeCostSec: 17,
    },
  },
  {
    id: 'raphael',
    name: 'Raphaël',
    title: 'Aile Céleste',
    kanji: '翼',
    category: 'Canoniques',
    rarity: 'Légendaire',
    description: 'Guerrier lumineux en tenue blanc nacré rehaussée de dorures célestes.',
    bonusLabel: '+25% Score · Envol Séraphin',
    currency: 'gems',
    cost: 75,
    primaryHex: 0xe2e8f0,
    accentHex: 0xf59e0b,
    hairHex: 0x78350f,
    hairTipHex: 0xfef08a,
    trimHex: 0xffffff,
    uiAccent: '#fde047',
    badgeColor: '#ca8a04',
    power: {
      passiveType: 'SCORE_BOOST',
      passiveValue: 0.25,
      passiveLabel: '+25% Score final de course',
      activeName: 'Envol Séraphin',
      activeDescription: 'Sprint invincible 5,5s attirant les pièces alentour.',
      activeEffect: 'SAKURA_BURST',
      activeDurationSec: 5.5,
      chargeCostSec: 19,
    },
  },
  {
    id: 'dragnir',
    name: 'Dragnir',
    title: 'Flamme Draconique',
    kanji: '炎',
    category: 'Canoniques',
    rarity: 'Légendaire',
    description: 'Écaille noire et écharpe de braise vive. Libère une énergie incandescente sur la piste.',
    bonusLabel: '+35% Essence · Souffle Ignis',
    currency: 'gems',
    cost: 85,
    primaryHex: 0x1c1917,
    accentHex: 0xf97316,
    hairHex: 0x7c2d12,
    hairTipHex: 0xfb923c,
    trimHex: 0xfef08a,
    uiAccent: '#fb923c',
    badgeColor: '#ea580c',
    power: {
      passiveType: 'FUEL_EFFICIENCY',
      passiveValue: 0.35,
      passiveLabel: '+35% Charge d’essence par bidon',
      activeName: 'Souffle Ignis',
      activeDescription: 'Injecte +50% d’essence voiture et consume les obstacles devant vous.',
      activeEffect: 'FUEL_INJECT',
      activeDurationSec: 5,
      chargeCostSec: 16,
    },
  },
  {
    id: 'kael',
    name: 'Kaël',
    title: 'Tempête Azur',
    kanji: '嵐',
    category: 'Canoniques',
    rarity: 'Épique',
    description: 'Coureur rapide à cape indigo et mèches turquoise, taillé pour les records.',
    bonusLabel: '+30% Recharge · Surcharge x2',
    currency: 'gems',
    cost: 50,
    primaryHex: 0x1e1b4b,
    accentHex: 0x22d3ee,
    hairHex: 0x0f172a,
    hairTipHex: 0xa5f3fc,
    trimHex: 0xc7d2fe,
    uiAccent: '#38bdf8',
    badgeColor: '#0284c7',
    power: {
      passiveType: 'SKILL_HASTE',
      passiveValue: 0.3,
      passiveLabel: '+30% Vitesse de recharge du pouvoir',
      activeName: 'Vortex Azur',
      activeDescription: 'Multiplicateur x2 temporaire pendant 8 secondes.',
      activeEffect: 'SCORE_OVERDRIVE',
      activeDurationSec: 8,
      chargeCostSec: 17,
    },
  },

  // ================= HÉROÏNE 3D SPÉCIALE (DOSSIER MISS MAIA) =================
  {
    id: 'miss_maia',
    name: 'Miss Maia',
    title: 'Graffiti Queen 3D',
    kanji: '塗',
    category: 'Spécial 3D',
    rarity: 'Épique',
    description: 'Artiste urbaine armée de sa bombe de peinture ! Modèle 3D authentique et textures graffiti.',
    bonusLabel: '+25% Pièces · Tag Explosif',
    currency: 'coins',
    cost: 2000,
    primaryHex: 0x581c87,
    accentHex: 0xf97316,
    hairHex: 0xf59e0b,
    hairTipHex: 0xf472b6,
    trimHex: 0xfef08a,
    uiAccent: '#fb923c',
    badgeColor: '#c026d3',
    useMissMaiaModel: true,
    power: {
      passiveType: 'COIN_BONUS',
      passiveValue: 0.25,
      passiveLabel: '+25% Pièces + bonus graffiti',
      activeName: 'Tag Explosif',
      activeDescription: 'Pulvérise les obstacles proches et déclenche un aimant à pièces 6s.',
      activeEffect: 'SONIC_BLAST',
      activeDurationSec: 6,
      chargeCostSec: 17,
    },
  },

  // ================= 7 NOUVEAUX COUREURS ANIME =================
  {
    id: 'sora_kaze',
    name: 'Sora Kaze',
    title: 'Brise d’Ueno',
    kanji: '颯',
    category: 'Nouveaux',
    rarity: 'Commune',
    description: 'Jeune athlète vert jade qui glisse entre les rames du métro avec souplesse.',
    bonusLabel: '+3s Aimant · Bourrasque',
    currency: 'coins',
    cost: 600,
    primaryHex: 0x0f3b2e,
    accentHex: 0x10b981,
    hairHex: 0x1f2937,
    hairTipHex: 0x6ee7b7,
    trimHex: 0xecfdf5,
    uiAccent: '#34d399',
    badgeColor: '#059669',
    power: {
      passiveType: 'MAGNET_DURATION',
      passiveValue: 3,
      passiveLabel: '+3s de durée pour les Aimants',
      activeName: 'Bourrasque Verte',
      activeDescription: 'Aimante toutes les pièces sur les 3 voies pendant 9s.',
      activeEffect: 'MAGNET_WAVE',
      activeDurationSec: 9,
      chargeCostSec: 18,
    },
  },
  {
    id: 'mei_cyber',
    name: 'Mei Cyber',
    title: 'Hackeuse Akihabara',
    kanji: '電',
    category: 'Nouveaux',
    rarity: 'Rare',
    description: 'Tenue néon violette et visière électrique taillée pour les courses nocturnes.',
    bonusLabel: '+20% Recharge · Piratage x2',
    currency: 'coins',
    cost: 1200,
    primaryHex: 0x2e1065,
    accentHex: 0xd946ef,
    hairHex: 0x1e1b4b,
    hairTipHex: 0x22d3ee,
    trimHex: 0xf5d0fe,
    uiAccent: '#e879f9',
    badgeColor: '#c026d3',
    power: {
      passiveType: 'SKILL_HASTE',
      passiveValue: 0.2,
      passiveLabel: '+20% Vitesse de recharge du pouvoir',
      activeName: 'Piratage Néon',
      activeDescription: 'Double votre multiplicateur de score pendant 8 secondes.',
      activeEffect: 'SCORE_OVERDRIVE',
      activeDurationSec: 8,
      chargeCostSec: 18,
    },
  },
  {
    id: 'ren_ronin',
    name: 'Ren Ronin',
    title: 'Garde du Sanctuaire',
    kanji: '斬',
    category: 'Nouveaux',
    rarity: 'Épique',
    description: 'Veste kimono anthracite et bordures pourpres, imperturbable face aux obstacles.',
    bonusLabel: 'Bouclier Départ · Lame',
    currency: 'coins',
    cost: 1900,
    primaryHex: 0x18181b,
    accentHex: 0x991b1b,
    hairHex: 0x09090b,
    hairTipHex: 0xf87171,
    trimHex: 0xfca5a5,
    uiAccent: '#f87171',
    badgeColor: '#991b1b',
    power: {
      passiveType: 'START_SHIELD',
      passiveValue: 1,
      passiveLabel: 'Bouclier Dojo activé dès le départ',
      activeName: 'Lame Écarlate',
      activeDescription: 'Tranche les obstacles à l’avant et accorde un bouclier.',
      activeEffect: 'SHIELD_SURGE',
      activeDurationSec: 5,
      chargeCostSec: 18,
    },
  },
  {
    id: 'yuki_frost',
    name: 'Yuki Frost',
    title: 'Éclat de Cristal',
    kanji: '氷',
    category: 'Nouveaux',
    rarity: 'Rare',
    description: 'Coureuse des sommets du Mont Fuji en manteau bleu glacier et écharpe blanche.',
    bonusLabel: '+18% Score · Givre Éternel',
    currency: 'coins',
    cost: 1350,
    primaryHex: 0x0c4a6e,
    accentHex: 0x7dd3fc,
    hairHex: 0xe0f2fe,
    hairTipHex: 0x38bdf8,
    trimHex: 0xffffff,
    uiAccent: '#7dd3fc',
    badgeColor: '#0284c7',
    power: {
      passiveType: 'SCORE_BOOST',
      passiveValue: 0.18,
      passiveLabel: '+18% Score final en course',
      activeName: 'Armure de Givre',
      activeDescription: 'Crée un bouclier glacé et aimante les pièces 5 secondes.',
      activeEffect: 'SHIELD_SURGE',
      activeDurationSec: 5,
      chargeCostSec: 17,
    },
  },
  {
    id: 'tora_blaze',
    name: 'Tora Blaze',
    title: 'Tigre des Circuits',
    kanji: '虎',
    category: 'Nouveaux',
    rarity: 'Épique',
    description: 'Pilote flamboyant aux rayures ambre et noires obsédé par le turbo cabriolet.',
    bonusLabel: '+30% Essence · Rugissement',
    currency: 'gems',
    cost: 55,
    primaryHex: 0x1c1917,
    accentHex: 0xf59e0b,
    hairHex: 0x92400e,
    hairTipHex: 0xfacc15,
    trimHex: 0xfef3c7,
    uiAccent: '#f59e0b',
    badgeColor: '#d97706',
    power: {
      passiveType: 'FUEL_EFFICIENCY',
      passiveValue: 0.3,
      passiveLabel: '+30% Essence par bidon récupéré',
      activeName: 'Rugissement Nitro',
      activeDescription: 'Remplit +50% du réservoir voiture et déclenche un sprint.',
      activeEffect: 'FUEL_INJECT',
      activeDurationSec: 4.5,
      chargeCostSec: 16,
    },
  },
  {
    id: 'nori_phantom',
    name: 'Nori Phantom',
    title: 'Furtif de Shinjuku',
    kanji: '忍',
    category: 'Nouveaux',
    rarity: 'Épique',
    description: 'Shinobi nocturne à l’écharpe magenta électrique qui fond sur les pièces.',
    bonusLabel: '+20% Pièces · Pas de l’Ombre',
    currency: 'coins',
    cost: 2200,
    primaryHex: 0x13111c,
    accentHex: 0xa855f7,
    hairHex: 0x0f172a,
    hairTipHex: 0xe879f9,
    trimHex: 0xf3e8ff,
    uiAccent: '#c084fc',
    badgeColor: '#9333ea',
    power: {
      passiveType: 'COIN_BONUS',
      passiveValue: 0.2,
      passiveLabel: '+20% Pièces gagnées en course',
      activeName: 'Pas de l’Ombre',
      activeDescription: 'Course invincible de 5 secondes à grande vitesse.',
      activeEffect: 'SAKURA_BURST',
      activeDurationSec: 5,
      chargeCostSec: 18,
    },
  },
  {
    id: 'kaito_nova',
    name: 'Kaito Nova',
    title: 'Étoile Suprême',
    kanji: '宙',
    category: 'Nouveaux',
    rarity: 'Légendaire',
    description: 'Tenue cosmique bleu roi et or stellaire réunissant vitesse, aimant et protection.',
    bonusLabel: '+30% Score · Supernova',
    currency: 'gems',
    cost: 95,
    primaryHex: 0x0f172a,
    accentHex: 0x38bdf8,
    hairHex: 0x1e1b4b,
    hairTipHex: 0xfacc15,
    trimHex: 0xfef08a,
    uiAccent: '#facc15',
    badgeColor: '#0284c7',
    power: {
      passiveType: 'SCORE_BOOST',
      passiveValue: 0.3,
      passiveLabel: '+30% Score final en course',
      activeName: 'Supernova',
      activeDescription: 'Déclenche Bouclier + Aimant 10s + Destruction d’obstacles !',
      activeEffect: 'SUPERNOVA',
      activeDurationSec: 10,
      chargeCostSec: 21,
    },
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

export const CAR_CATALOG: CarDefinition[] = [
  {
    id: 'yellow_cab_gt',
    name: 'Yellow Cab GT',
    subtitle: 'Cabriolet Tokyo Damier',
    rarity: 'Commune',
    description: 'Cabriolet jaune iconique inspiré du YellowCab avec bande damier et aimant 10s.',
    perkLabel: 'Aimant 10s + Vitesse 30,5 m/s',
    currency: 'coins',
    cost: 0,
    bodyHex: 0xfacc15,
    hoodHex: 0xf97316,
    neonHex: 0x22d3ee,
    flameHex: 0xf97316,
    rimHex: 0xe2e8f0,
    interiorHex: 0x0f172a,
    uiAccent: '#facc15',
    hasCheckeredStripe: true,
    hasTwinWing: false,
    extraDurationSec: 0,
    turboSpeedBonus: 0,
    coinBonusRate: 0,
    scoreBonusRate: 0,
    sakuraOnActivate: 0,
  },
  {
    id: 'red_dragon_roadster',
    name: 'Dragon Écarlate',
    subtitle: 'Roadster GT Biturbo',
    rarity: 'Rare',
    description: 'Carrosserie rouge flamme, double aileron sport et autonomie prolongée.',
    perkLabel: '+2s Durée Turbo (12s) + Vitesse +2 m/s',
    currency: 'coins',
    cost: 1400,
    bodyHex: 0xdc2626,
    hoodHex: 0xf97316,
    neonHex: 0xfacc15,
    flameHex: 0xfef08a,
    rimHex: 0xfef08a,
    interiorHex: 0x1c1917,
    uiAccent: '#ef4444',
    hasCheckeredStripe: false,
    hasTwinWing: true,
    extraDurationSec: 2,
    turboSpeedBonus: 2.0,
    coinBonusRate: 0,
    scoreBonusRate: 0,
    sakuraOnActivate: 0,
  },
  {
    id: 'sakura_spider',
    name: 'Sakura Spider',
    subtitle: 'Édition Cerisier Nacré',
    rarity: 'Épique',
    description: 'Décapotable rose nacré ornée d’accents dorés qui multiplie les pièces collectées.',
    perkLabel: '+25% Pièces pendant le mode Voiture',
    currency: 'gems',
    cost: 40,
    bodyHex: 0xec4899,
    hoodHex: 0xf472b6,
    neonHex: 0xfbcfe8,
    flameHex: 0xf472b6,
    rimHex: 0xfde047,
    interiorHex: 0x3b0764,
    uiAccent: '#f472b6',
    hasCheckeredStripe: false,
    hasTwinWing: false,
    extraDurationSec: 1,
    turboSpeedBonus: 1.0,
    coinBonusRate: 0.25,
    scoreBonusRate: 0,
    sakuraOnActivate: 1,
  },
  {
    id: 'cyber_kitsune',
    name: 'Cyber Kitsune EV',
    subtitle: 'Prototype Néon Akihabara',
    rarity: 'Épique',
    description: 'Châssis carbone bleu nuit propulsé par des turbines plasma cyan.',
    perkLabel: '+4,5 m/s Vitesse Turbo + +15% Score',
    currency: 'coins',
    cost: 2100,
    bodyHex: 0x0284c7,
    hoodHex: 0x0f172a,
    neonHex: 0x22d3ee,
    flameHex: 0x38bdf8,
    rimHex: 0x38bdf8,
    interiorHex: 0x090d1e,
    uiAccent: '#22d3ee',
    hasCheckeredStripe: true,
    hasTwinWing: true,
    extraDurationSec: 1,
    turboSpeedBonus: 4.5,
    coinBonusRate: 0,
    scoreBonusRate: 0.15,
    sakuraOnActivate: 0,
  },
  {
    id: 'emerald_oni',
    name: 'Oni Émeraude',
    subtitle: 'Coupe Drift Ueno',
    rarity: 'Rare',
    description: 'Peinture jade métallisée taillée pour accumuler des points de score.',
    perkLabel: '+30% Score pendant le mode Voiture',
    currency: 'coins',
    cost: 1850,
    bodyHex: 0x059669,
    hoodHex: 0x10b981,
    neonHex: 0x6ee7b7,
    flameHex: 0x34d399,
    rimHex: 0xd1fae5,
    interiorHex: 0x022c22,
    uiAccent: '#34d399',
    hasCheckeredStripe: false,
    hasTwinWing: true,
    extraDurationSec: 1.5,
    turboSpeedBonus: 1.5,
    coinBonusRate: 0.1,
    scoreBonusRate: 0.3,
    sakuraOnActivate: 0,
  },
  {
    id: 'golden_shogun',
    name: 'Shogun Impérial',
    subtitle: 'Cabriolet Légendaire Or',
    rarity: 'Légendaire',
    description: 'Or massif et carbone impérial : durée max, vitesse suprême et jetons Sakura.',
    perkLabel: 'Durée 13s + +25% Pièces & Score + 2 Sakura',
    currency: 'gems',
    cost: 80,
    bodyHex: 0xeab308,
    hoodHex: 0x111827,
    neonHex: 0xfef08a,
    flameHex: 0xf97316,
    rimHex: 0xfef08a,
    interiorHex: 0x18181b,
    uiAccent: '#fde047',
    hasCheckeredStripe: true,
    hasTwinWing: true,
    extraDurationSec: 3,
    turboSpeedBonus: 4.0,
    coinBonusRate: 0.25,
    scoreBonusRate: 0.25,
    sakuraOnActivate: 2,
  },
];

export function getHeroById(id: string): HeroDefinition {
  return HERO_CATALOG.find((h) => h.id === id) ?? HERO_CATALOG[0];
}

export function getCompanionById(id: string): CompanionDefinition {
  return COMPANION_CATALOG.find((c) => c.id === id) ?? COMPANION_CATALOG[0];
}

export function getCarById(id: string): CarDefinition {
  return CAR_CATALOG.find((car) => car.id === id) ?? CAR_CATALOG[0];
}
