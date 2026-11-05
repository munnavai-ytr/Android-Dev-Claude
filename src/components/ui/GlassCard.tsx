import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  radius?: 14 | 20 | 28;
  interactive?: boolean;
  glow?: 'accent' | 'agent' | 'none';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  radius = 20,
  interactive = false,
  glow = 'none',
  ...props
}) => {
  const radiusClass =
    radius === 14 ? 'rounded-[14px]' : radius === 28 ? 'rounded-[28px]' : 'rounded-[20px]';

  const glowClass =
    glow === 'accent' ? 'glow-accent' : glow === 'agent' ? 'glow-agent' : '';

  const interactiveClass = interactive
    ? 'hover:border-white/16 hover:bg-[#141722]/80 transition-all duration-200 cursor-pointer'
    : '';

  return (
    <div
      className={`bg-[#0E1016]/80 backdrop-blur-md border border-white/8 ${radiusClass} ${glowClass} ${interactiveClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
