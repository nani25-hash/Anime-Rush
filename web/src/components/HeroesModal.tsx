import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CAR_CATALOG,
  COMPANION_CATALOG,
  HERO_CATALOG,
  UPGRADE_CATALOG,
  UpgradeId,
  getCarById,
  getCompanionById,
  getHeroById,
  getUpgradeNextCost,
} from '../config/catalog';
import { PreviewMode, PreviewStage3D } from '../game/PreviewStage3D';
import { PlayerProfile } from '../types/game';
import {
  BoltIcon,
  CarIcon,
  CloseIcon,
  CoinIcon,
  GemIcon,
  MagnetIcon,
  ShieldIcon,
} from './Icons';

interface HeroesModalProps {
  profile: PlayerProfile;
  onEquip: (heroId: string, companionId: string) => void;
  onEquipCar: (carId: string) => void;
  onBuyCharacter: (
    itemType: 'hero' | 'companion' | 'car',
    itemId: string,
    currency: 'coins' | 'gems',
    cost: number,
  ) => void;
  onPurchaseUpgrade: (upgradeId: string, cost: number) => void;
  onClose: () => void;
}

type ShowroomTab = PreviewMode | 'upgrades';

function renderUpgradeIcon(id: UpgradeId): React.ReactNode {
  switch (id) {
    case 'upgrade_magnet':
      return <MagnetIcon size={34} />;
    case 'upgrade_car':
      return <CarIcon size={36} />;
    case 'upgrade_shield':
      return <ShieldIcon size={34} />;
    case 'upgrade_score':
      return <BoltIcon size={34} />;
  }
}

type HeroFilter =
  | 'Tous'
  | 'Canoniques'
  | 'Actuels'
  | 'Spécial 3D'
  | 'Nouveaux'
  | 'Débloqués';

const HERO_FILTERS: HeroFilter[] = [
  'Tous',
  'Canoniques',
  'Actuels',
  'Spécial 3D',
  'Nouveaux',
  'Débloqués',
];

