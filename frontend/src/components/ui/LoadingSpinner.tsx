import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: Props) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className="relative">
        {/* Glow behind the spinner */}
        <div className={`${sizes[size]} absolute inset-0 rounded-full bg-[var(--accent-primary)] blur-md opacity-20 animate-pulse`} />
        
        {/* The spinner itself */}
        <div 
          className={`${sizes[size]} relative border-t-transparent border-[var(--accent-primary)] border-solid rounded-full animate-spin`}
          style={{
            borderTopColor: 'transparent',
            borderRightColor: 'var(--accent-primary)',
            borderBottomColor: 'var(--accent-primary)',
            borderLeftColor: 'var(--accent-primary)',
          }}
        />
      </div>
    </div>
  );
}
