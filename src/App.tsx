import React, { useState, useEffect, useReducer } from 'react';
import { Trophy, HelpCircle, Volume2, VolumeX, Zap } from 'lucide-react';
import { ObstacleType, HighScore } from './types';
import { OBSTACLES_DATA } from './data/obstacles';
import { soundManager } from './utils/audio';

import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { scoreStore, RateLimitError } from './lib/scoreStore';
import { gameReducer, initialGameState } from './reducers/gameReducer';

import GameCanvas from './components/GameCanvas';
import InfoModal from './components/InfoModal';
import Leaderboard from './components/Leaderboard';
import OfflineIndicator from './components/OfflineIndicator';
import { PanelCard } from './components/ui/PanelCard';
import { PanelHeader } from './components/ui/PanelHeader';
import { Badge } from './components/ui/Badge';

export default function App() {
  // Game lifecycle state — transitions are atomic via reducer
  const [game, dispatch] = useReducer(gameReducer, initialGameState);

  // High-frequency render state (updated 60fps from physics hook)
  const [score, setScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);

  // External / independent state
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [highScoresList, setHighScoresList] = useState<HighScore[]>([]);

  // Google auth state
  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Personal best and mute state init
  useEffect(() => {
    dispatch({ type: 'INIT_BEST_SCORE', score: scoreStore.getBestScore() });
    setIsMuted(soundManager.getIsMuted());
  }, []);

  // Live leaderboard subscription — switches between Firestore and localStorage
  useEffect(() => {
    return scoreStore.subscribe(isSimulatedOffline, setHighScoresList);
  }, [isSimulatedOffline]);

  const handleSignIn = async () => {
    try {
      soundManager.playClick();
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      soundManager.playClick();
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(soundManager.toggleMute());
    soundManager.playClick();
  };

  const startGame = () => {
    soundManager.playClick();
    setScore(0);
    setLevel(1);
    dispatch({ type: 'START' });
  };

  const handleGameOver = (obstacle: ObstacleType) => {
    if (score > game.highScore) {
      scoreStore.saveBestScore(score);
    }
    dispatch({ type: 'GAME_OVER', obstacle, currentScore: score });
  };

  const submitScore = async (playerName: string) => {
    const finalName = playerName.trim() || 'Secret Product Ninja 🥷';
    try {
      const updatedList = await scoreStore.submit(
        {
          name: finalName,
          score,
          date: new Date().toISOString(),
          level,
          killedByAcronym: game.killedBy,
          killedByName:    OBSTACLES_DATA[game.killedBy]?.fullName || 'Unknown',
          userId: user?.uid,
        },
        isSimulatedOffline
      );
      if (isSimulatedOffline) {
        setHighScoresList(updatedList);
      }
    } catch (err) {
      if (err instanceof RateLimitError) {
        alert(`Score not submitted: ${err.message}`);
      } else {
        console.error('Score submission failed:', err);
      }
    }
  };

  const handleCloseModal = async (playerName: string) => {
    soundManager.playClick();
    await submitScore(playerName);
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const handleModalRestart = async (playerName: string) => {
    await submitScore(playerName);
    startGame();
  };

  const handleClearScores = () => {
    if (isSimulatedOffline) {
      scoreStore.clear();
      setHighScoresList([]);
      dispatch({ type: 'CLEAR_BEST_SCORE' });
    } else {
      alert('Cloud database entries are fully immutable. Register a new high score to conquer the Hall of Fame!');
    }
  };

  const isScoreHighScore = score > 0;

  return (
    <div className="min-h-screen pb-16 flex flex-col justify-between" id="applet-viewport">

      {/* Offline mode banner */}
      {isSimulatedOffline && (
        <div
          className="w-full bg-rose-500/20 border-b border-rose-500/30 px-4 py-2 text-center text-xs text-rose-300 font-mono flex items-center justify-center gap-2 animate-pulse"
          id="mock-offline-top-banner"
        >
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          Offline-First simulation active. All scores saved securely inside persistent client-side localStorage.
        </div>
      )}

      <div className="max-w-4xl w-full mx-auto px-4 md:px-6 pt-8 flex-grow flex flex-col justify-start">

        {/* Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8" id="applet-header">
          <div className="text-center sm:text-left">
            <div className="text-[10px] md:text-xs tracking-[0.2em] text-purple-400 font-black uppercase mb-1">
              PROJECT: STARTUP FOREST
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <span className="text-3xl animate-float filter drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]">🦄</span>
              <h1 className="text-2xl md:text-3xl font-black italic glow-text tracking-tight text-white">
                UNICORN RUNNER
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-mono tracking-wide mt-1">
              DODGE CORPORATE ANIMAL STAKEHOLDERS &amp; LAUNCH COGNITIVE MVP
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md p-3 px-5 rounded-2xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]" id="hud-controls-panel">
            <div className="flex items-center gap-5 text-left select-none pr-4 border-r border-slate-800">
              <div>
                <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase tracking-widest">HI-SCORE</span>
                <span className="text-base font-bold font-mono text-yellow-400 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  {Math.max(game.highScore, score)}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase tracking-widest">DISTANCE</span>
                <span className="text-base font-bold font-mono text-purple-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 animate-pulse" />
                  {score}<span className="text-xs opacity-60">m</span>
                </span>
              </div>
            </div>
            <button
              onClick={handleMuteToggle}
              id="audio-mute-toggle"
              title={isMuted ? 'Unmute cozy retro audio' : 'Mute cozy retro audio'}
              className={`p-2 rounded-xl transition-all border cursor-pointer ${
                isMuted
                  ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
                  : 'bg-purple-900/20 border-purple-500/40 text-purple-300 hover:bg-purple-900/30'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse-glow" />}
            </button>
          </div>
        </header>

        {/* Game stage */}
        <div className="mb-8 relative" id="game-stage-wrapper">
          <GameCanvas
            gameStarted={game.gameStarted}
            gameOver={game.gameOver}
            isPaused={game.isPaused}
            onScoreUpdate={(s, l) => { setScore(s); setLevel(l); }}
            onGameOver={handleGameOver}
            onRequestStart={startGame}
          />
        </div>

        {/* Bento info panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-stretch items-start mt-2 mb-12" id="bento-hub-grid">

          <PanelCard className="text-left h-full flex flex-col" id="educational-dictionary-panel">
            <PanelHeader
              icon={<HelpCircle className="w-5 h-5 text-purple-400" />}
              title="PM Blockers Encyclopedia"
            />
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              The classic dinosaur 404 game helps you offline. This training module helps you survive the corporate workspace by outlining how dangerous stakeholders derail growth agendas:
            </p>
            <div className="space-y-3 flex-1" id="encyclopedia-scrolling-view">
              {Object.values(OBSTACLES_DATA).map((animal) => (
                <div
                  key={animal.type}
                  className="p-3 bg-slate-950/60 border border-purple-950 rounded-2xl flex items-start gap-4 hover:border-purple-500/20 transition-all group"
                  id={`blocker-spec-${animal.type}`}
                >
                  <span className="text-2xl pt-0.5 filter group-hover:scale-110 duration-200 transition-transform select-none">
                    {animal.emoji}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold font-display text-white flex items-center gap-2 flex-wrap">
                      <span className="text-slate-100 font-bold">{animal.name}</span>
                      <Badge>{animal.acronym}</Badge>
                    </h4>
                    <p className="text-[10px] text-slate-300 font-sans mt-1.5 leading-normal">
                      {animal.pmConcept}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </PanelCard>

          <div className="space-y-6 flex flex-col justify-between h-full" id="analytics-column">
            <Leaderboard
              scores={highScoresList}
              onClear={handleClearScores}
              user={user}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              isOffline={isSimulatedOffline}
            />
            <OfflineIndicator
              isSimulatedOffline={isSimulatedOffline}
              setIsSimulatedOffline={setIsSimulatedOffline}
            />
          </div>
        </div>
      </div>

      <InfoModal
        isOpen={game.gameOver}
        obstacleType={game.killedBy}
        score={score}
        level={level}
        onRestart={handleModalRestart}
        highScores={highScoresList}
        isNewHighScore={isScoreHighScore}
        onClose={handleCloseModal}
        user={user}
      />

      <footer
        className="h-12 bg-black/40 border-t border-white/5 flex items-center px-6 sm:px-8 justify-between z-20 text-[10px] text-slate-400 uppercase tracking-[0.3em] font-mono select-none"
        id="global-page-footer"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
          <span>Build: Alpha-7.2 (Offline Mode Active)</span>
        </div>
        <div className="hidden md:block">
          <a
            href="https://www.linkedin.com/in/hytonylee/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-purple-400 transition-colors"
          >
            No Roadblocks Found → ☕️ Coffee Chat
          </a>
        </div>
        <div>
          <span>© 2026 hytonylee</span>
        </div>
      </footer>
    </div>
  );
}
