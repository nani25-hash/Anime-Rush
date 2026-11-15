import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { TitleScreen } from './components/TitleScreen';
import { AnimeRushEngine } from './game/AnimeRushEngine';
import {
  HudSnapshot,
  QualityLevel,
  loadBestScore,
  loadSavedMuted,
  loadSavedQuality,
  saveMuted,
  saveQuality,
} from './types/game';

declare global {
  interface Window {
    __ANIME_RUSH_BACK__?: () => void;
    AndroidBridge?: {
      exitApp: () => void;
      onGameReady?: () => void;
    };
  }
}

export const App: React.FC = () => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<AnimeRushEngine | null>(null);

  const [quality, setQuality] = useState<QualityLevel>(() => loadSavedQuality());
  const [muted, setMuted] = useState<boolean>(() => loadSavedMuted());
  const [engineError, setEngineError] = useState<string | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(() => ({
    phase: 'TITLE',
    score: 0,
    distance: 0,
    coins: 0,
    speedMultiplier: 1.0,
    bestScore: loadBestScore(),
    isNewRecord: false,
    milestoneLabel: null,
    dangerActive: false,
  }));

  useEffect(() => {
    const container = stageRef.current;
    if (!container) return;

    let engine: AnimeRushEngine | null = null;
    try {
      engine = new AnimeRushEngine(container, quality, muted, (snapshot) => {
        setHud(snapshot);
      });
      engineRef.current = engine;
      requestAnimationFrame(() => {
        window.AndroidBridge?.onGameReady?.();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'WebGL initialization failed';
      setEngineError(msg);
      window.AndroidBridge?.onGameReady?.();
      return;
    }

    const onAppPause = () => {
      engine?.pauseRun();
    };
    window.addEventListener('anime-rush-pause', onAppPause);

    window.__ANIME_RUSH_BACK__ = () => {
      if (!engine) {
        window.AndroidBridge?.exitApp();
        return;
      }
      const currentPhase = engine.getPhase();
      if (currentPhase === 'PLAYING') {
        engine.pauseRun();
      } else if (currentPhase === 'PAUSED') {
        engine.resumeRun();
      } else if (currentPhase === 'GAME_OVER') {
        engine.returnToTitle();
      } else {
        window.AndroidBridge?.exitApp();
      }
    };

    const onKeyStartOrRestart = (e: KeyboardEvent) => {
      if (!engine || (e.code !== 'Enter' && e.code !== 'Space')) return;
      const p = engine.getPhase();
      if (p === 'TITLE') {
        e.preventDefault();
        engine.startRun();
      } else if (p === 'GAME_OVER') {
        e.preventDefault();
        engine.restartRun();
      }
    };
    window.addEventListener('keydown', onKeyStartOrRestart);

    return () => {
      window.removeEventListener('anime-rush-pause', onAppPause);
      window.removeEventListener('keydown', onKeyStartOrRestart);
      delete window.__ANIME_RUSH_BACK__;
      engine?.dispose();
      engineRef.current = null;
    };
    // Initial mount only; quality & muted updates flow through dedicated setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlay = useCallback(() => {
    engineRef.current?.startRun();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseRun();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeRun();
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.restartRun();
  }, []);

  const handleHome = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleQualityChange = useCallback((nextQuality: QualityLevel) => {
    setQuality(nextQuality);
    saveQuality(nextQuality);
    engineRef.current?.setQuality(nextQuality);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      saveMuted(next);
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  return (
    <main className="app-shell">
      <div ref={stageRef} className="canvas-stage" />

      {engineError && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2 className="modal-title">ERREUR WEBGL</h2>
            <p className="control-hint">{engineError}</p>
          </div>
        </div>
      )}

      {!engineError && hud.phase === 'TITLE' && (
        <TitleScreen
          bestScore={hud.bestScore}
          quality={quality}
          muted={muted}
          onPlay={handlePlay}
          onQualityChange={handleQualityChange}
          onToggleMute={handleToggleMute}
        />
      )}

      {!engineError && hud.phase === 'PLAYING' && <GameHud hud={hud} onPause={handlePause} />}

      {!engineError && hud.phase === 'PAUSED' && (
        <PauseModal
          quality={quality}
          muted={muted}
          onResume={handleResume}
          onRestart={handleRestart}
          onHome={handleHome}
          onQualityChange={handleQualityChange}
          onToggleMute={handleToggleMute}
        />
      )}

      {!engineError && hud.phase === 'GAME_OVER' && (
        <GameOverModal hud={hud} onRestart={handleRestart} onHome={handleHome} />
      )}
    </main>
  );
};
