import React from 'react';
import { COLLECTION_CARDS } from '../config/catalog';
import { PlayerProfile } from '../types/game';
import { CloseIcon } from './Icons';

interface CollectionModalProps {
  profile: PlayerProfile;
  onClose: () => void;
}

export const InventoryAndCollectionModal: React.FC<CollectionModalProps> = ({
  profile,
  onClose,
}) => {
  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()} data-testid="collection-modal">
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">ALBUM COLLECTION</h2>
            <p className="sheet-sub">
              {profile.collectionIds.length} / {COLLECTION_CARDS.length} cartes japonaises débloquées
            </p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet-scroll">
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
        </div>
      </div>
    </div>
  );
};
