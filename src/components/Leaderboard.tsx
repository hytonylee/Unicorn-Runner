import React from 'react';
import { HighScore } from '../types';
import { Award, Trash2, Calendar, ShieldAlert } from 'lucide-react';
import { OBSTACLES_DATA } from '../data/obstacles';
import { soundManager } from '../utils/audio';
import { User } from 'firebase/auth';

function getLeaderboardObstacleInfo(killedByAcronym: string) {
  const norm = (killedByAcronym || '').trim().toLowerCase();
  
  // Map Hippo
  if (norm === 'hippo' || norm.includes('highest paid') || norm.includes('person\'s opinion')) {
    return {
      name: 'HiPPO',
      emoji: '🦛',
      fullName: "Highest Paid Person's Opinion (HiPPO)"
    };
  }
  
  // Map Zebra
  if (norm === 'zebra' || norm.includes('zero evidence') || norm.includes('really arrogant')) {
    return {
      name: 'ZEbRA',
      emoji: '🦓',
      fullName: 'Zero Evidence But Really Arrogant (ZEbRA)'
    };
  }
  
  // Map Wolf
  if (norm === 'wolf' || norm.includes('latest fire') || norm.includes('works on')) {
    return {
      name: 'WoLF',
      emoji: '🐺',
      fullName: "Works on Latest Fire (WoLF)"
    };
  }
  
  // Map Rhino
  if (norm === 'rhino' || norm.includes('high-value new') || norm.includes('opportunity')) {
    return {
      name: 'RHiNO',
      emoji: '🦏',
      fullName: 'Really High-value New Opportunity (RHiNO)'
    };
  }
  
  // Map Seagull
  if (norm === 'seagull' || norm.includes('seagells') || norm.includes('seagulls') || norm.includes('swoop') || norm.includes('swoop, squawk')) {
    return {
      name: 'Seagulls',
      emoji: '🦅',
      fullName: 'Seagull Manager'
    };
  }

  // Fallback
  return {
    name: killedByAcronym || 'Unknown',
    emoji: '⚠️',
    fullName: killedByAcronym || 'Unknown'
  };
}

interface LeaderboardProps {
  scores: HighScore[];
  onClear: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isOffline: boolean;
}

export default function Leaderboard({
  scores,
  onClear,
  user,
  onSignIn,
  onSignOut,
  isOffline,
}: LeaderboardProps) {
  const handleClearClick = () => {
    if (window.confirm('Are you sure you want to clear the locally cached product records?')) {
      soundManager.playClick();
      onClear();
    }
  };

  return (
    <div 
      className="glass-panel rounded-3xl p-5 md:p-6 shadow-2xl relative overflow-hidden"
      id="leaderboard-panel"
    >
      {/* Background ambient decorative shapes */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="flex items-center justify-between mb-4 border-b border-purple-500/20 pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold font-display text-white tracking-tight glow-text uppercase italic" id="leaderboard-title">
            PM Hall of Fame
          </h3>
        </div>
        
        {isOffline && scores.length > 0 && (
          <button
            onClick={handleClearClick}
            id="clear-scores-button"
            title="Clear all scores"
            className="p-1 px-2.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-mono transition-all flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Format DB</span>
          </button>
        )}
      </div>

      {/* Real-time Cloud Sync / Authenticated user details */}
      <div className="mb-4 bg-slate-950/60 border border-purple-500/10 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10 text-xs">
        {user ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Player'} referrerPolicy="no-referrer" className="w-6 h-6 rounded-full border border-purple-500/50" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-300 border border-purple-500/30">
                  PM
                </div>
              )}
              <div className="text-left">
                <div className="font-bold text-slate-200 truncate max-w-[120px]">{user.displayName || 'Authenticated PM'}</div>
                <div className="text-[9px] font-mono text-purple-400 uppercase tracking-widest">Active Google Sync</div>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/25 text-[10px] uppercase font-mono transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2.5 text-left">
            <div>
              <div className="font-bold text-slate-200">Cloud Leaderboard Active</div>
              <p className="text-[10px] text-slate-400 leading-tight">Log in to sync scores globally with other players!</p>
            </div>
            <button
              onClick={onSignIn}
              disabled={isOffline}
              className={`px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all font-semibold flex items-center justify-center gap-1 cursor-pointer text-[10px] uppercase font-mono tracking-wider`}
            >
              🚀 Google Log In
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1 relative z-10" id="scores-container-list">
        {scores.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs" id="no-scores-indicator">
            <span className="block text-2xl mb-1">📋</span>
            No custom launches saved yet! Begin a sprint to log your score.
          </div>
        ) : (
          scores
            .sort((a, b) => b.score - a.score)
            .slice(0, 50) // top 50 max display
            .map((item, idx) => {
              const obstacle = getLeaderboardObstacleInfo(item.killedByAcronym);
              const rankColor = 
                idx === 0 ? 'text-amber-400 bg-amber-400/10 font-bold shadow-[0_0_8px_rgba(251,191,36,0.1)] border border-amber-400/25' :
                idx === 1 ? 'text-slate-300 bg-slate-300/10 border border-slate-300/20' :
                idx === 2 ? 'text-amber-600 bg-amber-600/10 border border-amber-600/20' :
                'text-slate-400 bg-slate-800/40 border border-transparent';
 
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-800/40 bg-slate-950/20 hover:border-purple-500/20 hover:scale-[0.99] transition-all`}
                  id={`score-row-${item.id}`}
                >
                  <div className="flex items-center gap-3 text-left">
                    {/* Rank label */}
                    <span className={`px-2 h-6 rounded-lg text-xs font-mono flex items-center justify-center ${rankColor}`}>
                      #{idx + 1}
                    </span>
                    
                    <div>
                      <div className="text-xs font-bold font-sans text-slate-200 flex items-center gap-1.5 flex-wrap">
                        {item.name}
                        <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-mono rounded font-normal uppercase">
                          Lvl {item.level}
                        </span>
                      </div>
                      
                      {/* Death Cause Badge */}
                      {item.killedByAcronym && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                          <span className="text-xs flex-shrink-0">{obstacle.emoji}</span>
                          <span className="truncate max-w-[140px] md:max-w-[200px]" title={obstacle.fullName}>
                            Stopped by: {obstacle.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-mono text-slate-400 block p-0" id={`score-date-${item.id}`}>
                      {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-sm font-bold font-mono text-pink-400" id={`score-val-${item.id}`}>
                      {item.score} <span className="text-[10px] text-slate-600 font-sans font-normal">pts</span>
                    </span>
                  </div>
                </div>
              );
            })
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800/40 text-[10px] text-slate-500 font-mono text-left" id="scores-panel-footer">
        {isOffline ? (
          <span>* Offline mode active. Syncing locally to the browser&apos;s LocalStorage cache database.</span>
        ) : (
          <span>* Synced globally and securely using the Cloud Firestore database instance.</span>
        )}
      </div>
    </div>
  );
}

