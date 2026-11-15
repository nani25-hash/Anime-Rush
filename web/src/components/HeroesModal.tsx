import React, { useState } from 'react';
import { COMPANION_CATALOG, HERO_CATALOG } from '../config/catalog';
import { PlayerProfile } from '../types/game';
import { CloseIcon, CoinIcon, GemIcon } from './Icons';

interface HeroesModalProps {
  profile: PlayerProfile;
  onEquip: (heroId: string, companionId: string) => void;
  onBuyCharacter: (
    itemType: 'hero' | 'companion',
    itemId: string,
    currency: 'coins' | 'gems',
    cost: number,
  ) => void;
  onClose: () => void;
}

export const HeroesModal: React.FC<HeroesModalProps> = ({
  profile,
  onEquip,
  onBuyCharacter,
  onClose,
}) => {
  const [subTab, setSubTab] = useState<'heroes' | 'companions'>('heroes');

  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()} data-testid="heroes-modal">
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">PERSONNAGES & SHIBA</h2>
            <p className="sheet-sub">Changez votre style 3D en temps réel sur la piste</p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet-tabs">
          <button
            type="button"
            className={`sheet-tab ${subTab === 'heroes' ? 'active' : ''}`}
            onClick={() => setSubTab('heroes')}
          >
            HÉROS 3D ({HERO_CATALOG.length})
          </button>
          <button
            type="button"
            className={`sheet-tab ${subTab === 'companions' ? 'active' : ''}`}
            onClick={() => setSubTab('companions')}
          >
            COMPAGNONS SHIBA ({COMPANION_CATALOG.length})
          </button>
        </div>

        <div className="sheet-scroll">
          {subTab === 'heroes' ? (
            <div className="cards-list">
              {HERO_CATALOG.map((hero) => {
                const unlocked = profile.unlockedHeroIds.includes(hero.id);
                const equipped = profile.equippedHeroId === hero.id;
                const affordable =
                  hero.currency === 'coins'
                    ? profile.coins >= hero.cost
                    : profile.gems >= hero.cost;

                return (
                  <div
                    key={hero.id}
                    className={`character-card ${equipped ? 'equipped' : ''}`}
                    style={{ borderColor: equipped ? hero.uiAccent : undefined }}
                  >
                    <div
                      className="character-emblem"
                      style={{
                        borderColor: hero.uiAccent,
                        background: `linear-gradient(135deg, ${hero.uiAccent}44, #0f172a)`,
                      }}
                    >
                      <span>{hero.kanji}</span>
                    </div>
                    <div className="character-info">
                      <div className="shop-name-row">
                        <span className="shop-name">{hero.name}</span>
                        <span className="rarity-pill" style={{ color: hero.uiAccent }}>
                          {hero.rarity}
                        </span>
                      </div>
                      <span className="char-title">{hero.title}</span>
                      <p className="shop-desc">{hero.description}</p>
                    </div>
                    <div className="character-action">
                      {equipped ? (
                        <span className="status-equipped">ÉQUIPÉ</span>
                      ) : unlocked ? (
                        <button
                          type="button"
                          className="action-btn-primary"
                          onClick={() => onEquip(hero.id, profile.equippedCompanionId)}
                          data-testid={`equip-hero-${hero.id}`}
                        >
                          ÉQUIPER
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`price-btn ${affordable ? '' : 'disabled'}`}
                          disabled={!affordable}
                          onClick={() =>
                            onBuyCharacter('hero', hero.id, hero.currency, hero.cost)
                          }
                          data-testid={`buy-hero-${hero.id}`}
                        >
                          {hero.currency === 'coins' ? (
                            <CoinIcon size={15} />
                          ) : (
                            <GemIcon size={15} />
                          )}
                          <span className="tabular">{hero.cost}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cards-list">
              {COMPANION_CATALOG.map((comp) => {
                const unlocked = profile.unlockedCompanionIds.includes(comp.id);
                const equipped = profile.equippedCompanionId === comp.id;
                const affordable =
                  comp.currency === 'coins'
                    ? profile.coins >= comp.cost
                    : profile.gems >= comp.cost;

                return (
                  <div
                    key={comp.id}
                    className={`character-card ${equipped ? 'equipped' : ''}`}
                    style={{ borderColor: equipped ? comp.uiAccent : undefined }}
                  >
                    <div
                      className="character-emblem"
                      style={{
                        borderColor: comp.uiAccent,
                        background: `linear-gradient(135deg, ${comp.uiAccent}44, #0f172a)`,
                      }}
                    >
                      <span>犬</span>
                    </div>
                    <div className="character-info">
                      <div className="shop-name-row">
                        <span className="shop-name">{comp.name}</span>
                        <span className="rarity-pill" style={{ color: comp.uiAccent }}>
                          {comp.rarity}
                        </span>
                      </div>
                      <span className="char-title">{comp.title}</span>
                      <p className="shop-desc">{comp.description}</p>
                    </div>
                    <div className="character-action">
                      {equipped ? (
                        <span className="status-equipped">ÉQUIPÉ</span>
                      ) : unlocked ? (
                        <button
                          type="button"
                          className="action-btn-primary"
                          onClick={() => onEquip(profile.equippedHeroId, comp.id)}
                          data-testid={`equip-comp-${comp.id}`}
                        >
                          ÉQUIPER
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`price-btn ${affordable ? '' : 'disabled'}`}
                          disabled={!affordable}
                          onClick={() =>
                            onBuyCharacter('companion', comp.id, comp.currency, comp.cost)
                          }
                          data-testid={`buy-comp-${comp.id}`}
                        >
                          {comp.currency === 'coins' ? (
                            <CoinIcon size={15} />
                          ) : (
                            <GemIcon size={15} />
                          )}
                          <span className="tabular">{comp.cost}</span>
                        </button>
                      )}
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
