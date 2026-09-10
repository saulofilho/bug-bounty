import React from 'react';
import { ReportStatus } from '../types';
import { getStatusBadgeColor } from '../utils/formatters';

export interface StatusBadgeProps {
  status: ReportStatus;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  className?: string;
  customLabel?: string;
}

/**
 * Color-coded status badge for report states:
 * - REWARDED: Green (emerald) with glowing dot
 * - TRIAGED: Blue with blue dot
 * - DRAFT: Gray with muted dot
 * - SUBMITTED: Cyan with cyan dot
 * - RESOLVED: Teal with teal dot
 * - DUPLICATE: Amber with amber dot
 * - OUT_OF_SCOPE: Rose/Red with rose dot
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showDot = true,
  className = '',
  customLabel
}) => {
  const badgeInfo = getStatusBadgeColor(status);

  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[9px] gap-1',
    sm: 'px-2 py-0.5 text-[10px] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-2'
  }[size];

  const dotSizeClasses = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2'
  }[size];

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold rounded-md border tracking-wide whitespace-nowrap transition-colors select-none ${badgeInfo.bg} ${badgeInfo.text} ${badgeInfo.border} ${sizeClasses} ${className}`}
      title={`Status do Relatório: ${customLabel || badgeInfo.label} (${status})`}
    >
      {showDot && (
        <span 
          className={`rounded-full shrink-0 ${badgeInfo.dot} ${dotSizeClasses} ${
            status === 'REWARDED' ? 'shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse' : ''
          } ${
            status === 'TRIAGED' ? 'shadow-[0_0_6px_rgba(59,130,246,0.6)]' : ''
          }`} 
          aria-hidden="true"
        />
      )}
      <span>{customLabel || badgeInfo.label}</span>
    </span>
  );
};
