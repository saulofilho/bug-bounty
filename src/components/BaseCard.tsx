import React from 'react';

export type CardElevation = 'flat' | 'subtle' | 'card' | 'elevated' | 'glass' | 'gradient-cyber';
export type CardBorder = 'none' | 'subtle' | 'default' | 'medium' | 'accent' | 'amber' | 'cyan' | 'critical';
export type CardPadding = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type CardRounded = 'md' | 'lg' | 'xl' | '2xl' | 'none';
export type CardHover = 'none' | 'border' | 'lift' | 'subtle';

export interface BaseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  elevation?: CardElevation;
  border?: CardBorder;
  padding?: CardPadding;
  rounded?: CardRounded;
  hover?: CardHover;
  interactive?: boolean;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'aside';
}

const elevationStyles: Record<CardElevation, string> = {
  flat: 'bg-[#0c0c10]',
  subtle: 'bg-[#0f0f15]',
  card: 'bg-[#121218] shadow-sm',
  elevated: 'bg-[#161622] shadow-xl',
  glass: 'bg-[#121218]/85 backdrop-blur-md shadow-lg',
  'gradient-cyber': 'bg-gradient-to-r from-[#14141e] via-[#111119] to-[#161624] shadow-lg'
};

const borderStyles: Record<CardBorder, string> = {
  none: 'border-0',
  subtle: 'border border-[#1c1c26]',
  default: 'border border-[#22222d]',
  medium: 'border border-[#2c2c3d]',
  accent: 'border border-emerald-500/35 shadow-[0_0_12px_rgba(16,185,129,0.08)]',
  amber: 'border border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.08)]',
  cyan: 'border border-cyan-500/35 shadow-[0_0_12px_rgba(6,182,212,0.08)]',
  critical: 'border border-red-500/50 shadow-[0_0_16px_rgba(239,68,68,0.2)]'
};

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  xs: 'p-2.5',
  sm: 'p-3.5',
  md: 'p-5',
  lg: 'p-6',
  xl: 'p-8'
};

const roundedStyles: Record<CardRounded, string> = {
  none: 'rounded-none',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-3xl'
};

const hoverStyles: Record<CardHover, string> = {
  none: '',
  border: 'hover:border-emerald-500/40 transition-colors duration-150',
  lift: 'hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-xl transition-all duration-200',
  subtle: 'hover:bg-[#161620] hover:border-[#2f2f42] transition-colors duration-150'
};

export const BaseCard = React.forwardRef<HTMLDivElement, BaseCardProps>(({
  children,
  elevation = 'card',
  border = 'default',
  padding = 'md',
  rounded = 'xl',
  hover = 'none',
  interactive = false,
  className = '',
  as = 'div',
  ...rest
}, ref) => {
  const Component = as;

  const interactiveClasses = interactive
    ? 'cursor-pointer active:scale-[0.99] select-none'
    : '';

  const finalClassName = [
    elevationStyles[elevation],
    borderStyles[border],
    paddingStyles[padding],
    roundedStyles[rounded],
    hoverStyles[hover],
    interactiveClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <Component
      ref={ref}
      className={finalClassName}
      {...rest}
    >
      {children}
    </Component>
  );
});

BaseCard.displayName = 'BaseCard';