export const HeroesModal: React.FC<HeroesModalProps> = ({
  profile,
  onEquip,
  onEquipCar,
  onBuyCharacter,
  onPurchaseUpgrade,
  onClose,
}) => {
  const [subTab, setSubTab] = useState<ShowroomTab>('heroes');
  const [previewHeroId, setPreviewHeroId] = useState<string>(profile.equippedHeroId);
  const [previewCarId, setPreviewCarId] = useState<string>(profile.equippedCarId);
  const [previewCompId, setPreviewCompId] = useState<string>(profile.equippedCompanionId);
  const [filter, setFilter] = useState<HeroFilter>('Tous');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<PreviewStage3D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let stage: PreviewStage3D | null = null;
    try {
      stage = new PreviewStage3D(
        canvas,
        {
          mode: 'heroes',
          heroId: previewHeroId,
          carId: previewCarId,
          companionId: previewCompId,
        },
        (thumbs) => setThumbnails(thumbs),
      );
      stageRef.current = stage;
    } catch {
      stageRef.current = null;
    }

    const parent = canvas.parentElement;
    const ro =
      typeof ResizeObserver !== 'undefined' && parent
        ? new ResizeObserver(() => {
            stageRef.current?.resizeToContainer();
          })
        : null;
    if (ro && parent) {
      ro.observe(parent);
    }

    return () => {
      ro?.disconnect();
      stage?.dispose();
      stageRef.current = null;
    };
    // Mounted once per modal lifecycle; subsequent preview switches flow via setSelection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (subTab === 'upgrades') return;
    stageRef.current?.setSelection({
      mode: subTab,
      heroId: previewHeroId,
      carId: previewCarId,
      companionId: previewCompId,
    });
    requestAnimationFrame(() => stageRef.current?.resizeToContainer());
  }, [subTab, previewHeroId, previewCarId, previewCompId]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredHeroes = useMemo(() => {
    return HERO_CATALOG.filter((h) => {
      if (filter === 'Débloqués' && !profile.unlockedHeroIds.includes(h.id)) {
        return false;
      }
      if (filter !== 'Tous' && filter !== 'Débloqués' && h.category !== filter) {
        return false;
      }
      if (!normalizedQuery) return true;
      return (
        h.name.toLowerCase().includes(normalizedQuery) ||
        h.title.toLowerCase().includes(normalizedQuery) ||
        h.power.activeName.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [filter, normalizedQuery, profile.unlockedHeroIds]);

  const filteredCars = useMemo(() => {
    if (!normalizedQuery) return CAR_CATALOG;
    return CAR_CATALOG.filter(
      (c) =>
        c.name.toLowerCase().includes(normalizedQuery) ||
        c.subtitle.toLowerCase().includes(normalizedQuery) ||
        c.perkLabel.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery]);

  const activeMultiplier =
    profile.activeMultiplier > 1 && profile.multiplierExpiresAt > Date.now()
      ? profile.activeMultiplier
      : 1;

  const selectedHero = getHeroById(previewHeroId);
  const selectedCar = getCarById(previewCarId);
  const selectedComp = getCompanionById(previewCompId);

  const activeItemState = useMemo(() => {
    if (subTab === 'heroes') {
      const unlocked = profile.unlockedHeroIds.includes(selectedHero.id);
      const equipped = profile.equippedHeroId === selectedHero.id;
      const affordable =
        selectedHero.currency === 'coins'
          ? profile.coins >= selectedHero.cost
          : profile.gems >= selectedHero.cost;
      return {
        type: 'hero' as const,
        id: selectedHero.id,
        name: selectedHero.name,
        subtitle: `${selectedHero.title} · ${selectedHero.category}`,
        rarity: selectedHero.rarity,
        accent: selectedHero.uiAccent,
        currency: selectedHero.currency,
        cost: selectedHero.cost,
        unlocked,
        equipped,
        affordable,
        pillOne: selectedHero.power.passiveLabel,
        pillTwo: `${selectedHero.power.activeName} : ${selectedHero.power.activeDescription}`,
      };
    }

    if (subTab === 'cars') {
      const unlocked = profile.unlockedCarIds.includes(selectedCar.id);
      const equipped = profile.equippedCarId === selectedCar.id;
      const affordable =
        selectedCar.currency === 'coins'
          ? profile.coins >= selectedCar.cost
          : profile.gems >= selectedCar.cost;
      return {
        type: 'car' as const,
        id: selectedCar.id,
        name: selectedCar.name,
        subtitle: selectedCar.subtitle,
        rarity: selectedCar.rarity,
        accent: selectedCar.uiAccent,
        currency: selectedCar.currency,
        cost: selectedCar.cost,
        unlocked,
        equipped,
        affordable,
        pillOne: selectedCar.perkLabel,
        pillTwo: selectedCar.description,
      };
    }

    const unlocked = profile.unlockedCompanionIds.includes(selectedComp.id);
    const equipped = profile.equippedCompanionId === selectedComp.id;
    const affordable =
      selectedComp.currency === 'coins'
        ? profile.coins >= selectedComp.cost
        : profile.gems >= selectedComp.cost;
    return {
      type: 'companion' as const,
      id: selectedComp.id,
      name: selectedComp.name,
      subtitle: selectedComp.title,
      rarity: selectedComp.rarity,
      accent: selectedComp.uiAccent,
      currency: selectedComp.currency,
      cost: selectedComp.cost,
      unlocked,
      equipped,
      affordable,
      pillOne: selectedComp.bonusLabel,
      pillTwo: selectedComp.description,
    };
  }, [
    subTab,
    selectedHero,
    selectedCar,
    selectedComp,
    profile.unlockedHeroIds,
    profile.equippedHeroId,
    profile.unlockedCarIds,
    profile.equippedCarId,
    profile.unlockedCompanionIds,
    profile.equippedCompanionId,
    profile.coins,
    profile.gems,
  ]);

  const handlePrimaryAction = () => {
    if (activeItemState.equipped) return;
    if (activeItemState.unlocked) {
      if (activeItemState.type === 'hero') {
        onEquip(activeItemState.id, profile.equippedCompanionId);
      } else if (activeItemState.type === 'car') {
        onEquipCar(activeItemState.id);
      } else {
        onEquip(profile.equippedHeroId, activeItemState.id);
      }
      return;
    }
    if (!activeItemState.affordable) return;
    onBuyCharacter(
      activeItemState.type,
      activeItemState.id,
      activeItemState.currency,
      activeItemState.cost,
    );
  };

  return (
    <div className="showroom-overlay interactive" data-testid="heroes-modal">
      <div className="showroom-shell">
        {/* Top Navy Resource Header */}
        <header className="showroom-topbar">
          <div className="showroom-currencies">
            <span className="showroom-pill tabular">
              <CoinIcon size={16} />
              <span>{profile.coins.toLocaleString('fr-FR')}</span>
            </span>
            <span className="showroom-pill gems tabular">
              <GemIcon size={16} />
              <span>{profile.gems.toLocaleString('fr-FR')}</span>
            </span>
            <span className="showroom-mult-pill tabular">x{activeMultiplier}</span>
          </div>
          <div className="showroom-equipped-summary">
            <CarIcon size={15} />
            <span>{getCarById(profile.equippedCarId).name}</span>
          </div>
        </header>

        {/* Upper Interactive 3D Brick Showroom (kept mounted, hidden when on Upgrades tab) */}
        <section className={`showroom-stage ${subTab === 'upgrades' ? 'is-hidden' : ''}`}>
          <div className="showroom-title-block">
            <div className="showroom-name-row">
              <h2 className="showroom-item-title">{activeItemState.name}</h2>
              <span
                className="showroom-rarity-chip"
                style={{ borderColor: activeItemState.accent, color: activeItemState.accent }}
              >
                {activeItemState.rarity}
              </span>
            </div>
            <p className="showroom-item-sub">{activeItemState.subtitle}</p>
          </div>

          <div className="showroom-canvas-zone">
            <canvas ref={canvasRef} className="showroom-canvas" />
            <span className="showroom-drag-hint">Glisser 360°</span>

            <div className="showroom-info-badges">
              <div className="showroom-perk-pill passive">
                <ShieldIcon size={13} />
                <span>{activeItemState.pillOne}</span>
              </div>
              <div className="showroom-perk-pill active">
                <BoltIcon size={13} />
                <span>{activeItemState.pillTwo}</span>
              </div>
            </div>
          </div>

          <div className="showroom-cta-wrap">
            {activeItemState.equipped ? (
              <button
                type="button"
                className="showroom-cta-btn cta-equipped"
                disabled
                data-testid={`equipped-${activeItemState.type}-${activeItemState.id}`}
              >
                ÉQUIPÉ ✓
              </button>
            ) : activeItemState.unlocked ? (
              <button
                type="button"
                className="showroom-cta-btn cta-select"
                onClick={handlePrimaryAction}
                data-testid={`equip-${activeItemState.type}-${activeItemState.id}`}
              >
                SÉLECTIONNER
              </button>
            ) : (
              <button
                type="button"
                className={`showroom-cta-btn cta-buy ${activeItemState.affordable ? '' : 'disabled'}`}
                disabled={!activeItemState.affordable}
                onClick={handlePrimaryAction}
                data-testid={`buy-${activeItemState.type}-${activeItemState.id}`}
              >
                <span>ACHETER</span>
                {activeItemState.currency === 'coins' ? (
                  <CoinIcon size={18} />
                ) : (
                  <GemIcon size={18} />
                )}
                <span className="tabular">{activeItemState.cost.toLocaleString('fr-FR')}</span>
              </button>
            )}
          </div>
        </section>

        {/* Search & Filter Strip */}
        <section
          className={`showroom-controls-bar ${subTab === 'upgrades' ? 'is-hidden' : ''}`}
        >
          {subTab !== 'companions' ? (
            <div className="showroom-search-row">
              <input
                type="search"
                className="showroom-search-input"
                placeholder={
                  subTab === 'heroes' ? 'Rechercher un héros...' : 'Rechercher une voiture...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Rechercher"
              />
            </div>
          ) : null}

          {subTab === 'heroes' && (
            <div className="showroom-filter-strip">
              {HERO_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`showroom-filter-chip ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'Tous' ? `Tous (${HERO_CATALOG.length})` : f}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Lower Dotted Studio Thumbnail Grid */}
        <section className="showroom-grid-panel">
          {subTab === 'heroes' && (
            <div className="portrait-grid">
              {filteredHeroes.map((hero) => {
                const unlocked = profile.unlockedHeroIds.includes(hero.id);
                const equipped = profile.equippedHeroId === hero.id;
                const selected = previewHeroId === hero.id;
                const thumb = thumbnails[`hero:${hero.id}`];

                return (
                  <button
                    key={hero.id}
                    type="button"
                    className={`portrait-tile ${selected ? 'selected' : ''} ${equipped ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}`}
                    onClick={() => setPreviewHeroId(hero.id)}
                    aria-label={hero.name}
                    data-testid={`tile-hero-${hero.id}`}
                  >
                    <div className="portrait-art">
                      {thumb ? (
                        <img src={thumb} alt={hero.name} className="portrait-img" />
                      ) : (
                        <span
                          className="portrait-fallback"
                          style={{ color: hero.uiAccent }}
                        >
                          {hero.kanji}
                        </span>
                      )}
                    </div>
                    <span className="portrait-name">{hero.name}</span>
                    {unlocked ? (
                      <span className={`portrait-check ${equipped ? 'active' : ''}`}>✓</span>
                    ) : (
                      <span className="portrait-price-tag tabular">
                        {hero.currency === 'coins' ? (
                          <CoinIcon size={11} />
                        ) : (
                          <GemIcon size={11} />
                        )}
                        {hero.cost}
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredHeroes.length === 0 && (
                <div className="showroom-empty">Aucun héros trouvé pour cette recherche.</div>
              )}
            </div>
          )}

          {subTab === 'cars' && (
            <div className="portrait-grid">
              {filteredCars.map((car) => {
                const unlocked = profile.unlockedCarIds.includes(car.id);
                const equipped = profile.equippedCarId === car.id;
                const selected = previewCarId === car.id;
                const thumb = thumbnails[`car:${car.id}`];

                return (
                  <button
                    key={car.id}
                    type="button"
                    className={`portrait-tile ${selected ? 'selected' : ''} ${equipped ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}`}
                    onClick={() => setPreviewCarId(car.id)}
                    aria-label={car.name}
                    data-testid={`tile-car-${car.id}`}
                  >
                    <div className="portrait-art">
                      {thumb ? (
                        <img src={thumb} alt={car.name} className="portrait-img" />
                      ) : (
                        <span className="portrait-fallback" style={{ color: car.uiAccent }}>
                          <CarIcon size={28} />
                        </span>
                      )}
                    </div>
                    <span className="portrait-name">{car.name}</span>
                    {unlocked ? (
                      <span className={`portrait-check ${equipped ? 'active' : ''}`}>✓</span>
                    ) : (
                      <span className="portrait-price-tag tabular">
                        {car.currency === 'coins' ? (
                          <CoinIcon size={11} />
                        ) : (
                          <GemIcon size={11} />
                        )}
                        {car.cost}
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredCars.length === 0 && (
                <div className="showroom-empty">Aucune voiture trouvée pour cette recherche.</div>
              )}
            </div>
          )}

          {subTab === 'companions' && (
            <div className="portrait-grid">
              {COMPANION_CATALOG.map((comp) => {
                const unlocked = profile.unlockedCompanionIds.includes(comp.id);
                const equipped = profile.equippedCompanionId === comp.id;
                const selected = previewCompId === comp.id;
                const thumb = thumbnails[`comp:${comp.id}`];

                return (
                  <button
                    key={comp.id}
                    type="button"
                    className={`portrait-tile ${selected ? 'selected' : ''} ${equipped ? 'equipped' : ''} ${!unlocked ? 'locked' : ''}`}
                    onClick={() => setPreviewCompId(comp.id)}
                    aria-label={comp.name}
                    data-testid={`tile-comp-${comp.id}`}
                  >
                    <div className="portrait-art">
                      {thumb ? (
                        <img src={thumb} alt={comp.name} className="portrait-img" />
                      ) : (
                        <span className="portrait-fallback" style={{ color: comp.uiAccent }}>
                          犬
                        </span>
                      )}
                    </div>
                    <span className="portrait-name">{comp.name}</span>
                    {unlocked ? (
                      <span className={`portrait-check ${equipped ? 'active' : ''}`}>✓</span>
                    ) : (
                      <span className="portrait-price-tag tabular">
                        {comp.currency === 'coins' ? (
                          <CoinIcon size={11} />
                        ) : (
                          <GemIcon size={11} />
                        )}
                        {comp.cost}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {subTab === 'upgrades' && (
            <div className="upgrades-panel" data-testid="upgrades-panel">
              <div className="upgrades-header-block">
                <h2 className="upgrades-title">AMÉLIORATIONS</h2>
                <p className="upgrades-sub">
                  Renforce définitivement la durée et l’efficacité de tes bonus
                </p>
              </div>

              <div className="upgrades-list">
                {UPGRADE_CATALOG.map((upg) => {
                  const level = upg.getLevel(profile);
                  const isMax = level >= upg.maxLevel;
                  const nextCost = getUpgradeNextCost(upg, level);
                  const canAfford = profile.coins >= nextCost;

                  return (
                    <div
                      key={upg.id}
                      className="upgrade-card"
                      data-testid={`upgrade-card-${upg.id}`}
                    >
                      <div className="upgrade-top-row">
                        <div
                          className="upgrade-icon-badge"
                          style={{ borderColor: upg.accent }}
                        >
                          {renderUpgradeIcon(upg.id)}
                        </div>
                        <div className="upgrade-meta">
                          <h3 className="upgrade-name">{upg.name}</h3>
                          <p className="upgrade-desc">{upg.description}</p>
                          <div className="upgrade-meter-row">
                            <div className="upgrade-segments" aria-label={`Niveau ${level} sur ${upg.maxLevel}`}>
                              {Array.from({ length: upg.maxLevel }, (_, idx) => (
                                <span
                                  key={idx}
                                  className={`upgrade-seg ${idx < level ? 'filled' : ''}`}
                                />
                              ))}
                            </div>
                            <span className="upgrade-stat-pill tabular">
                              {upg.getEffectSummary(level)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="upgrade-footer">
                        {isMax ? (
                          <div className="upgrade-max-banner">
                            <span>Amélioration terminée !</span>
                            <span className="upgrade-check-pill">✓</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={`upgrade-buy-btn ${canAfford ? '' : 'disabled'}`}
                            disabled={!canAfford}
                            onClick={() => onPurchaseUpgrade(upg.id, nextCost)}
                            data-testid={`buy-${upg.id}`}
                          >
                            <span>AMÉLIORER · NIV. {level + 1}</span>
                            <span className="upgrade-cost-tag tabular">
                              <CoinIcon size={15} />
                              {nextCost.toLocaleString('fr-FR')}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Bottom Folder Tab Switcher + Red Circular Close Button */}
        <footer className="showroom-footer">
          <div className="showroom-tabs">
            <button
              type="button"
              className={`showroom-folder-tab ${subTab === 'heroes' ? 'active' : ''}`}
              onClick={() => {
                setSubTab('heroes');
                setSearchQuery('');
              }}
              data-testid="tab-heroes"
            >
              Héros ({HERO_CATALOG.length})
            </button>
            <button
              type="button"
              className={`showroom-folder-tab ${subTab === 'cars' ? 'active' : ''}`}
              onClick={() => {
                setSubTab('cars');
                setSearchQuery('');
              }}
              data-testid="tab-cars"
            >
              Voitures ({CAR_CATALOG.length})
            </button>
            <button
              type="button"
              className={`showroom-folder-tab ${subTab === 'companions' ? 'active' : ''}`}
              onClick={() => {
                setSubTab('companions');
                setSearchQuery('');
              }}
              data-testid="tab-companions"
            >
              Shiba ({COMPANION_CATALOG.length})
            </button>
            <button
              type="button"
              className={`showroom-folder-tab ${subTab === 'upgrades' ? 'active' : ''}`}
              onClick={() => {
                setSubTab('upgrades');
                setSearchQuery('');
              }}
              data-testid="tab-upgrades"
            >
              Améliorations
            </button>
          </div>

          <div className="showroom-close-row">
            <button
              type="button"
              className="circular-close-x"
              onClick={onClose}
              aria-label="Fermer"
              data-testid="close-heroes-modal"
            >
              <CloseIcon size={24} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
