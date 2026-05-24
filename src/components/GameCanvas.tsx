import React, { useEffect, useRef, useState } from 'react';
import { ObstacleType, ThemeConfig } from '../types';
import { OBSTACLES_DATA, THEMES } from '../data/obstacles';
import { soundManager } from '../utils/audio';
import {
  useGamePhysics,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  GROUND_Y,
  UNICORN_WIDTH,
  UNICORN_HEIGHT,
} from '../hooks/useGamePhysics';

interface GameCanvasProps {
  gameStarted: boolean;
  gameOver: boolean;
  isPaused: boolean;
  onScoreUpdate: (score: number, level: number) => void;
  onGameOver: (obstacle: ObstacleType) => void;
  onRequestStart: () => void;
}

export default function GameCanvas({
  gameStarted,
  gameOver,
  isPaused,
  onScoreUpdate,
  onGameOver,
  onRequestStart,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Local React state only for HUD display — theme and level live in physics refs
  const [displayLevel, setDisplayLevel] = useState(1);
  const [displayTheme, setDisplayTheme] = useState<ThemeConfig>(THEMES[0]);

  const physics = useGamePhysics({
    onScoreUpdate: (score, level, theme) => {
      setDisplayLevel(level);
      setDisplayTheme(theme);
      onScoreUpdate(score, level);
    },
    onGameOver,
  });

  // Control flags in a ref so the RAF closure never reads stale props
  const controlRef = useRef({ gameStarted, gameOver, isPaused });
  useEffect(() => {
    controlRef.current = { gameStarted, gameOver, isPaused };
  }, [gameStarted, gameOver, isPaused]);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      ) return;

      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code) || e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (controlRef.current.gameOver || !controlRef.current.gameStarted || controlRef.current.isPaused) return;
        physics.handleJump();
      }

      if (['ArrowDown', 'KeyS'].includes(e.code) || e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        if (controlRef.current.gameOver || !controlRef.current.gameStarted || controlRef.current.isPaused) return;
        physics.handleDuckStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      ) return;

      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code) || e.key === ' ' || e.key === 'ArrowUp') {
        physics.handleJumpEnd();
      }
      if (['ArrowDown', 'KeyS'].includes(e.code) || e.key === 'ArrowDown' || e.key === 's') {
        physics.handleDuckEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main RAF loop — physics tick then draw
  useEffect(() => {
    physics.initParallaxLayers();
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const { gameStarted: started, gameOver: ended, isPaused: paused } = controlRef.current;
      const isActive = started && !ended && !paused;
      const currentTheme = physics.themeRef.current;

      ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
      skyGrad.addColorStop(0, currentTheme.skyGradient[0]);
      skyGrad.addColorStop(1, currentTheme.skyGradient[1]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Physics tick — mutates all refs before drawing
      physics.tick(isActive);

      // --- BACKGROUND GRID LINES ---
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 50; i < LOGICAL_HEIGHT; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(LOGICAL_WIDTH, i);
        ctx.stroke();
      }

      // --- PARALLAX LAYERS ---
      physics.bgLayersRef.current.forEach((layer) => {
        ctx.fillStyle = layer.color;

        if (layer.type === 'cloud') {
          ctx.beginPath();
          ctx.arc(layer.x, layer.y, layer.width * 0.3, Math.PI * 0.5, Math.PI * 1.5);
          ctx.arc(layer.x + layer.width * 0.25, layer.y - layer.height * 0.25, layer.width * 0.35, Math.PI, Math.PI * 2);
          ctx.arc(layer.x + layer.width * 0.55, layer.y - layer.height * 0.1, layer.width * 0.3, Math.PI * 1.2, Math.PI * 2.2);
          ctx.arc(layer.x + layer.width * 0.75, layer.y, layer.width * 0.3, Math.PI * 1.5, Math.PI * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (layer.type === 'silhouette') {
          ctx.beginPath();
          if (currentTheme.id === 'forest') {
            ctx.moveTo(layer.x, GROUND_Y);
            ctx.quadraticCurveTo(layer.x + layer.width / 2, GROUND_Y - layer.height, layer.x + layer.width, GROUND_Y);
          } else if (currentTheme.id === 'desert') {
            ctx.rect(layer.x, GROUND_Y - layer.height * 0.6, layer.width * 0.5, layer.height * 0.6);
          } else {
            ctx.moveTo(layer.x, GROUND_Y);
            ctx.lineTo(layer.x + layer.width * 0.2, GROUND_Y - layer.height);
            ctx.lineTo(layer.x + layer.width * 0.5, GROUND_Y - layer.height * 0.3);
            ctx.lineTo(layer.x + layer.width * 0.8, GROUND_Y - layer.height * 0.9);
            ctx.lineTo(layer.x + layer.width, GROUND_Y);
          }
          ctx.closePath();
          ctx.fill();
        } else if (layer.type === 'flora') {
          if (currentTheme.id === 'forest') {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
            ctx.beginPath();
            ctx.arc(layer.x, GROUND_Y - layer.height, layer.width * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(layer.x - 3, GROUND_Y - layer.height, 6, layer.height);
          } else if (currentTheme.id === 'desert') {
            ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
            ctx.fillRect(layer.x, GROUND_Y - layer.height, 8, layer.height);
            ctx.fillRect(layer.x - 8, GROUND_Y - layer.height * 0.66, 12, 4);
            ctx.fillRect(layer.x - 8, GROUND_Y - layer.height * 0.8, 4, layer.height * 0.15);
            ctx.fillRect(layer.x, GROUND_Y - layer.height * 0.5, 12, 4);
            ctx.fillRect(layer.x + 8, GROUND_Y - layer.height * 0.65, 4, layer.height * 0.15);
          } else {
            ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
            ctx.beginPath();
            ctx.moveTo(layer.x, GROUND_Y);
            ctx.lineTo(layer.x + 10, GROUND_Y - layer.height);
            ctx.lineTo(layer.x - 10, GROUND_Y - layer.height);
            ctx.closePath();
            ctx.fill();
          }
        }
      });

      // --- GROUND ---
      ctx.fillStyle = currentTheme.groundColor;
      ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, LOGICAL_HEIGHT - GROUND_Y);
      ctx.fillStyle = currentTheme.foregroundColor;
      ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, 4);

      // Animated ground detail
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let i = 0; i < LOGICAL_WIDTH; i += 30) {
        const offset = Math.sin(i + (isActive ? Date.now() / 150 : 0)) * 2;
        ctx.fillRect(i, GROUND_Y + 12 + offset, 4, 4);
      }

      // --- SPARKLE PARTICLES ---
      physics.particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        const rot = (Math.PI / 2) * 3;
        const step = Math.PI / 4;
        ctx.moveTo(p.x, p.y - p.size);
        for (let i = 0; i < 5; i++) {
          const ox = p.x + Math.cos(rot + i * step * 2) * p.size;
          const oy = p.y + Math.sin(rot + i * step * 2) * p.size;
          ctx.lineTo(ox, oy);
          const ix = p.x + Math.cos(rot + (i * 2 + 1) * step) * (p.size * 0.4);
          const iy = p.y + Math.sin(rot + (i * 2 + 1) * step) * (p.size * 0.4);
          ctx.lineTo(ix, iy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // --- OBSTACLES ---
      physics.obstaclesRef.current.forEach((obs) => {
        const obsData = OBSTACLES_DATA[obs.type];
        if (!obsData) return;

        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor =
          obs.type === 'HIPPO' ? '#10b981' :
          obs.type === 'ZEBRA' ? '#f59e0b' :
          obs.type === 'WOLF'  ? '#ef4444' :
          obs.type === 'RHINO' ? '#ec4899' : '#3b82f6';

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = ctx.shadowColor;
        ctx.lineWidth = 1.5;

        const radius = Math.min(obs.width, obs.height) / 2 + 3;
        const centerX = obs.x + obs.width / 2;
        const centerY = obs.y + obs.height / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = `${Math.floor(obs.width * 0.72)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(obsData.emoji, centerX, centerY + 1);

        // Accessory icons
        if (obs.type === 'WOLF') {
          ctx.font = '11px Arial';
          ctx.fillText('🚒', centerX, centerY - obs.height / 2.3);
        } else if (obs.type === 'HIPPO') {
          ctx.font = '11px Arial';
          ctx.fillText('👑', centerX, centerY - obs.height / 2.3);
        } else if (obs.type === 'SEAGULL') {
          ctx.font = '10px Arial';
          ctx.fillText('💼', centerX - 2, centerY + obs.height / 2);
        } else if (obs.type === 'RHINO') {
          ctx.font = '10px Arial';
          ctx.fillText('✨', centerX + obs.width / 2, centerY - obs.height / 3);
        } else if (obs.type === 'ZEBRA') {
          ctx.font = '9px Arial';
          ctx.fillText('📊', centerX - obs.width / 2, centerY - obs.height / 3);
        }

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(obsData.name, centerX, obs.y - 7);
        ctx.restore();
      });

      // --- UNICORN ---
      const unicorn = physics.unicornRef.current;
      ctx.save();

      let scaleX = 1;
      let scaleY = 1;
      let translateYOffset = 0;

      if (unicorn.isDucking) {
        scaleY = 0.55;
        scaleX = 1.35;
        translateYOffset = 9.5;
      } else if (!unicorn.isGrounded) {
        if (unicorn.vy < 0) {
          scaleY = 1.1;
          scaleX = 0.95;
        } else {
          scaleY = 0.95;
          scaleX = 1.05;
        }
      }

      ctx.translate(unicorn.x + UNICORN_WIDTH / 2, unicorn.y + UNICORN_HEIGHT / 2 + translateYOffset);
      ctx.rotate(unicorn.rotation);
      ctx.scale(scaleX, scaleY);

      ctx.shadowBlur = 12;
      ctx.shadowColor = currentTheme.accentColor;

      // Body
      ctx.fillStyle = '#fdf2f8';
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(12, -4);
      ctx.lineTo(15, -18);
      ctx.quadraticCurveTo(24, -22, 24, -14);
      ctx.lineTo(12, -8);
      ctx.lineTo(8, -2);
      ctx.quadraticCurveTo(-10, -8, -16, -2);
      ctx.lineTo(-12, 10);
      ctx.lineTo(8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Eye
      ctx.fillStyle = '#6b21a8';
      ctx.beginPath();
      ctx.arc(17, -15, 2, 0, Math.PI * 2);
      ctx.fill();

      // Horn
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#fbbf24';
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(18, -19);
      ctx.lineTo(32, -26);
      ctx.lineTo(21, -15);
      ctx.closePath();
      ctx.fill();

      // Mane and tail
      ctx.shadowBlur = 4;
      const maneColors = ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#10b981', '#eab308'];
      const timeCycle = isActive ? Date.now() / 100 : 0;

      ctx.lineWidth = 2.5;
      maneColors.forEach((col, i) => {
        ctx.strokeStyle = col;
        ctx.beginPath();
        const tailOffset = Math.sin(timeCycle + i) * 3;
        ctx.moveTo(-16, -3);
        ctx.quadraticCurveTo(-26, -5 + i * 2 + tailOffset, -30, -2 + i * 1.5 + tailOffset);
        ctx.stroke();
      });

      maneColors.slice(0, 4).forEach((col, i) => {
        ctx.strokeStyle = col;
        ctx.beginPath();
        const maneOffset = Math.cos(timeCycle + i) * 2;
        ctx.moveTo(10, -12);
        ctx.quadraticCurveTo(4 - i * 3, -16 + maneOffset, -2, -10 + maneOffset);
        ctx.stroke();
      });

      // Legs
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';

      let frontLegAngle = 0;
      let backLegAngle = 0;
      if (unicorn.isDucking) {
        frontLegAngle = 0.35;
        backLegAngle = -0.35;
      } else if (unicorn.isGrounded) {
        frontLegAngle = Math.sin(unicorn.runFrame) * 1.1;
        backLegAngle = Math.cos(unicorn.runFrame) * 1.1;
      } else {
        frontLegAngle = 0.6;
        backLegAngle = -0.6;
      }

      ctx.beginPath();
      ctx.moveTo(-12, 10);
      ctx.lineTo(-12 + backLegAngle * 10, 21);
      ctx.moveTo(5, 10);
      ctx.lineTo(5 + frontLegAngle * 10, 21);
      ctx.stroke();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-12 + backLegAngle * 10, 19);
      ctx.lineTo(-12 + backLegAngle * 10, 21);
      ctx.moveTo(5 + frontLegAngle * 10, 19);
      ctx.lineTo(5 + frontLegAngle * 10, 21);
      ctx.stroke();

      ctx.restore();

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Reset physics when a new game starts
  useEffect(() => {
    if (gameStarted && !gameOver) {
      physics.resetGame();
      setDisplayLevel(1);
      setDisplayTheme(THEMES[0]);
    }
  }, [gameStarted, gameOver]);

  const handleCanvasAction = () => {
    if (controlRef.current.gameOver || !controlRef.current.gameStarted || controlRef.current.isPaused) return;
    physics.handleJump();
  };

  const handleDodgeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (controlRef.current.gameOver || !controlRef.current.gameStarted || controlRef.current.isPaused) return;
    physics.handleDuckStart();
  };

  const handleDodgeEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    physics.handleDuckEnd();
  };

  const handleJumpStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (controlRef.current.gameOver || !controlRef.current.gameStarted || controlRef.current.isPaused) return;
    physics.handleJump();
  };

  const handleJumpEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    physics.handleJumpEnd();
  };

  return (
    <>
    <div
      className="relative w-full rounded-2xl overflow-hidden cursor-pointer"
      onClick={handleCanvasAction}
      id="game-canvas-outer"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        width={LOGICAL_WIDTH}
        height={LOGICAL_HEIGHT}
        id="runner-canvas"
        className="w-full h-auto bg-slate-950 block border border-slate-800/80 rounded-2xl shadow-2xl transition-all duration-300"
      />

      {/* Start screen overlay */}
      {!gameStarted && !gameOver && (
        <div
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-3 md:p-6 animate-fade-in"
          id="ready-screen-overlay"
        >
          <div className="text-3xl md:text-5xl lg:text-6xl animate-float mb-1 md:mb-3 hidden sm:block" id="intro-emoji">🦄</div>
          <h2 className="text-base md:text-2xl lg:text-3xl font-black text-white font-display tracking-tight mb-1 md:mb-2 uppercase glow-text italic" id="intro-title">
            Can You Lead the Unicorn to Launch?
          </h2>
          <p className="text-slate-300 text-[10px] md:text-xs lg:text-sm max-w-md mb-3 md:mb-5 leading-relaxed hidden sm:block" id="intro-tagline">
            Dodge the 5 most dangerous animal personalities of Product Management. Jump over blockers, plus crouch/dodge under high flying Seagulls!
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundManager.playClick();
              onRequestStart();
            }}
            id="start-button-overlay"
            className="px-5 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition-all text-xs md:text-sm tracking-widest uppercase cursor-pointer"
          >
            LAUNCH PRODUCT
          </button>
          <div className="mt-3 hidden md:flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10px] md:text-xs text-slate-500 font-mono" id="intro-keys">
            <span className="flex items-center gap-1.5"><span className="text-purple-400 bg-purple-500/10 px-1 py-0.2 rounded border border-purple-500/20">SPACE / CLICK</span> Jump</span>
            <span className="flex items-center gap-1.5"><span className="text-purple-400 bg-purple-500/10 px-1 py-0.2 rounded border border-purple-500/20">S / ARROW DOWN</span> Dodge / Fast Fall</span>
          </div>
        </div>
      )}

      {/* In-game level HUD */}
      {gameStarted && !gameOver && (
        <div
          className="absolute top-4 left-4 flex flex-col text-left select-none pointer-events-none"
          id="game-hud-level"
        >
          <span className="text-[10px] font-mono tracking-widest text-[#ec4899] uppercase font-bold">
            {displayTheme.levelName}
          </span>
          <span className="text-lg font-bold text-white font-display leading-tight flex items-center gap-1.5 shadow-sm text-shadow">
            Level {displayLevel} <span className="text-xs text-slate-400">({displayTheme.name})</span>
          </span>
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && !gameOver && (
        <div
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center pointer-events-none select-none"
          id="paused-screen-overlay"
        >
          <div className="px-5 py-2.5 bg-slate-900/90 border border-slate-700/60 rounded-xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
            <span className="text-sm font-semibold tracking-wide text-amber-400 font-mono">GAME PAUSED - PRESS ESC/PAUSE</span>
          </div>
        </div>
      )}
    </div>

    {/* Mobile touch controls — rendered below canvas so they never overlap the game */}
    {gameStarted && !gameOver && (
      <div
        className="flex justify-between mt-3 px-1 select-none sm:hidden"
        id="mobile-touch-play-triggers"
      >
        <button
          onMouseDown={handleDodgeStart}
          onMouseUp={handleDodgeEnd}
          onMouseLeave={handleDodgeEnd}
          onTouchStart={handleDodgeStart}
          onTouchEnd={handleDodgeEnd}
          id="touch-dodge-trigger"
          className="w-24 h-14 bg-slate-900/80 active:bg-purple-600/30 text-white border border-purple-500/20 rounded-2xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-lg outline-none"
        >
          <span className="text-xl">⬇️</span>
          <span className="text-[9px] font-mono tracking-wider font-bold text-purple-300">DODGE</span>
        </button>
        <button
          onMouseDown={handleJumpStart}
          onMouseUp={handleJumpEnd}
          onMouseLeave={handleJumpEnd}
          onTouchStart={handleJumpStart}
          onTouchEnd={handleJumpEnd}
          id="touch-jump-trigger"
          className="w-24 h-14 bg-slate-900/80 active:bg-purple-600/30 text-white border border-purple-500/20 rounded-2xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-lg outline-none"
        >
          <span className="text-xl">⬆️</span>
          <span className="text-[9px] font-mono tracking-wider font-bold text-purple-300">JUMP</span>
        </button>
      </div>
    )}
    </>
  );
}
