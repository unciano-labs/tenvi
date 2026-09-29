import React from 'react';

interface TenviIconProps extends React.SVGProps<SVGSVGElement> {
  variant?: 'solid' | 'monochrome' | 'transparent';
}

export function TenviIcon({
  className = 'w-6 h-6',
  variant = 'solid',
  ...props
}: TenviIconProps) {
  const isSolid = variant === 'solid';

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Tenvi"
      {...props}
    >
      {isSolid && <rect width="100" height="100" rx="24" fill="#0F172A" />}
      {/* Outer framing ring */}
      <circle
        cx="50"
        cy="50"
        r="35"
        stroke={isSolid ? '#FFFFFF' : 'currentColor'}
        strokeWidth="7"
      />
      {/* Clean T stem & crossbar */}
      <path
        d="M32 37.5H60M50 37.5V70"
        stroke={isSolid ? '#FFFFFF' : 'currentColor'}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Emerald growth ledger dot */}
      <circle cx="65.5" cy="37.5" r="4.5" fill="#10B981" />
    </svg>
  );
}
