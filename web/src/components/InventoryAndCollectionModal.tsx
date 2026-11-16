import React from 'react';
import { COLLECTION_CARDS } from '../config/catalog';
import { ActiveRunBoosts, PlayerProfile } from '../types/game';
import { CloseIcon, MagnetIcon, ShieldIcon } from './Icons';

interface InventoryModalProps {
  mode: 'inventory' | 'collection';
  profile: PlayerProfile;
  selectedBoosts: ActiveRunBoosts;
  onToggleBoost: (key: keyof ActiveRunBoosts) => void;
  onActivateMultiplier: () => void;
  onOpenShop: () => void;
  onClose: () => void;
}

export const InventoryAndCollectionModal: React.FC<InventoryModalProps> = ({
  mode,
  profile,
  selectedBoosts,
  onToggleBoost,
  onActivateMultiplier,
  onOpenShop,
  onClose,
}) => {
  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()} data-testid={`${mode}-modal`}>
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">
              {mode === 'inventory' ? 'INVENTAIRE & BOOSTS' : 'ALBUM COLLECTION'}
            </h2>
            <p className="sheet-sub">
              {mode === 'inventory'
                ? 'Préparez vos bonus avant de vous élancer sur les rails'
                : `${profile.collectionIds.length} / ${COLLECTION_CARDS.length} cartes japonaises débloquées`}
            </p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet-scroll">
          {mode === 'inventory' ? (
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
                Les bonus marqués <strong>PRÊT</strong> s’activent dès que vous appuyez sur <strong>JOUER</strong>.
              </p>

              <button type="button" className="secondary-btn" onClick={onOpenShop}>
                ACHETER PLUS DE BOOSTS EN BOUTIQUE
              </button>
            </div>
          ) : (
            <div className="collection-grid">
              {COLLECTION_CARDS.map((card) => {
                const owned = profile.collectionIds.includes(card.id);
                return (
                  <div
                    key={card.id}
                    className={`collection-card ${owned ? 'owned' : 'locked'}`}
                    style={{ background: owned ? card.gradient : undefined }}
                  >
                    <div className="collection-kanji">{owned ? card.kanji : '?'}</div>
                    <div className="collection-meta">
                      <span className="collection-rarity">{card.rarity}</span>
                      <strong className="collection-name">{card.name}</strong>
                      <span className="collection-chapter">{card.chapter}</span>
                      {!owned && <span className="collection-hint">{card.unlockHint}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
