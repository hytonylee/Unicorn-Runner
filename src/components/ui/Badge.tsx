import React from 'react';

type BadgeColor = 'purple' | 'indigo' | 'emerald' | 'amber' | 'rose';

const colorMap: Record<BadgeColor, string> = {
  purple:  'text-purple-400 bg-purple-500/10 border-purple-500/20',
  indigo:  'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  rose:    'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ color = 'purple', children, className = '' }: BadgeProps) {
  return (
    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${colorMap[color]} ${className}`}>
      {children}
    </span>
  );
}
