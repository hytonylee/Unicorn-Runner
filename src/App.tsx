import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, HelpCircle, Volume2, VolumeX, RefreshCw, Zap, ShieldAlert, Award } from 'lucide-react';
import { ObstacleType, HighScore, ThemeConfig } from './types';
import { OBSTACLES_DATA, THEMES, getThemeForLevel } from './data/obstacles';
import { soundManager } from './utils/audio';

// Firebase core SDK integration
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Dynamic lazy imports
import GameCanvas from './components/GameCanvas';
import InfoModal from './components/InfoModal';
import Leaderboard from './components/Leaderboard';
import OfflineIndicator from './components/OfflineIndicator';

export const DEFAULT_SCORES: HighScore[] = [
  {
    id: 'df-1',
    name: 'Chief VP of Stasis',
    score: 1650,
    date: new Date(Date.now() - 360000000).toISOString(),
    level: 3,
    killedByAcronym: 'HIPPO',
    killedByName: "Highest Paid Person's Opinion"
  },
  {
    id: 'df-2',
    name: 'Framework Evangelist',
    score: 950,
    date: new Date(Date.now() - 180000000).toISOString(),
    level: 2,
    killedByAcronym: 'ZEBRA',
    killedByName: 'Zero Evidence But Really Arrogant'
  },
  {
    id: 'df-3',
    name: 'Junior PM Associate',
    score: 420,
    date: new Date(Date.now() - 86400000).toISOString(),
    level: 1,
    killedByAcronym: 'WOLF',
    killedByName: "Works on Latest Fire"
  }
];

