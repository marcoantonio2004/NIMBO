import React from 'react';

interface BotIconProps {
  className?: string;
}

export const BotIcon: React.FC<BotIconProps> = ({ className = 'w-7 h-7' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Antenna */}
      <rect x="48" y="8" width="4" height="14" rx="2" fill="#fecdd3" />
      <circle cx="50" cy="7" r="5" fill="#fb7185" />
      <circle cx="50" cy="7" r="2.2" fill="#ffffff" />

      {/* Ear Muffs */}
      <rect x="8" y="36" width="8" height="22" rx="4" fill="#f43f5e" />
      <rect x="10" y="40" width="4" height="14" rx="2" fill="#ffffff" opacity="0.8" />
      <rect x="84" y="36" width="8" height="22" rx="4" fill="#f43f5e" />
      <rect x="86" y="40" width="4" height="14" rx="2" fill="#ffffff" opacity="0.8" />

      {/* Head */}
      <rect x="13" y="19" width="74" height="60" rx="23" fill="#ffffff" />
      {/* Head Gloss highlight */}
      <ellipse cx="50" cy="24" rx="25" ry="4" fill="#ffffff" opacity="0.9" />

      {/* Visor */}
      <rect x="22" y="29" width="56" height="40" rx="15" fill="#181124" />
      <rect x="23" y="30" width="54" height="38" rx="14" stroke="#fb7185" strokeOpacity="0.4" strokeWidth="0.8" />

      {/* Big Friendly Glowing Eyes */}
      <ellipse cx="36" cy="46" rx="6.5" ry="8" fill="#38bdf8" />
      <circle cx="34.5" cy="43.5" r="2.2" fill="#ffffff" />
      <circle cx="38" cy="49" r="1.1" fill="#ffffff" opacity="0.85" />

      <ellipse cx="64" cy="46" rx="6.5" ry="8" fill="#38bdf8" />
      <circle cx="62.5" cy="43.5" r="2.2" fill="#ffffff" />
      <circle cx="66" cy="49" r="1.1" fill="#ffffff" opacity="0.85" />

      {/* Cute Rosy Cheeks */}
      <ellipse cx="30" cy="57" rx="4.5" ry="2.2" fill="#f43f5e" opacity="0.75" />
      <ellipse cx="70" cy="57" rx="4.5" ry="2.2" fill="#f43f5e" opacity="0.75" />

      {/* Sweet Smile */}
      <path d="M44 56 Q50 61 56 56" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />

      {/* Floating Collar & Body Base */}
      <rect x="42" y="81" width="16" height="4" rx="2" fill="#f43f5e" />
      <path d="M37 86 C37 83 63 83 63 86 L60 94 C60 96 40 96 40 94 Z" fill="#ffffff" />
      <circle cx="50" cy="89" r="2" fill="#fb7185" />
    </svg>
  );
};
