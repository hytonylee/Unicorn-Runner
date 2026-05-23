import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Pocket, CloudLightning, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface OfflineIndicatorProps {
  isSimulatedOffline: boolean;
  setIsSimulatedOffline: (val: boolean) => void;
}

export default function OfflineIndicator({
  isSimulatedOffline,
  setIsSimulatedOffline,
}: OfflineIndicatorProps) {
  const [actualOnline, setActualOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setActualOnline(true);
    const handleOffline = () => setActualOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleMockOffline = () => {
    soundManager.playClick();
    setIsSimulatedOffline(!isSimulatedOffline);
  };

  const offlineActive = !actualOnline || isSimulatedOffline;

  return (
    <div 
      className="glass-panel rounded-3xl p-5 md:p-6 shadow-2xl text-left relative overflow-hidden"
      id="offline-engine-panel"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />

      <div className="flex items-center justify-between mb-4 pb-2 border-b border-purple-500/20">
        <h3 className="text-sm font-bold font-display text-white tracking-tight glow-text uppercase italic flex items-center gap-2">
          {offlineActive ? (
            <WifiOff className="w-4 h-4 text-rose-400" />
          ) : (
            <Wifi className="w-4 h-4 text-purple-400" />
          )}
          Offline-First status
        </h3>

        <button
          onClick={toggleMockOffline}
          id="toggle-mock-offline-btn"
          className={`px-3 py-1 text-xs rounded-xl font-mono border transition-all duration-300 font-semibold uppercase tracking-wider ${
            isSimulatedOffline
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700/60 hover:bg-slate-700 hover:text-white'
          }`}
        >
          {isSimulatedOffline ? 'Offline Active' : 'Simulate Offline'}
        </button>
      </div>

      <div className="space-y-4" id="offline-summary-card">
        {/* Connection status pills */}
        <div className="flex gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-mono text-slate-500">BROWSER LINK:</span>
            {actualOnline ? (
              <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                <Wifi className="w-3 h-3" /> ONLINE
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold text-rose-400 flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> OFFLINE
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/60 rounded-xl border border-slate-800/60">
            <span className="text-[10px] font-mono text-slate-500">GAME COMPUTATION:</span>
            <span className="text-[10px] font-mono font-bold text-pink-400 flex items-center gap-1">
              <Pocket className="w-3 h-3" /> 100% LOCAL
            </span>
          </div>
        </div>

        {/* Informative text on why it works offline */}
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          In strict compliance with classic Google Chrome 404 Dino game design patterns, this applet incorporates a stateful, offline-first client architecture:
        </p>

        <div className="space-y-2.5 text-xs text-slate-300" id="offline-feature-checklists">
          <div className="flex items-start gap-2 bg-slate-950/20 p-2.5 rounded-xl border border-slate-800/20">
            <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block text-[11px] font-semibold">Zero Assets Loading Overhead</strong>
              <span className="text-[11px] text-slate-400 leading-normal block">
                Unlike asset-heavy web apps, all Unicorn designs, PM obstacles, and background layers are drawn dynamically via pure HTML5 Canvas code and CSS vectors.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-slate-950/20 p-2.5 rounded-xl border border-slate-800/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block text-[11px] font-semibold">Offline Sound Synthesis</strong>
              <span className="text-[11px] text-slate-400 leading-normal block">
                Retro game audio chiptunes are compiled procedurally in real-time via the browser&apos;s Web Audio API oscillators and gains—no audio MP3 files or APIs required.
              </span>
            </div>
          </div>
        </div>

        {/* Warning card when offline simulated is active */}
        {offlineActive && (
          <div 
            className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-rose-300"
            id="mock-offline-alert-box"
          >
            <CloudLightning className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Offline Mode currently active.</strong> All high scores and records are safely cached in client space, and will automatically synchronize whenever networks reconnect!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
