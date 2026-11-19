import React, { useEffect, useState } from 'react';
import { getHeroById } from '../config/catalog';
import {
  FpsLimit,
  PlayerProfile,
  QUALITY_PRESETS,
  QualityLevel,
  SocialBundle,
} from '../types/game';
import { CloseIcon, TrophyIcon, VolumeIcon } from './Icons';

interface SettingsModalProps {
  initialTab?: 'profile' | 'leaderboard';
  profile: PlayerProfile;
  social: SocialBundle;
  quality: QualityLevel;
  fpsLimit: FpsLimit;
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  hapticsEnabled: boolean;
  onRefreshLeaderboard: () => void;
  onSaveDisplayName: (name: string) => void;
  onQualityChange: (q: QualityLevel) => void;
  onFpsLimitChange: (fps: FpsLimit) => void;
  onToggleMute: () => void;
  onMusicVolumeChange: (vol: number) => void;
  onSfxVolumeChange: (vol: number) => void;
  onToggleHaptics: () => void;
  onReplayTutorial: () => void;
  onClose: () => void;
}

const QUALITY_OPTIONS: QualityLevel[] = ['low', 'medium', 'high'];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  initialTab = 'profile',
  profile,
  social,
  quality,
  fpsLimit,
  muted,
  musicVolume,
  sfxVolume,
  hapticsEnabled,
  onRefreshLeaderboard,
  onSaveDisplayName,
  onQualityChange,
  onFpsLimitChange,
  onToggleMute,
  onMusicVolumeChange,
  onSfxVolumeChange,
  onToggleHaptics,
  onReplayTutorial,
  onClose,
}) => {
  const [tab, setTab] = useState<'profile' | 'leaderboard'>(initialTab);
  const [nameInput, setNameInput] = useState(profile.displayName);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (tab === 'leaderboard') {
      onRefreshLeaderboard();
    }
  }, [tab, onRefreshLeaderboard]);

  const xpPct = Math.min(
    100,
    Math.max(4, Math.round((profile.xp / Math.max(1, profile.xpToNextLevel)) * 100)),
  );

  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div
        className="sheet-card"
        onClick={(e) => e.stopPropagation()}
        data-testid="settings-modal"
      >
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">
              {tab === 'profile' ? 'PROFIL, NIVEAU & PARAMÈTRES' : 'CLASSEMENT & RECORDS'}
            </h2>
            <p className="sheet-sub">
              Niveau {profile.level} · {profile.totalRuns} courses ·{' '}
              {profile.totalDistance.toLocaleString('fr-FR')} m
            </p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet-tabs" role="tablist" aria-label="Profil et Classement">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'profile'}
            className={`sheet-tab ${tab === 'profile' ? 'active' : ''}`}
            onClick={() => setTab('profile')}
            data-testid="profile-tab-info"
          >
            PROFIL &amp; NIVEAU
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'leaderboard'}
            className={`sheet-tab ${tab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setTab('leaderboard')}
            data-testid="profile-tab-leaderboard"
          >
            CLASSEMENT
          </button>
        </div>

        <div className="sheet-scroll">
          {tab === 'profile' ? (
            <div className="cards-list">
              <div className="season-summary-banner">
                <div className="shop-name-row" style={{ justifyContent: 'space-between' }}>
                  <strong>Niveau {profile.level} · {profile.displayName}</strong>
                  <span className="tag-pill tabular">
                    Record : {profile.bestScore.toLocaleString('fr-FR')}
                  </span>
                </div>
                <div className="progress-track" style={{ marginTop: 8 }}>
                  <div className="progress-fill" style={{ width: `${xpPct}%` }} />
                  <span className="tabular">
                    XP {profile.xp.toLocaleString('fr-FR')} / {profile.xpToNextLevel.toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>

              <form
                className="subsection-block"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (nameInput.trim()) onSaveDisplayName(nameInput.trim());
                }}
              >
                <label className="subsection-title" htmlFor="pseudo-input">
                  PSEUDO JOUEUR
                </label>
                <div className="search-row">
                  <input
                    id="pseudo-input"
                    type="text"
                    maxLength={24}
                    className="text-input"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                  />
                  <button type="submit" className="action-btn-gold">
                    ENREGISTRER
                  </button>
                </div>
              </form>

              <div className="subsection-block">
                <span className="subsection-title">QUALITÉ GRAPHIQUE 3D</span>
                <div className="quality-segmented">
                  {QUALITY_OPTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className={`quality-btn quality-${q} ${quality === q ? 'active' : ''}`}
                      onClick={() => onQualityChange(q)}
                    >
                      {QUALITY_PRESETS[q].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="subsection-block">
                <span className="subsection-title">FLUIDITÉ &amp; BATTERIE (FPS)</span>
                <div className="quality-segmented" role="group" aria-label="Limite d'images par seconde">
                  <button
                    type="button"
                    className={`quality-btn ${fpsLimit === 30 ? 'active' : ''}`}
                    onClick={() => onFpsLimitChange(30)}
                    data-testid="fps-30-btn"
                  >
                    30 FPS (Éco)
                  </button>
                  <button
                    type="button"
                    className={`quality-btn ${fpsLimit === 60 ? 'active' : ''}`}
                    onClick={() => onFpsLimitChange(60)}
                    data-testid="fps-60-btn"
                  >
                    60 FPS (Fluide)
                  </button>
                </div>
              </div>

              <div className="subsection-block">
                <span className="subsection-title">AUDIO MULTI-PISTES</span>
                <div className="audio-sliders-stack">
                  <label className="audio-slider-row">
                    <span>Musique</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(musicVolume * 100)}
                      onChange={(e) => onMusicVolumeChange(Number(e.target.value) / 100)}
                      data-testid="music-volume-slider"
                    />
                    <span className="tabular">{Math.round(musicVolume * 100)}%</span>
                  </label>
                  <label className="audio-slider-row">
                    <span>Effets SFX</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(sfxVolume * 100)}
                      onChange={(e) => onSfxVolumeChange(Number(e.target.value) / 100)}
                      data-testid="sfx-volume-slider"
                    />
                    <span className="tabular">{Math.round(sfxVolume * 100)}%</span>
                  </label>
                </div>
              </div>

              <button type="button" className="secondary-btn" onClick={onToggleMute}>
                <VolumeIcon muted={muted} size={18} />
                <span>{muted ? 'ACTIVER L’AUDIO' : 'COUPER TOUT L’AUDIO'}</span>
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={onToggleHaptics}
                data-testid="toggle-haptics-button"
              >
                <span>
                  {hapticsEnabled
                    ? 'VIBRATIONS HAPTIQUES : ACTIVÉES'
                    : 'VIBRATIONS HAPTIQUES : DÉSACTIVÉES'}
                </span>
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={onReplayTutorial}
                data-testid="replay-tutorial-button"
              >
                <span>REJOUER LE TUTORIEL GESTUEL</span>
              </button>

              <div className="subsection-block">
                <span className="subsection-title">COMMANDES EN COURSE</span>
                <p className="shop-desc">
                  Glisser à gauche / droite pour changer de voie · Glisser vers le haut pour sauter ·
                  Glisser vers le bas pour glisser ou plonger vite.
                </p>
              </div>

              <div className="subsection-block">
                <span className="subsection-title">SAUVEGARDE LOCALE</span>
                <p className="shop-desc">
                  Votre progression, vos héros et vos records sont enregistrés localement sur cet
                  appareil.
                </p>
              </div>
            </div>
          ) : (
            <div className="cards-list" data-testid="profile-leaderboard-list">
              {social.leaderboard.length === 0 ? (
                <div className="empty-state">Aucun score enregistré sur cet appareil.</div>
              ) : (
                social.leaderboard.map((entry, idx) => {
                  const isMe = entry.uid === profile.uid;
                  const hero = getHeroById(entry.equippedHeroId);

                  return (
                    <div
                      key={entry.uid}
                      className={`shop-row-card ${isMe ? 'highlight-card' : ''}`}
                    >
                      <div className="rank-badge tabular">
                        {idx < 3 ? <TrophyIcon size={16} /> : null}
                        <span>#{idx + 1}</span>
                      </div>
                      <div className="shop-info" style={{ flex: 1 }}>
                        <div className="shop-name-row">
                          <span className="shop-name">
                            {entry.displayName} {isMe ? '(Toi)' : ''}
                          </span>
                          <span className="tag-pill tabular">Lv.{entry.level}</span>
                        </div>
                        <span className="shop-desc">
                          {hero.name} · Record :{' '}
                          <strong className="tabular">
                            {entry.bestScore.toLocaleString('fr-FR')} pts
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
