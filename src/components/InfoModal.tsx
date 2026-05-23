import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ObstacleType } from '../types';
import { OBSTACLES_DATA, getThemeForLevel } from '../data/obstacles';
import { soundManager } from '../utils/audio';
import { RotateCcw, Award, Flame, Lightbulb, Share2, HelpCircle, User as UserIcon, Check, X } from 'lucide-react';
import { User } from 'firebase/auth';

interface InfoModalProps {
  isOpen: boolean;
  obstacleType: ObstacleType;
  score: number;
  level: number;
  onRestart: (playerName: string) => void;
  highScores: any[];
  isNewHighScore: boolean;
  onClose: () => void;
  user: User | null;
}

export default function InfoModal({
  isOpen,
  obstacleType,
  score,
  level,
  onRestart,
  highScores,
  isNewHighScore,
  onClose,
  user,
}: InfoModalProps) {
  const [playerName, setPlayerName] = useState(() => {
    const saved = localStorage.getItem('pm_unicorn_player_name');
    if (saved === 'Product Rookie') {
      return '';
    }
    return saved || '';
  });
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (user?.displayName && !playerName) {
      setPlayerName(user.displayName);
    }
  }, [user]);

  useEffect(() => {
    if (playerName) {
      localStorage.setItem('pm_unicorn_player_name', playerName);
    }
  }, [playerName]);

  const getProductExpertise = (s: number) => {
    if (s < 300) return 'Product Rookie';
    if (s < 800) return 'Associate PM';
    if (s < 1500) return 'Senior PM';
    return 'Product Unicorn';
  };

  const obstacleInfo = OBSTACLES_DATA[obstacleType];
  if (!obstacleInfo) return null;

  const handleRestartClick = () => {
    soundManager.playClick();
    onRestart(playerName);
  };

  const shareScore = () => {
    soundManager.playClick();
    const shareText = `🦄 I scored ${score} pts in Unicorn 404 Runner! I was stopped by a dangerous ${obstacleInfo.name} (${obstacleInfo.acronym}). Can you launch this product without getting run over? Try it here!`;
    navigator.clipboard.writeText(shareText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          {/* Backdrop with elegant blur */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            key="modal-content"
            initial={{ scale: 0.88, opacity: 0, y: 30, rotate: -2 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0, 
              rotate: 0,
              transition: { type: 'spring', stiffness: 220, damping: 20 }
            }}
            exit={{ scale: 0.9, opacity: 0, y: -20, rotate: 1 }}
            id="crash-modal"
            className="relative w-full max-w-lg glass-panel rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] z-10"
          >
            {/* Top decorative gradient bar based on animal team */}
            <div className={`h-2.5 bg-gradient-to-r ${obstacleInfo.color}`} />

            {/* Top Right Close Button */}
            <button
              onClick={onClose}
              id="close-modal-top-x"
              className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-950/60 rounded-full p-2 border border-white/10 hover:border-purple-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer z-20"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 md:p-8 text-center">
              {/* Immersive crash explosion bubble */}
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-5 border border-red-500/50 mx-auto shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <span className="text-4xl">💥</span>
              </div>

              <h2 className="text-xl md:text-2xl font-black mb-1 text-red-400 font-display tracking-tight uppercase">
                GAME OVER: COLLISION DETECTED
              </h2>
              <div className="text-xs text-purple-400 font-mono tracking-widest uppercase mb-6" id="modal-current-level-display">
                {getThemeForLevel(score).levelName}
              </div>

              {/* Comical Heading header */}
              <div className="bg-white/5 p-4 rounded-2xl mb-6 border border-white/10 text-left">
                <div className="flex gap-3 mb-2.5 items-center">
                  <span className="text-2xl select-none" id="modal-animal-avatar">{obstacleInfo.emoji}</span>
                  <div>
                    <div className="text-purple-400 font-bold uppercase text-[9px] tracking-widest mb-0.5">You were stopped by:</div>
                    <h3 className="text-base font-extrabold font-display text-white italic tracking-tight" id="modal-animal-fullname">
                      {obstacleInfo.fullName}
                    </h3>
                  </div>
                </div>

                {/* Sarcastic quote callout */}
                <p className="text-xs italic font-sans text-slate-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5 relative">
                  {obstacleInfo.sarcasticQuote}
                </p>
              </div>

              {/* Educational breakdown */}
              <div className="space-y-4 mb-6 text-left" id="modal-educational-breakdown">
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                    Who are they in Product?
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-normal font-sans bg-slate-950/40 p-3 rounded-xl border border-white/5">
                    {obstacleInfo.pmConcept}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3" id="modal-perf-stats">
                  <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl flex items-center gap-3">
                    <Flame className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">DISTANCE</div>
                      <div className="text-sm font-bold font-mono text-amber-300">{score}m</div>
                    </div>
                  </div>
                  <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl flex items-center gap-3">
                    <Lightbulb className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                    <div>
                      <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">LAUNCH METRIC</div>
                      <div className="text-xs font-bold font-sans text-indigo-300">
                        {score >= 1200 ? '⭐ Market Fit' : score >= 500 ? '🌱 MVP Landed' : '❌ Concept Dead'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expertise Rating Card */}
                <div className="bg-slate-950/40 border border-purple-500/10 p-3.5 rounded-xl flex flex-col items-center justify-center text-center" id="modal-expertise-assessment">
                  <div className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Expertise Level</div>
                  <div className="text-xs font-bold font-sans text-purple-300 mt-1">
                    ✨ You are a <span className="text-white underline decoration-purple-500/50 underline-offset-4 decoration-2 font-black uppercase tracking-wider">"{getProductExpertise(score)}"</span>
                  </div>
                </div>
              </div>

              {/* High Score Submission Section */}
              {isNewHighScore && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl text-left"
                  id="high-score-announcement"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-purple-300">
                      <Award className="w-5 h-5 animate-bounce" />
                      <span className="font-display font-bold text-xs uppercase tracking-wider">New High Score Record!</span>
                    </div>
                    {user ? (
                      <span className="text-[9px] font-mono text-emerald-400 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Google Synced</span>
                    ) : (
                      <span className="text-[9px] font-mono text-amber-400 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Guest Mode</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="relative flex-grow">
                      <UserIcon className="absolute left-3 top-2.5 w-4 font-normal text-slate-400 h-4" />
                      <input
                        type="text"
                        maxLength={18}
                        id="player-name-input"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Enter your name to log score..."
                        className="w-full bg-slate-950/80 border border-purple-500/20 focus:border-purple-500 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 md:text-sm focus:outline-none transition-colors"
                      />
                    </div>
                    <span className="text-lg font-mono font-bold text-purple-400 px-2 select-none">
                      {score}
                    </span>
                  </div>

                  {!user && (
                    <p className="text-[10px] text-slate-400 leading-tight">
                      ℹ️ You don't need Google authorization to list your score! Your typed name will be registered directly onto the global PM Hall of Fame.
                    </p>
                  )}
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6" id="modal-actions-wrapper">
                <button
                  onClick={handleRestartClick}
                  id="restart-button-modal"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer uppercase tracking-widest text-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  Respawn in Forest
                </button>
                <button
                  onClick={shareScore}
                  id="share-button-modal"
                  className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold rounded-xl border border-purple-900/30 transition-all active:scale-95 cursor-pointer text-xs"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-purple-400" />}
                  {isCopied ? 'Copied!' : 'Copy Stats'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
