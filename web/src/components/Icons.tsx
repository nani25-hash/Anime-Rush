import React from 'react';

export const CoinIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" fill="#FACC15" stroke="#FEF08A" strokeWidth="1.5" />
    <path d="M12 6.5L13.9 10.1L17.5 12L13.9 13.9L12 17.5L10.1 13.9L6.5 12L10.1 10.1Z" fill="#0EA5E9" />
  </svg>
);

export const PlayIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 5.25C7 4.44 7.9 3.96 8.58 4.4L19.16 11.15C19.79 11.55 19.79 12.45 19.16 12.85L8.58 19.6C7.9 20.04 7 19.56 7 18.75V5.25Z" />
  </svg>
);

export const PauseIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="5" width="4.5" height="14" rx="1.5" />
    <rect x="13.5" y="5" width="4.5" height="14" rx="1.5" />
  </svg>
);

export const RestartIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const HomeIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10.5L12 3l9 7.5" />
    <path d="M5 9.5V20h5v-5h4v5h5V9.5" />
  </svg>
);

export const TrophyIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FACC15" aria-hidden="true">
    <path d="M6 4h12v3a6 6 0 0 1-12 0V4Zm-3 1h3v3H4a2 2 0 0 1-2-2V5h1Zm18 0h-3v3h2a2 2 0 0 0 2-2V5h-1ZM11 13h2v4h3v2H8v-2h3v-4Z" />
  </svg>
);

export const VolumeIcon: React.FC<{ muted: boolean; size?: number }> = ({ muted, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
    {muted ? (
      <>
        <line x1="22" y1="9" x2="16" y2="15" />
        <line x1="16" y1="9" x2="22" y2="15" />
      </>
    ) : (
      <>
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.8 5.5a9.5 9.5 0 0 1 0 13" />
      </>
    )}
  </svg>
);
