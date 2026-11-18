import React from 'react';
import { HudSnapshot } from '../types/game';
import {
  BoltIcon,
  CarIcon,
  CoinIcon,
  FuelCanIcon,
  GateGoalIcon,
  MagnetIcon,
  PauseIcon,
  SakuraIcon,
  ShieldIcon,
} from './Icons';

interface GameHudProps {
  hud: HudSnapshot;
  onPause: () => void;
  onActivateCar: () => void;
  onActivateHeroPower: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onPause,
  onActivateCar,
  onActivateHeroPower,
}) => {
  const milestoneSpan = 250;
  const progressMeters = hud.distance % milestoneSpan;
  const progressPct = Math.min(100, Math.max(4, (progressMeters / milestoneSpan) * 100));
  const nextGateMeters = Math.floor(hud.distance / milestoneSpan) * milestoneSpan + milestoneSpan;

  return (
    <div className={`overlay-layer${hud.dangerActive ? ' hud-danger-ring' : ''}`}>
      {/* Minimalist High-Speed Slanted Italic Top HUD */}
      <div className="hud-top-row">
        <div className="hud-stats-cluster tabular">
          <div className="hud-score-card slanted-panel">
            <div className="hud-score-main">
              <span className="hud-score-value">{hud.score.toLocaleString('fr-FR')}</span>
              <span className="hud-distance-value">{hud.distance} m</span>
            </div>
            {hud.scoreMultiplier > 1 && (
              <span className="hud-mult-tag">x{hud.scoreMultiplier}</span>
            )}
          </div>

          <div className="hud-sub-row">
            <div className="hud-chip">
              <CoinIcon size={15} />
              <span>{hud.coins}</span>
            </div>
            {hud.sakuraTokens > 0 && (
              <div className="hud-chip hud-sakura-chip">
                <SakuraIcon size={14} />
                <span>{hud.sakuraTokens}</span>
              </div>
            )}
            <div className="hud-chip hud-speed-chip">
              <span>{hud.speedMultiplier.toFixed(1)}x</span>
            </div>
            {hud.magnetRemaining > 0 && (
              <div className="hud-chip hud-powerup-chip">
                <MagnetIcon size={14} />
                <span>{hud.magnetRemaining}s</span>
              </div>
            )}
            {hud.hasShield && (
              <div className="hud-chip hud-shield-chip">
                <ShieldIcon size={14} />
                <span>OK</span>
              </div>
            )}
            {hud.dangerActive && (
              <div className="hud-chip hud-danger-chip" data-testid="danger-badge">
                <span>DANGER</span>
              </div>
            )}
          </div>

          {/* Fuel Gauge Pill for Open-Top Car */}
          <div className={`hud-fuel-pill ${hud.fuelReady ? 'ready' : ''} ${hud.carActive ? 'turbo' : ''}`}>
            <FuelCanIcon size={15} />
            <div className="hud-fuel-track">
              <div
                className="hud-fuel-fill"
                style={{ width: `${hud.carActive ? 100 : hud.fuelPct}%` }}
              />
            </div>
            <span className="hud-fuel-text">
              {hud.carActive ? `TURBO ${hud.carRemaining}s` : `${hud.fuelPct}%`}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="icon-btn ue5-bevel-btn interactive"
          onClick={onPause}
          aria-label="Pause"
          data-testid="pause-button"
        >
          <PauseIcon size={22} />
        </button>
      </div>

      {hud.milestoneLabel && <div className="milestone-banner">{hud.milestoneLabel}</div>}

      {/* Bottom Zone: Tactical Action Buttons + Milestone Progress Bar */}
      <div className="hud-bottom-dock">
        <div className="hud-tactical-dock">
          {hud.fuelReady && !hud.carActive && (
            <button
              type="button"
              className="car-trigger-btn interactive"
              onClick={onActivateCar}
              aria-label="Activer la voiture turbo 10 secondes"
              data-testid="activate-car-button"
            >
              <CarIcon size={26} />
              <div className="trigger-meta">
                <span className="trigger-kicker">ESSENCE 100%</span>
                <span className="trigger-label">VOITURE TURBO !</span>
              </div>
            </button>
          )}

          {hud.carActive && (
            <div className="car-active-pill tabular" data-testid="car-active-badge">
              <CarIcon size={22} />
              <span>CABRIOLET INVINCIBLE · {hud.carRemaining}s</span>
            </div>
          )}

          <button
            type="button"
            className={`power-trigger-btn interactive ${hud.heroPowerReady ? 'ready' : ''} ${hud.heroPowerActiveRemaining > 0 ? 'active' : ''}`}
            style={{ '--hero-accent': hud.heroPowerAccent } as React.CSSProperties}
            onClick={onActivateHeroPower}
            disabled={!hud.heroPowerReady}
            aria-label={`Pouvoir héros ${hud.heroPowerName}`}
            data-testid="activate-power-button"
          >
            <div className="power-progress-bg" style={{ width: `${hud.heroPowerChargePct}%` }} />
            <BoltIcon size={21} />
            <div className="trigger-meta">
              <span className="trigger-kicker">{hud.heroName.toUpperCase()}</span>
              <span className="trigger-label tabular">
                {hud.heroPowerActiveRemaining > 0
                  ? `ACTIF ${hud.heroPowerActiveRemaining}s`
                  : hud.heroPowerReady
                    ? hud.heroPowerName.toUpperCase()
                    : `${hud.heroPowerChargePct}%`}
              </span>
            </div>
          </button>
        </div>

        <div className="hud-milestone-bar tabular" aria-label={`Prochain palier ${nextGateMeters} mètres`}>
          <div className="hud-milestone-track">
            <div className="hud-milestone-fill" style={{ width: `${progressPct}%` }} />
            <div className="hud-milestone-marker" style={{ left: `${progressPct}%` }}>
              <span>{hud.distance}m</span>
            </div>
          </div>
          <div className="hud-milestone-goal">
            <GateGoalIcon size={18} />
            <span>{nextGateMeters}m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
