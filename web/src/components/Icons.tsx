import React from 'react';

export const CoinIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="ar-coin-grad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FEF9C3" />
        <stop offset="45%" stopColor="#FACC15" />
        <stop offset="100%" stopColor="#B45309" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="10.2" fill="url(#ar-coin-grad)" stroke="#FEF08A" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="7.4" fill="none" stroke="rgba(146, 64, 14, 0.5)" strokeWidth="1.2" />
    <path
      d="M8.5 11.5 L8.5 7.2 L11 9.4 L13 9.4 L15.5 7.2 L15.5 11.5 A3.8 3.8 0 1 1 8.5 11.5 Z"
      fill="#78350F"
    />
  </svg>
);

export const GemIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="ar-gem-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#E9D5FF" />
        <stop offset="45%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#581C87" />
      </linearGradient>
    </defs>
    <polygon points="12,2 21,9 12,22 3,9" fill="url(#ar-gem-grad)" stroke="#F3E8FF" strokeWidth="1.4" />
    <polygon points="12,2 21,9 12,11" fill="rgba(255,255,255,0.28)" />
    <polygon points="12,11 21,9 12,22" fill="rgba(59,7,100,0.45)" />
  </svg>
);

export const FuelCanIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="ar-fuel-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FB923C" />
        <stop offset="50%" stopColor="#EF4444" />
        <stop offset="100%" stopColor="#991B1B" />
      </linearGradient>
    </defs>
    <path d="M14.5 3.5h3.5l2 2v14.5a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 20V7.5L8.5 4h5l1-0.5Z" fill="url(#ar-fuel-grad)" stroke="#FED7AA" strokeWidth="1.4" />
    <rect x="8.5" y="5.5" width="4.5" height="2" rx="0.8" fill="#0F172A" />
    <path d="M8 10.5l8 7M16 10.5l-8 7" stroke="#FDE047" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const CarIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="ar-car-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FACC15" />
        <stop offset="50%" stopColor="#F97316" />
        <stop offset="100%" stopColor="#DC2626" />
      </linearGradient>
    </defs>
    <path d="M3 14.5l2.2-4.2h4l2.2-2.8h4.8l1.8 2.8 3 1.4v3.8a1.2 1.2 0 0 1-1.2 1.2h-1.3" fill="url(#ar-car-grad)" stroke="#FEF08A" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M3 14.5h18" stroke="#22D3EE" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M10.5 7.5 8.5 10.3h4.2" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="7" cy="17.2" r="2.3" fill="#0F172A" stroke="#E2E8F0" strokeWidth="1.4" />
    <circle cx="17" cy="17.2" r="2.3" fill="#0F172A" stroke="#E2E8F0" strokeWidth="1.4" />
  </svg>
);

export const BoltIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="ar-bolt-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#E0F2FE" />
        <stop offset="45%" stopColor="#22D3EE" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
    </defs>
    <path d="M13.5 2 4.5 13.5h6.5L9.5 22l10-12h-6.5L13.5 2Z" fill="url(#ar-bolt-grad)" stroke="#F8FAFC" strokeWidth="1.4" strokeLinejoin="round" />
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

export const MenuIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

export const CloseIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);

export const RestartIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const HomeIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 3.2 3 10.6v9.9h6.2v-5.6h5.6v5.6H21v-9.9L12 3.2Z" />
  </svg>
);

export const ShopIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 9h16l-1.5-5h-13L4 9Z" fill="#EF4444" stroke="#FEF08A" strokeWidth="1.2" />
    <rect x="5" y="9" width="14" height="11" rx="1.5" fill="#F8FAFC" />
    <rect x="9" y="13" width="6" height="7" fill="#22D3EE" />
  </svg>
);

export const HeroIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="4" fill="#F8FAFC" />
    <path d="M7.5 6.8L12 3l4.5 3.8" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
    <path d="M5 20c0-3.5 3.1-5.8 7-5.8s7 2.3 7 5.8" fill="#93C5FD" />
  </svg>
);

export const InventoryIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M8 7V5a4 4 0 0 1 8 0v2" stroke="#67E8F9" strokeWidth="2" />
    <rect x="5" y="7" width="14" height="14" rx="3" fill="#0EA5E9" stroke="#CFFAFE" strokeWidth="1.3" />
    <rect x="8" y="12" width="8" height="4" rx="1" fill="#0F172A" />
  </svg>
);

