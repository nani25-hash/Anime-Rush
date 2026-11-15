import React from 'react';
import { SHOP_ITEMS } from '../config/catalog';
import { PlayerProfile } from '../types/game';
import { ChestIcon, CloseIcon, CoinIcon, GemIcon, MagnetIcon, ShieldIcon } from './Icons';

interface ShopModalProps {
  profile: PlayerProfile;
  onBuyItem: (
    itemType: 'consumable' | 'chest',
    itemId: string,
    currency: 'coins' | 'gems',
    cost: number,
  ) => void;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ profile, onBuyItem, onClose }) => {
  const renderIcon = (id: string) => {
    if (id === 'magnet') return <MagnetIcon size={28} />;
    if (id === 'shield') return <ShieldIcon size={28} />;
    if (id === 'coins_chest' || id === 'sakura_chest') return <ChestIcon size={30} />;
    if (id === 'multiplier_x5') return <span className="shop-glyph">x5</span>;
    return <span className="shop-glyph">⚡</span>;
  };

  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()} data-testid="shop-modal">
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">BOUTIQUE SHINOBI</h2>
            <p className="sheet-sub">Équipez-vous pour battre votre record sur les rails</p>
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
        </div>

        <div className="sheet-scroll">
          <div className="cards-list">
            {SHOP_ITEMS.map((item) => {
              const affordable =
                item.currency === 'coins'
                  ? profile.coins >= item.cost
                  : profile.gems >= item.cost;

              return (
                <div key={item.id} className="shop-row-card" style={{ borderColor: `${item.accent}66` }}>
                  <div className="shop-icon-box" style={{ background: `${item.accent}22` }}>
                    {renderIcon(item.id)}
                  </div>
                  <div className="shop-info">
                    <div className="shop-name-row">
                      <span className="shop-name">{item.name}</span>
                      {item.badge && <span className="tag-pill">{item.badge}</span>}
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
        </div>
      </div>
    </div>
  );
};
