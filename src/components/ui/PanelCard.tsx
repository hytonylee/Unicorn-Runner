import React from 'react';

interface PanelCardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function PanelCard({ children, className = '', id }: PanelCardProps) {
  return (
    <div
      className={`glass-panel rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden ${className}`}
      id={id}
    >
      {children}
    </div>
  );
}