export const CollectionIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="6" width="9" height="13" rx="2" transform="rotate(-10 3 6)" fill="#6366F1" stroke="#E0E7FF" strokeWidth="1.2" />
    <rect x="10" y="5" width="10" height="14" rx="2" fill="#EC4899" stroke="#FCE7F3" strokeWidth="1.3" />
    <path d="M15 9l1.3 2.5L19 12.8l-2.7 1.3L15 16.6l-1.3-2.5L11 12.8l2.7-1.3L15 9Z" fill="#FEF08A" />
  </svg>
);

export const TrophyIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="ar-trophy-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="60%" stopColor="#FACC15" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
    <path
      d="M6 4h12v3a6 6 0 0 1-12 0V4Zm-3 1h3v3H4a2 2 0 0 1-2-2V5h1Zm18 0h-3v3h2a2 2 0 0 0 2-2V5h-1ZM11 13h2v4h3v2H8v-2h3v-4Z"
      fill="url(#ar-trophy-grad)"
      stroke="#FEF9C3"
      strokeWidth="1.2"
    />
  </svg>
);

export const AchievementIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="11" r="7" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
    <polygon points="12,6.5 13.4,9.5 16.7,9.9 14.3,12.2 14.9,15.4 12,13.8 9.1,15.4 9.7,12.2 7.3,9.9 10.6,9.5" fill="#FFFBEB" />
    <path d="M9 17.5V22l3-1.6 3 1.6v-4.5" fill="#EF4444" />
  </svg>
);

export const FriendsIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="9" cy="8.5" r="3.2" fill="#BAE6FD" />
    <circle cx="16.5" cy="9.5" r="2.6" fill="#7DD3FC" />
    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" fill="#E0F2FE" />
    <path d="M13.5 19.5c.3-2.2 1.8-3.8 4-3.8 2.1 0 3.5 1.5 3.5 3.8" fill="#38BDF8" />
  </svg>
);

export const MailIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2.5" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.2" />
    <path d="M3.5 6l8.5 7 8.5-7" stroke="#0EA5E9" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChestIcon: React.FC<{ size?: number }> = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="6" width="18" height="13" rx="2.5" fill="#0369A1" stroke="#67E8F9" strokeWidth="1.4" />
    <path d="M3 11h18" stroke="#38BDF8" strokeWidth="2.2" />
    <rect x="10" y="9.5" width="4" height="4.5" rx="1" fill="#FACC15" />
  </svg>
);

export const RunnerIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="14.5" cy="4.5" r="2.2" />
    <path d="M10.2 8.2 7.5 10.6l1.6 1.5 2.1-1.7 2 1.1-2.5 3.8-4.5.9.5 2.2 5.4-1.1 2.2-3.2 2.4 2.1-.9 4.5 2.2.4 1.3-5.9-3.1-2.7 1.2-2.2 2.9 1.4.9-2-4.7-2.2-5.3.7Z" />
  </svg>
);

export const PassIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7Z" fill="#FACC15" stroke="#FEF08A" strokeWidth="1.3" />
    <polygon points="12,8.5 13.1,10.8 15.6,11.1 13.8,12.8 14.2,15.3 12,14.1 9.8,15.3 10.2,12.8 8.4,11.1 10.9,10.8" fill="#B45309" />
  </svg>
);

export const CartIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="20" r="1.5" fill="currentColor" />
    <circle cx="17" cy="20" r="1.5" fill="currentColor" />
    <path d="M3 4h2l2.4 11.2h10.8l2-7.2H6.5" />
  </svg>
);

export const MagnetIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 4v7a6 6 0 0 0 12 0V4h-3.5v7a2.5 2.5 0 0 1-5 0V4H6Z" fill="#EF4444" stroke="#E2E8F0" strokeWidth="1.3" />
    <rect x="6" y="4" width="3.5" height="3" fill="#CBD5E1" />
    <rect x="14.5" y="4" width="3.5" height="3" fill="#CBD5E1" />
  </svg>
);