export default function App() {
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [killedBy, setKilledBy] = useState<ObstacleType>('HIPPO');
  const [theme, setTheme] = useState<ThemeConfig>(THEMES[0]);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Connection and system simulator state
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);

  // Authenticated Google User State
  const [user, setUser] = useState<User | null>(null);

  // Leadership board list
  const [highScoresList, setHighScoresList] = useState<HighScore[]>([]);

  // Monitor Google Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      soundManager.playClick();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      soundManager.playClick();
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Local Storage personal high score tracking initialization
  useEffect(() => {
    const savedBest = localStorage.getItem('pm_unicorn_absolute_best');
    if (savedBest) {
      setHighScore(parseInt(savedBest, 10));
    }
    setIsMuted(soundManager.getIsMuted());
  }, []);

  // Multi-mode live high scores loader (synced to cloud when online!)
  useEffect(() => {
    if (isSimulatedOffline) {
      // Local storage fallback
      const savedScoresList = localStorage.getItem('pm_unicorn_high_scores_list');
      if (savedScoresList) {
        setHighScoresList(JSON.parse(savedScoresList));
      } else {
        setHighScoresList(DEFAULT_SCORES);
        localStorage.setItem('pm_unicorn_high_scores_list', JSON.stringify(DEFAULT_SCORES));
      }
      return;
    }

    // Connect real-time subscribe callback to scores collection
    const scoresQuery = query(
      collection(db, 'scores'),
      orderBy('score', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(scoresQuery, (snapshot) => {
      const dbScores: HighScore[] = [];
      snapshot.forEach((snapshotDoc) => {
        const data = snapshotDoc.data();
        dbScores.push({
          id: snapshotDoc.id,
          name: data.name || 'Anonymous PM',
          score: Number(data.score) || 0,
          date: data.date ? (data.date.toDate ? data.date.toDate().toISOString() : new Date(data.date).toISOString()) : new Date().toISOString(),
          level: Number(data.level) || 1,
          killedByAcronym: data.killedByAcronym || '',
          killedByName: data.killedByName || '',
        });
      });

      if (dbScores.length === 0) {
        // If the database has no scores yet, fallback to local backup/defaults
        const savedScoresList = localStorage.getItem('pm_unicorn_high_scores_list');
        if (savedScoresList) {
          setHighScoresList(JSON.parse(savedScoresList));
        } else {
          setHighScoresList(DEFAULT_SCORES);
        }
      } else {
        setHighScoresList(dbScores);
      }
    }, (error) => {
      console.error("Firestore listening subscription error (falling back to offline mock state):", error);
      const savedScoresList = localStorage.getItem('pm_unicorn_high_scores_list');
      if (savedScoresList) {
        setHighScoresList(JSON.parse(savedScoresList));
      } else {
        setHighScoresList(DEFAULT_SCORES);
      }
    });

    return () => unsubscribe();
  }, [isSimulatedOffline]);

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mutedStatus = soundManager.toggleMute();
    setIsMuted(mutedStatus);
    soundManager.playClick();
  };

  // Launch fresh game
  const startGame = () => {
    soundManager.playClick();
    setScore(0);
    setLevel(1);
    setTheme(THEMES[0]);
    setGameOver(false);
    setGameStarted(true);
    setIsPaused(false);
  };

  // Trigger collision and halt
  const triggerGameOver = (ended: boolean, obstacle: ObstacleType) => {
    if (ended) {
      setGameOver(true);
      setKilledBy(obstacle);
      
      // Check absolute personal best update
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('pm_unicorn_absolute_best', score.toString());
      }
    } else {
      // Dummy toggle used to initiate fresh game restarts
      startGame();
    }
  };

  // Dismiss modal to check landing page
  const handleCloseModal = () => {
    soundManager.playClick();
    setGameOver(false);
    setGameStarted(false);
  };

  // Safe Highscore submission handler
  const handleModalRestart = async (playerName: string) => {
    const finalName = playerName.trim() || 'Anonymous PM';

    // 1. Append new score entry (Local Backup)
    const newEntry: HighScore = {
      id: `local-${Math.random().toString().replace('0.', '')}`,
      name: finalName,
      score: score,
      date: new Date().toISOString(),
      level: level,
      killedByAcronym: OBSTACLES_DATA[killedBy]?.acronym || 'Unknown',
      killedByName: OBSTACLES_DATA[killedBy]?.fullName || 'Unknown'
    };

    const savedScoresList = localStorage.getItem('pm_unicorn_high_scores_list');
    let localList: HighScore[] = savedScoresList ? JSON.parse(savedScoresList) : [];
    localList = [...localList, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    localStorage.setItem('pm_unicorn_high_scores_list', JSON.stringify(localList));

    if (isSimulatedOffline) {
      setHighScoresList(localList);
    }

    // 2. Submit to Firebase online DB if online
    if (!isSimulatedOffline) {
      const isGoogleUser = !!user;
      const finalUserId = isGoogleUser ? user.uid : 'anonymous';
      const scoreDocId = isGoogleUser
        ? `score-${user.uid}-${Date.now()}`
        : `score-anon-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      try {
        await setDoc(doc(db, 'scores', scoreDocId), {
          name: finalName.slice(0, 30), // Max 30 chars as validated in rules
          score: Math.floor(score),
          date: serverTimestamp(), // Temporal integrity check
          level: Math.floor(level),
          killedByAcronym: OBSTACLES_DATA[killedBy]?.acronym || 'Unknown',
          killedByName: OBSTACLES_DATA[killedBy]?.fullName || 'Unknown',
          userId: finalUserId
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `scores/${scoreDocId}`);
      }
    }

    // 3. Clear state variables and restart the session
    startGame();
  };

  const handleClearScores = () => {
    if (isSimulatedOffline) {
      setHighScoresList([]);
      localStorage.removeItem('pm_unicorn_high_scores_list');
      setHighScore(0);
      localStorage.removeItem('pm_unicorn_absolute_best');
    } else {
      alert("Cloud database entries are fully immutable. Register a new high score to conquer the Hall of Fame!");
    }
  };


  // Check if score qualifies as a new high score
  // It qualifies if it's > 0, and either scores list has fewer than 8 entries, or it belongs in the top scores.
  const isScoreHighScore = score > 0;

  return (
    <div className="min-h-screen pb-16 flex flex-col justify-between" id="applet-viewport">
      
      {/* Top Banner indicating Mock Offline Mode active */}
      {(isSimulatedOffline) && (
        <div 
          className="w-full bg-rose-500/20 border-b border-rose-500/30 px-4 py-2 text-center text-xs text-rose-300 font-mono flex items-center justify-center gap-2 animate-pulse"
          id="mock-offline-top-banner"
        >
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          Offline-First simulation active. All scores saved securely inside persistent client-side localStorage.
        </div>
      )}

      {/* Main Core Section */}
      <div className="max-w-4xl w-full mx-auto px-4 md:px-6 pt-8 flex-grow flex flex-col justify-start">
        
        {/* Navigation Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8" id="applet-header">
          {/* Title branding block */}
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

          {/* Right score counters and sound buttons */}
          <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-md p-3 px-5 rounded-2xl border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]" id="hud-controls-panel">
            {/* Scoreboard metrics */}
            <div className="flex items-center gap-5 text-left select-none pr-4 border-r border-slate-800">
              <div>
                <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase tracking-widest">HI-SCORE</span>
                <span className="text-base font-bold font-mono text-yellow-400 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  {Math.max(highScore, score)}
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

            {/* Chiptunes Mute Button */}
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

        {/* The Game Stage Container */}
        <div className="mb-8 relative" id="game-stage-wrapper">
          <GameCanvas
            score={score}
            setScore={setScore}
            level={level}
            setLevel={setLevel}
            gameStarted={gameStarted}
            gameOver={gameOver}
            isPaused={isPaused}
            setGameOver={triggerGameOver}
            theme={theme}
            setTheme={setTheme}
          />
        </div>

        {/* Informative Hub Panels - Bento grid styled with glass-panel layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-stretch items-start mt-2 mb-12" id="bento-hub-grid">
          
          {/* Educational panel describing what the obstacles mean in terms of product management */}
          <div 
            className="glass-panel rounded-3xl p-5 md:p-6 shadow-2xl text-left h-full flex flex-col"
            id="educational-dictionary-panel"
          >
            <div className="flex items-center gap-2 mb-4 border-b border-purple-500/20 pb-2.5">
              <HelpCircle className="w-5 h-5 text-purple-450" />
              <h3 className="text-base font-bold font-display text-white tracking-tight glow-text uppercase italic">
                PM Blockers Encyclopedia
              </h3>
            </div>

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
                      <span className="text-[10px] font-mono font-medium text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded uppercase">
                        {animal.acronym}
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-300 font-sans mt-1.5 leading-normal">
                      {animal.pmConcept}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column with Hall of Fame and Local Offline status */}
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

      {/* Sarcastic explanation game over information modal overlay */}
      <InfoModal
        isOpen={gameOver}
        obstacleType={killedBy}
        score={score}
        level={level}
        onRestart={handleModalRestart}
        highScores={highScoresList}
        isNewHighScore={isScoreHighScore}
        onClose={handleCloseModal}
        user={user}
      />

      {/* Futuristic, Immersive styled system status footer */}
      <footer 
        className="h-12 bg-black/40 border-t border-white/5 flex items-center px-6 sm:px-8 justify-between z-20 text-[10px] text-slate-400 uppercase tracking-[0.3em] font-mono select-none" 
        id="global-page-footer"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
          <span>Build: Alpha-7.2 (Offline Mode Active)</span>
        </div>
        <div className="hidden md:block">
          <span>Server Status: Blocked by Zebra Policy</span>
        </div>
        <div>
          <span>© 2026 hytonylee</span>
        </div>
      </footer>
    </div>
  );
}
