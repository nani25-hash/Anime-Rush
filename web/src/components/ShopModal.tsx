import React, { useEffect, useMemo, useState } from 'react';
import { CAPSULE_DOJO_COSTS, CAPSULE_DOJO_ODDS, SHOP_ITEMS } from '../config/catalog';
import { ActiveRunBoosts, GachaDrawResult, PlayerProfile } from '../types/game';
import {
  ChestIcon,
  CloseIcon,
  CoinIcon,
  GemIcon,
  MagnetIcon,
  SakuraIcon,
  ShieldIcon,
} from './Icons';

interface ShopModalProps {
  initialTab?: 'shop' | 'inventory' | 'capsule';
  profile: PlayerProfile;
  selectedBoosts: ActiveRunBoosts;
  gachaResult: GachaDrawResult | null;
  onBuyItem: (
    itemType: 'consumable' | 'chest',
    itemId: string,
    currency: 'coins' | 'gems',
    cost: number,
  ) => void;
  onToggleBoost: (key: keyof ActiveRunBoosts) => void;
  onActivateMultiplier: () => void;
  onDrawCapsule: (currencyMode: 'coins' | 'sakura') => void;
  onClearGachaResult: () => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  initialTab = 'shop',
  profile,
  selectedBoosts,
  gachaResult,
  onBuyItem,
  onToggleBoost,
  onActivateMultiplier,
  onDrawCapsule,
  onClearGachaResult,
  onClose,
}) => {
  const [tab, setTab] = useState<'shop' | 'inventory' | 'capsule'>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const totalInventoryCount =
    profile.inventoryMagnets +
    profile.inventoryShields +
    profile.inventoryMultipliers +
    profile.inventoryHeadStarts;

  const armedBoostCount = useMemo(
    () =>
      Number(selectedBoosts.useMagnet) +
      Number(selectedBoosts.useShield) +
      Number(selectedBoosts.useMultiplier) +
      Number(selectedBoosts.useHeadStart),
    [selectedBoosts],
  );

  const renderIcon = (id: string) => {
    if (id === 'magnet') return <MagnetIcon size={28} />;
    if (id === 'shield') return <ShieldIcon size={28} />;
    if (id === 'coins_chest' || id === 'sakura_chest') return <ChestIcon size={30} />;
    if (id === 'multiplier_x5') return <span className="shop-glyph">x5</span>;
    return <span className="shop-glyph">⚡</span>;
  };

  const getOwnedQty = (id: string): number | null => {
    if (id === 'magnet') return profile.inventoryMagnets;
    if (id === 'shield') return profile.inventoryShields;
    if (id === 'headstart') return profile.inventoryHeadStarts;
    if (id === 'multiplier_x5') return profile.inventoryMultipliers;
    return null;
  };

  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div
        className="sheet-card"
        onClick={(e) => e.stopPropagation()}
        data-testid={tab === 'inventory' ? 'inventory-modal' : 'shop-modal'}
      >
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">
              {tab === 'shop'
                ? 'BOUTIQUE SHINOBI'
                : tab === 'inventory'
                  ? 'INVENTAIRE & BOOSTS'
                  : 'CAPSULE DOJO (GACHA)'}
            </h2>
            <p className="sheet-sub">
              {tab === 'shop'
                ? 'Équipez-vous et stockez des bonus pour vos courses'
                : tab === 'inventory'
                  ? 'Activez vos bonus avant de toucher l’écran pour jouer'
                  : 'Tentez de gagner des boosts x5, gemmes ou un skin exclusif !'}
            </p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet-balance-bar">
          <span className="balance-pill tabular">
            <CoinIcon size={16} /> {profile.coins.toLocaleString('fr-FR')}
          </span>
          <span className="balance-pill tabular">
            <GemIcon size={16} /> {profile.gems.toLocaleString('fr-FR')}
          </span>
          <span className="balance-pill tabular">
            <SakuraIcon size={16} /> {profile.eventSakuraTokens}
          </span>
        </div>

        <div className="sheet-tabs" role="tablist" aria-label="Boutique, Inventaire et Capsule">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'shop'}
            className={`sheet-tab ${tab === 'shop' ? 'active' : ''}`}
            onClick={() => setTab('shop')}
            data-testid="shop-tab-shop"
          >
            BOUTIQUE
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'inventory'}
            className={`sheet-tab mission-scope-tab ${tab === 'inventory' ? 'active' : ''}`}
            onClick={() => setTab('inventory')}
            data-testid="shop-tab-inventory"
          >
            <span>INVENTAIRE ({totalInventoryCount})</span>
            {armedBoostCount > 0 && (
              <span className="mission-tab-badge tabular">{armedBoostCount}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'capsule'}
            className={`sheet-tab ${tab === 'capsule' ? 'active' : ''}`}
            onClick={() => setTab('capsule')}
            data-testid="shop-tab-capsule"
          >
            CAPSULE
          </button>
        </div>

        <div className="sheet-scroll">
          {tab === 'shop' ? (
            <div className="cards-list">
              {SHOP_ITEMS.map((item) => {
                const affordable =
                  item.currency === 'coins'
                    ? profile.coins >= item.cost
                    : profile.gems >= item.cost;
                const stock = getOwnedQty(item.id);

                return (
                  <div
                    key={item.id}
                    className="shop-row-card"
                    style={{ borderColor: `${item.accent}66` }}
                  >
                    <div className="shop-icon-box" style={{ background: `${item.accent}22` }}>
                      {renderIcon(item.id)}
                    </div>
                    <div className="shop-info">
                      <div className="shop-name-row">
                        <span className="shop-name">{item.name}</span>
                        {item.badge && <span className="tag-pill">{item.badge}</span>}
                        {stock !== null && (
                          <span className="tag-pill tabular">Stock : x{stock}</span>
                        )}
                      </div>
                      <p className="shop-desc">{item.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      className={`price-btn ${affordable ? '' : 'disabled'}`}
                      disabled={!affordable}
                      onClick={() => onBuyItem(item.itemType, item.id, item.currency, item.cost)}
                      data-testid={`buy-${item.id}`}
                    >
                      {item.currency === 'coins' ? <CoinIcon size={15} /> : <GemIcon size={15} />}
                      <span className="tabular">{item.cost}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : tab === 'inventory' ? (
            <div className="cards-list">
              <div className="shop-row-card">
                <div className="shop-icon-box" style={{ background: '#38bdf822' }}>
                  <MagnetIcon size={26} />
                </div>
                <div className="shop-info">
                  <div className="shop-name-row">
                    <span className="shop-name">Aimant Neko</span>
                    <span className="tag-pill tabular">x{profile.inventoryMagnets}</span>
                  </div>
                  <p className="shop-desc">Attire automatiquement toutes les pièces pendant 12s.</p>
                </div>
                <button
                  type="button"
                  className={selectedBoosts.useMagnet ? 'action-btn-gold' : 'action-btn-primary'}
                  disabled={profile.inventoryMagnets <= 0 && !selectedBoosts.useMagnet}
                  onClick={() => onToggleBoost('useMagnet')}
                >
                  {selectedBoosts.useMagnet ? 'PRÊT' : 'ACTIVER'}
                </button>
              </div>

              <div className="shop-row-card">
                <div className="shop-icon-box" style={{ background: '#22c55e22' }}>
                  <ShieldIcon size={26} />
                </div>
                <div className="shop-info">
                  <div className="shop-name-row">
                    <span className="shop-name">Bouclier Dojo</span>
                    <span className="tag-pill tabular">x{profile.inventoryShields}</span>
                  </div>
                  <p className="shop-desc">Vous protège contre un obstacle fatal en course.</p>
                </div>
                <button
                  type="button"
                  className={selectedBoosts.useShield ? 'action-btn-gold' : 'action-btn-primary'}
                  disabled={profile.inventoryShields <= 0 && !selectedBoosts.useShield}
                  onClick={() => onToggleBoost('useShield')}
                >
                  {selectedBoosts.useShield ? 'PRÊT' : 'ACTIVER'}
                </button>
              </div>

              <div className="shop-row-card">
                <div className="shop-icon-box" style={{ background: '#facc1522' }}>
                  <span className="shop-glyph">x5</span>
                </div>
                <div className="shop-info">
                  <div className="shop-name-row">
                    <span className="shop-name">Multiplicateur x5</span>
                    <span className="tag-pill tabular">x{profile.inventoryMultipliers}</span>
                  </div>
                  <p className="shop-desc">Multiplie votre score par 5 pendant 15 minutes !</p>
                </div>
                <button
                  type="button"
                  className="action-btn-gold"
                  disabled={profile.inventoryMultipliers <= 0}
                  onClick={onActivateMultiplier}
                >
                  UTILISER
                </button>
              </div>

              <div className="shop-row-card">
                <div className="shop-icon-box" style={{ background: '#f9731622' }}>
                  <span className="shop-glyph">⚡</span>
                </div>
                <div className="shop-info">
                  <div className="shop-name-row">
                    <span className="shop-name">Turbo Départ</span>
                    <span className="tag-pill tabular">x{profile.inventoryHeadStarts}</span>
                  </div>
                  <p className="shop-desc">Sprint invincible sur les 120 premiers mètres.</p>
                </div>
                <button
                  type="button"
                  className={selectedBoosts.useHeadStart ? 'action-btn-gold' : 'action-btn-primary'}
                  disabled={profile.inventoryHeadStarts <= 0 && !selectedBoosts.useHeadStart}
                  onClick={() => onToggleBoost('useHeadStart')}
                >
                  {selectedBoosts.useHeadStart ? 'PRÊT' : 'ACTIVER'}
                </button>
              </div>

              <p className="shop-desc" style={{ textAlign: 'center', marginTop: 4 }}>
                Les bonus marqués <strong>PRÊT</strong> s’activent dès que vous touchez l’écran pour jouer.
              </p>

              <button type="button" className="secondary-btn" onClick={() => setTab('shop')}>
                ACHETER PLUS DE BOOSTS EN BOUTIQUE
              </button>
            </div>
          ) : (
            <div className="cards-list" data-testid="capsule-dojo-panel">
              <div className="capsule-hero-banner">
                <div className="capsule-hero-copy">
                  <span className="capsule-kicker">DOJO GACHA · ガチャ</span>
                  <h3 className="capsule-title">CAPSULE MYSTÈRE SHINOBI</h3>
                  <p className="shop-desc">
                    Tirages effectués : <strong className="tabular">{profile.gachaDraws}</strong> ·
                    Débloque des boosts, gemmes, Sakura ou un héros/bolide/Shiba !
                  </p>
                </div>
                <div className="capsule-actions-row">
                  <button
                    type="button"
                    className={`price-btn ${profile.coins >= CAPSULE_DOJO_COSTS.coins ? '' : 'disabled'}`}
                    disabled={profile.coins < CAPSULE_DOJO_COSTS.coins}
                    onClick={() => onDrawCapsule('coins')}
                    data-testid="capsule-spin-coins"
                  >
                    <CoinIcon size={16} />
                    <span className="tabular">{CAPSULE_DOJO_COSTS.coins} PIÈCES</span>
                  </button>
                  <button
                    type="button"
                    className={`price-btn sakura-spin-btn ${
                      profile.eventSakuraTokens >= CAPSULE_DOJO_COSTS.sakura ? '' : 'disabled'
                    }`}
                    disabled={profile.eventSakuraTokens < CAPSULE_DOJO_COSTS.sakura}
                    onClick={() => onDrawCapsule('sakura')}
                    data-testid="capsule-spin-sakura"
                  >
                    <SakuraIcon size={16} />
                    <span className="tabular">{CAPSULE_DOJO_COSTS.sakura} SAKURA</span>
                  </button>
                </div>
              </div>

              {gachaResult && (
                <div className="capsule-result-card" data-testid="capsule-result-card">
                  <div className="shop-name-row" style={{ justifyContent: 'space-between' }}>
                    <span className="tag-pill ready-pill">{gachaResult.rarity.toUpperCase()}</span>
                    <button type="button" className="action-btn-gold" onClick={onClearGachaResult}>
                      OK
                    </button>
                  </div>
                  <strong className="capsule-result-title">{gachaResult.title}</strong>
                  <p className="shop-desc">{gachaResult.description}</p>
                </div>
              )}

              <div className="subsection-block">
                <span className="subsection-title">TABLE DES PROBABILITÉS</span>
                <div className="cards-list">
                  {CAPSULE_DOJO_ODDS.map((odd) => (
                    <div
                      key={odd.id}
                      className="shop-row-card"
                      style={{ borderColor: `${odd.accent}55`, padding: '8px 10px' }}
                    >
                      <div className="shop-info" style={{ flex: 1 }}>
                        <div className="shop-name-row">
                          <span className="shop-name">{odd.label}</span>
                          <span className="tag-pill">{odd.rarity}</span>
                        </div>
                      </div>
                      <span className="tag-pill tabular" style={{ color: odd.accent }}>
                        {odd.chanceLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