export const ShieldIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="ar-shield-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="50%" stopColor="#22C55E" />
        <stop offset="100%" stopColor="#15803D" />
      </linearGradient>
    </defs>
    <path d="M12 2.5 4.5 6v6.2c0 4.6 3.2 8.6 7.5 9.8 4.3-1.2 7.5-5.2 7.5-9.8V6L12 2.5Z" fill="url(#ar-shield-grad)" stroke="#DCFCE7" strokeWidth="1.5" />
    <path d="M12 7v9M8.5 11.5h7" stroke="#FFF" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const SakuraIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="6.5" r="3.4" fill="#F9A8D4" />
    <circle cx="17.2" cy="10.2" r="3.4" fill="#F472B6" />
    <circle cx="15.2" cy="16.4" r="3.4" fill="#F9A8D4" />
    <circle cx="8.8" cy="16.4" r="3.4" fill="#F472B6" />
    <circle cx="6.8" cy="10.2" r="3.4" fill="#F9A8D4" />
    <circle cx="12" cy="12" r="2.3" fill="#FEF08A" />
  </svg>
);

export const MissionsIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3" fill="#0F172A" stroke="#FACC15" strokeWidth="1.6" />
    <path d="M8 10l2.2 2.2L15.8 7" stroke="#4ADE80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="8" y1="15.5" x2="16" y2="15.5" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const GateGoalIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M3 5h18v3H3z" fill="#E2E8F0" />
    <path d="M5 8h2.5v13H5zM16.5 8H19v13h-2.5z" fill="#CBD5E1" />
    <rect x="7.5" y="9" width="9" height="4" fill="#0F172A" />
    <rect x="7.5" y="9" width="3" height="2" fill="#F8FAFC" />
    <rect x="13.5" y="9" width="3" height="2" fill="#F8FAFC" />
    <rect x="10.5" y="11" width="3" height="2" fill="#F8FAFC" />
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

export const PawIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="ar-paw-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="55%" stopColor="#F97316" />
        <stop offset="100%" stopColor="#EA580C" />
      </linearGradient>
    </defs>
    <ellipse cx="7" cy="8.5" rx="2.1" ry="2.7" fill="url(#ar-paw-grad)" />
    <ellipse cx="12" cy="6.6" rx="2.1" ry="2.8" fill="url(#ar-paw-grad)" />
    <ellipse cx="17" cy="8.5" rx="2.1" ry="2.7" fill="url(#ar-paw-grad)" />
    <path
      d="M7.2 14.5c0-2.1 2.2-3.7 4.8-3.7s4.8 1.6 4.8 3.7c0 2.3-1.8 4.2-4.8 4.2s-4.8-1.9-4.8-4.2Z"
      fill="url(#ar-paw-grad)"
      stroke="#FEF9C3"
      strokeWidth="1.2"
    />
  </svg>
);

export const GearIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M19.4 13.5a7.7 7.7 0 0 0 .06-1.5 7.7 7.7 0 0 0-.06-1.5l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-2.6-1.5l-.38-2.65A.5.5 0 0 0 13 1h-4a.5.5 0 0 0-.49.42l-.38 2.65a7.3 7.3 0 0 0-2.6 1.5l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64L2.66 10.5a7.7 7.7 0 0 0-.06 1.5 7.7 7.7 0 0 0 .06 1.5L.55 15.15a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1a7.3 7.3 0 0 0 2.6 1.5l.38 2.65A.5.5 0 0 0 9 23h4a.5.5 0 0 0 .49-.42l.38-2.65a7.3 7.3 0 0 0 2.6-1.5l2.49 1a.5.5 0 0 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64L19.4 13.5ZM11 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
      fill="#F8FAFC"
      stroke="#0F172A"
      strokeWidth="1.2"
      transform="translate(1 0)"
    />
  </svg>
);

export const PlusIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const StarMultiplierIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="ar-starmult-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="55%" stopColor="#FACC15" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
    </defs>
    <polygon
      points="11,2.2 13.8,7.9 20,8.8 15.5,13.2 16.6,19.4 11,16.5 5.4,19.4 6.5,13.2 2,8.8 8.2,7.9"
      fill="url(#ar-starmult-grad)"
      stroke="#FEF9C3"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <rect x="13.5" y="12.5" width="9" height="9" rx="2.5" fill="#0EA5E9" stroke="#FFFFFF" strokeWidth="1.2" />
    <path d="M16 15l4 4M20 15l-4 4" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

