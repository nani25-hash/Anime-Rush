import React, { useState } from 'react';
import { PlayerProfile, QUALITY_PRESETS, QualityLevel } from '../types/game';
import { CloseIcon, VolumeIcon } from './Icons';

interface SettingsModalProps {
  profile: PlayerProfile;
  quality: QualityLevel;
  muted: boolean;
  hapticsEnabled: boolean;
  onSaveDisplayName: (name: string) => void;
  onQualityChange: (q: QualityLevel) => void;
  onToggleMute: () => void;
  onToggleHaptics: () => void;
  onClose: () => void;
}

const QUALITY_OPTIONS: QualityLevel[] = ['low', 'medium', 'high'];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  profile,
  quality,
  muted,
  hapticsEnabled,
  onSaveDisplayName,
  onQualityChange,
  onToggleMute,
  onToggleHaptics,
  onClose,
}) => {
  const [nameInput, setNameInput] = useState(profile.displayName);

  return (
    <div className="sheet-backdrop interactive" onClick={onClose}>
      <div className="sheet-card compact-sheet" onClick={(e) => e.stopPropagation()} data-testid="settings-modal">
        <div className="sheet-header">
          <div>
            <h2 className="sheet-title">PARAMÈTRES & PROFIL</h2>
            <p className="sheet-sub">
              Niveau {profile.level} · {profile.totalRuns} courses · {profile.totalDistance.toLocaleString('fr-FR')} m
            </p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="sheet-scroll">
          <div className="cards-list">
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

            <button type="button" className="secondary-btn" onClick={onToggleMute}>
              <VolumeIcon muted={muted} size={18} />
              <span>{muted ? 'ACTIVER L’AUDIO' : 'COUPER L’AUDIO'}</span>
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
                appareil. La sauvegarde Google est désactivée pour le moment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
