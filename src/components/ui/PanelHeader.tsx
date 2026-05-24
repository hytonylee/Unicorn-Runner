import React from 'react';

interface PanelHeaderProps {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}

export function PanelHeader({ icon, title, action }: PanelHeaderProps) {
  return (
    <div className={`flex items-center mb-4 border-b border-purple-500/20 pb-3 relative z-10 ${action ? 'justify-between' : ''}`}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold font-display text-white tracking-tight glow-text uppercase italic">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}
