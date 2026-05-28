import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export function Skeleton({ className = '', variant = 'rounded', ...props }: SkeletonProps) {
  const baseStyle = 'animate-pulse bg-gradient-to-r from-[var(--bg-muted)] via-[var(--bg-card-hover)] to-[var(--bg-muted)] bg-[length:200%_100%]';
  
  const variants = {
    rectangular: '',
    circular: 'rounded-full',
    rounded: 'rounded-xl',
  };

  return (
    <div
      className={`${baseStyle} ${variants[variant]} ${className}`}
      style={{
        animation: 'pulse-gradient 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }}
      {...props}
    />
  );
}
