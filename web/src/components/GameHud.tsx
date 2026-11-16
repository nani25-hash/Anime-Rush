import React from 'react';
import { HudSnapshot } from '../types/game';
import { CoinIcon, GateGoalIcon, MagnetIcon, PauseIcon, SakuraIcon, ShieldIcon } from './Icons';

interface GameHudProps {
  hud: HudSnapshot;
  onPause: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({ hud, onPause }) => {
  const milestoneSpan = 250;
  const progressMeters = hud.distance % milestoneSpan;
  const progressPct = Math.min(100, Math.max(4, (progressMeters / milestoneSpan) * 100));
  const nextGateMeters = Math.floor(hud.distance / milestoneSpan) * milestoneSpan + milestoneSpan;

  return (
    <div className={`overlay-layer${hud.dangerActive ? ' hud-danger-ring' : ''}`}>
      <div className="hud-top-row">
        <div className="hud-stats-cluster tabular">
          <div className="hud-score-card">
            <span className="hud-score-value">{hud.score.toLocaleString('fr-FR')}</span>
            <span className="hud-distance-value">{hud.distance} m</span>
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
        </div>

        <button
          type="button"
          className="icon-btn metallic-btn interactive"
          onClick={onPause}
          aria-label="Pause"
          data-testid="pause-button"
        >
          <PauseIcon size={22} />
        </button>
      </div>

      {hud.milestoneLabel && <div className="milestone-banner">{hud.milestoneLabel}</div>}

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
  );
};
