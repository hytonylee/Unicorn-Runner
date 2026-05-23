import React, { useEffect, useRef, useState } from 'react';
import { ObstacleType, ObstacleInstance, ThemeConfig } from '../types';
import { getThemeForLevel, OBSTACLES_DATA } from '../data/obstacles';
import { soundManager } from '../utils/audio';

interface GameCanvasProps {
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  level: number;
  setLevel: (level: number) => void;
  gameStarted: boolean;
  gameOver: boolean;
  isPaused: boolean;
  setGameOver: (ov: boolean, killedBy: ObstacleType) => void;
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
}

// Logical coordinates for stable physics
const LOGICAL_WIDTH = 800;
const LOGICAL_HEIGHT = 280;
const GROUND_Y = 220;
const UNICORN_WIDTH = 55;
const UNICORN_HEIGHT = 50;

interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface BackgroundAsset {
  x: number;
  width: number;
  height: number;
  type: string;
  color: string;
  speedMultiplier: number;
}

export default function GameCanvas({
  score,
  setScore,
  level,
  setLevel,
  gameStarted,
  gameOver,
  isPaused,
  setGameOver,
  theme,
  setTheme,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    score,
    level,
    gameStarted,
    gameOver,
    isPaused,
    theme,
  });

  // Track state in refs for high frequency animation frame loop
  useEffect(() => {
    stateRef.current = { score, level, gameStarted, gameOver, isPaused, theme };
  }, [score, level, gameStarted, gameOver, isPaused, theme]);

  // Unicorn physics state
  const unicornRef = useRef({
    x: 80,
    y: GROUND_Y - UNICORN_HEIGHT,
    vy: 0,
    isGrounded: true,
    runFrame: 0,
    rotation: 0,
    isDucking: false,
  });

  // Obstacles, backgrounds, and particles
  const obstaclesRef = useRef<ObstacleInstance[]>([]);
  const particlesRef = useRef<SparkleParticle[]>([]);
  const bgLayersRef = useRef<BackgroundAsset[]>([]);

  // Obstacle spawn management
  const spawnTimerRef = useRef<number>(0);
  const nextSpawnTimeRef = useRef<number>(100);
  const milestoneReachedRef = useRef<number>(0);

  // Keyboard state
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Parallax layers initialization
  const initParallaxLayers = () => {
    const layers: BackgroundAsset[] = [];
    
    // Cloud layers (Far background)
    for (let i = 0; i < 5; i++) {
      layers.push({
        x: Math.random() * LOGICAL_WIDTH,
        width: 60 + Math.random() * 80,
        height: 20 + Math.random() * 20,
        type: 'cloud',
        color: 'rgba(255, 255, 255, 0.07)',
        speedMultiplier: 0.1,
      });
    }

    // Office Diagram elements or mountains (Mid background)
    for (let i = 0; i < 4; i++) {
      layers.push({
        x: (i * (LOGICAL_WIDTH / 3)) + Math.random() * 50,
        width: 100 + Math.random() * 120,
        height: 70 + Math.random() * 60,
        type: 'silhouette',
        color: 'rgba(255, 255, 255, 0.05)',
        speedMultiplier: 0.3,
      });
    }

    // Fantasy flora / structures (Near background)
    for (let i = 0; i < 6; i++) {
      layers.push({
        x: (i * (LOGICAL_WIDTH / 5)) + Math.random() * 40,
        width: 25 + Math.random() * 20,
        height: 40 + Math.random() * 40,
        type: 'flora',
        color: 'rgba(255, 255, 255, 0.12)',
        speedMultiplier: 0.7,
      });
    }

    bgLayersRef.current = layers;
  };

  // Reset all game state for fresh start
  const resetGame = () => {
    unicornRef.current = {
      x: 80,
      y: GROUND_Y - UNICORN_HEIGHT,
      vy: 0,
      isGrounded: true,
      runFrame: 0,
      rotation: 0,
      isDucking: false,
    };
    obstaclesRef.current = [];
    particlesRef.current = [];
    spawnTimerRef.current = 0;
    nextSpawnTimeRef.current = 80;
    setScore(0);
    setLevel(1);
    const firstTheme = getThemeForLevel(0);
    setTheme(firstTheme);
    milestoneReachedRef.current = 0;
    initParallaxLayers();
  };

  // Handle keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const targetKeys = ['Space', 'KeyW', 'ArrowUp'];
      if (targetKeys.includes(e.code) || e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        
        // Trigger jump or restart
        if (stateRef.current.gameOver) {
          // Restart handled in parent via click, but let's allow keyboard too
          return;
        }

        if (!stateRef.current.gameStarted) {
          return;
        }

        if (unicornRef.current.isGrounded && !stateRef.current.isPaused) {
          unicornRef.current.vy = -12; // Initial jump velocity
          unicornRef.current.isGrounded = false;
          soundManager.playJump();
          
          // Emit burst of jump sparkles
          for (let i = 0; i < 15; i++) {
            particlesRef.current.push({
              x: unicornRef.current.x + 10,
              y: unicornRef.current.y + UNICORN_HEIGHT - 5,
              vx: -2 - Math.random() * 4,
              vy: 1 - Math.random() * 3,
              color: `hsl(${Math.random() * 360}, 90%, 75%)`,
              size: 2 + Math.random() * 3,
              life: 0,
              maxLife: 20 + Math.random() * 15,
            });
          }
        }
      }

      const duckKeys = ['ArrowDown', 'KeyS'];
      if (duckKeys.includes(e.code) || e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        
        if (stateRef.current.gameOver || !stateRef.current.gameStarted || stateRef.current.isPaused) {
          return;
        }

        unicornRef.current.isDucking = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const targetKeys = ['Space', 'KeyW', 'ArrowUp'];
      if (targetKeys.includes(e.code) || e.key === ' ' || e.key === 'ArrowUp') {
        // Variable jump height: release early cuts upwards velocity
        if (unicornRef.current.vy < -4) {
          unicornRef.current.vy = -4;
        }
      }

      const duckKeys = ['ArrowDown', 'KeyS'];
      if (duckKeys.includes(e.code) || e.key === 'ArrowDown' || e.key === 's') {
        unicornRef.current.isDucking = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Set up mouse/touch jump click support on canvas container
  const handleCanvasAction = () => {
    if (stateRef.current.gameOver || !stateRef.current.gameStarted || stateRef.current.isPaused) return;

    if (unicornRef.current.isGrounded) {
      unicornRef.current.vy = -12;
      unicornRef.current.isGrounded = false;
      soundManager.playJump();

      for (let i = 0; i < 15; i++) {
        particlesRef.current.push({
          x: unicornRef.current.x + 10,
          y: unicornRef.current.y + UNICORN_HEIGHT - 5,
          vx: -2 - Math.random() * 4,
          vy: 1 - Math.random() * 3,
          color: `hsl(${Math.random() * 360}, 90%, 75%)`,
          size: 2 + Math.random() * 3,
          life: 0,
          maxLife: 20 + Math.random() * 15,
        });
      }
    }
  };

  // Main game physics and drawing loop
  useEffect(() => {
    initParallaxLayers();
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const { score: currentScore, level: currentLevel, gameStarted: started, gameOver: ended, isPaused: paused, theme: currentTheme } = stateRef.current;

      // Base rendering context settings
      ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Draw Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
      skyGrad.addColorStop(0, currentTheme.skyGradient[0]);
      skyGrad.addColorStop(1, currentTheme.skyGradient[1]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Calculate speed: start slow (e.g. 3.6 for Level 1) and gradually scale up at each level
      let baseSpeed = 3.6;
      if (currentLevel === 1) {
        // Level 1 (Score 0-499): Slower startup, increases smoothly from 3.6 to 5.2
        baseSpeed = 3.6 + (currentScore / 500) * 1.6;
      } else if (currentLevel === 2) {
        // Level 2 (Score 500-1199): Medium range, increases from 5.2 to 8.0
        baseSpeed = 5.2 + ((currentScore - 500) / 700) * 2.8;
      } else {
        // Level 3+ (Score 1200+): High range, increases from 8.0 asymptotically up to 12.5
        baseSpeed = 8.0 + Math.min((currentScore - 1200) / 1000, 1.0) * 4.5;
      }

      // --- 1. STATE MATH (Physics & Spawn logic) ---
      if (started && !ended && !paused) {
        // Increment Score slowly
        setScore((prev) => {
          const nextScore = prev + 1;
          
          // Audio cue every 200 points
          if (nextScore > 0 && nextScore % 200 === 0 && milestoneReachedRef.current !== nextScore) {
            milestoneReachedRef.current = nextScore;
            soundManager.playScoreMilestone();
          }

          // Level tracking
          const nextLevel = nextScore >= 1200 ? 3 : nextScore >= 500 ? 2 : 1;
          if (nextLevel !== currentLevel) {
            setLevel(nextLevel);
            soundManager.playLevelUp();
            // Trigger beautiful level up sparkles!
            for (let i = 0; i < 40; i++) {
              particlesRef.current.push({
                x: LOGICAL_WIDTH / 2 + (Math.random() - 0.5) * 400,
                y: LOGICAL_HEIGHT / 2 + (Math.random() - 0.5) * 150,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6 - 2,
                color: `hsl(${Math.random() * 360}, 95%, 70%)`,
                size: 3 + Math.random() * 5,
                life: 0,
                maxLife: 40 + Math.random() * 30,
              });
            }
          }

          // Adjust theme on score threshold
          const targetTheme = getThemeForLevel(nextScore);
          if (targetTheme.id !== currentTheme.id) {
            setTheme(targetTheme);
          }

          return nextScore;
        });

        // Update background assets (Parallax scroll)
        bgLayersRef.current.forEach((layer) => {
          layer.x -= baseSpeed * layer.speedMultiplier;
          if (layer.x + layer.width < 0) {
            layer.x = LOGICAL_WIDTH + Math.random() * 100;
          }
        });

        // Unicorn physics
        const unicorn = unicornRef.current;
        unicorn.vy += unicorn.isDucking ? 1.05 : 0.52; // Higher gravity if ducking to make it fast-fall!
        unicorn.y += unicorn.vy;

        if (unicorn.y >= GROUND_Y - UNICORN_HEIGHT) {
          unicorn.y = GROUND_Y - UNICORN_HEIGHT;
          unicorn.vy = 0;
          unicorn.isGrounded = true;
          unicorn.runFrame += baseSpeed * 0.028; // Animate running legs proportionally to velocity
        } else {
          // Tilt slightly upwards when jumping/falling
          unicorn.rotation = unicorn.vy * 0.03;
        }

        // Unicorn running sparkle generation
        if (Math.random() < 0.35) {
          particlesRef.current.push({
            x: unicorn.x - 5,
            y: unicorn.isDucking 
              ? unicorn.y + UNICORN_HEIGHT * 0.75 + (Math.random() - 0.5) * 5
              : unicorn.y + UNICORN_HEIGHT / 2 + (Math.random() - 0.5) * 15,
            vx: -baseSpeed * 0.4 - Math.random() * 2,
            vy: (Math.random() - 0.5) * 2,
            color: `hsl(${270 + Math.random() * 90}, 95%, ${70 + Math.random() * 20}%)`,
            size: 2 + Math.random() * 3,
            life: 0,
            maxLife: 15 + Math.random() * 10,
          });
        }

        // Obstacles math
        spawnTimerRef.current += 1;
        if (spawnTimerRef.current >= nextSpawnTimeRef.current) {
          spawnTimerRef.current = 0;
          // Set random next spawn time maintaining comfortable jump separation gap in pixels
          const minSeparationFrames = Math.max(28, Math.floor(320 / baseSpeed));
          const maxExtraFrames = Math.max(15, Math.floor(180 / baseSpeed));
          nextSpawnTimeRef.current = minSeparationFrames + Math.floor(Math.random() * maxExtraFrames);

          // Determine obstacle type based on current level / randomly
          const availableTypes: ObstacleType[] = [];
          if (currentLevel === 1) {
            availableTypes.push('HIPPO', 'WOLF');
          } else if (currentLevel === 2) {
            availableTypes.push('ZEBRA', 'WOLF', 'SEAGULL');
          } else {
            availableTypes.push('RHINO', 'SEAGULL', 'HIPPO', 'WOLF', 'ZEBRA');
          }

          const chosenType = availableTypes[Math.floor(Math.random() * availableTypes.length)] || 'HIPPO';
          
          // Setup fly or ground positions
          let obsY = GROUND_Y - 45; // default ground height
          let obsH = 45;
          let obsW = 45;
          let floatOffset = undefined;

          if (chosenType === 'SEAGULL') {
            // Seagulls fly at intermediate height (either requires jump or ducking!)
            // Let's set heights to fluctuate
            obsY = GROUND_Y - 75 - Math.floor(Math.random() * 35);
            obsH = 36;
            obsW = 42;
            floatOffset = Math.random() * 100;
          } else if (chosenType === 'HIPPO') {
            obsH = 46;
            obsW = 48;
            obsY = GROUND_Y - obsH;
          } else if (chosenType === 'RHINO') {
            obsH = 45;
            obsW = 54;
            obsY = GROUND_Y - obsH;
          } else if (chosenType === 'WOLF') {
            obsH = 44;
            obsW = 41;
            obsY = GROUND_Y - obsH;
          } else if (chosenType === 'ZEBRA') {
            obsH = 48;
            obsW = 38;
            obsY = GROUND_Y - obsH;
          }

          obstaclesRef.current.push({
            id: Math.random().toString(),
            type: chosenType,
            x: LOGICAL_WIDTH,
            y: obsY,
            width: obsW,
            height: obsH,
            passed: false,
            speedMultiplier: chosenType === 'SEAGULL' ? 1.15 : 1.0,
            floatOffset,
            wingDirection: 1,
          });
        }

        // Update obstacles
        obstaclesRef.current = obstaclesRef.current.filter((obs) => {
          obs.x -= baseSpeed * obs.speedMultiplier;

          // Wing flap for Seagull Seagull Managers
          if (obs.type === 'SEAGULL') {
            if (!obs.wingDirection) obs.wingDirection = 1;
            if (Math.random() < 0.15) obs.wingDirection = -obs.wingDirection;

            // Hover up and down
            if (obs.floatOffset !== undefined) {
              obs.floatOffset += 0.08;
              obs.y += Math.sin(obs.floatOffset) * 0.6;
            }
          }

          // Scoring trigger on passing obstacle
          if (!obs.passed && obs.x + obs.width < unicornRef.current.x) {
            obs.passed = true;
            setScore((s) => s + 50); // Bonus score for clearing an obstacle safely!
          }

          // COLLISION DETECTION (Bounding box with small tolerance for cute responsive feel)
          const unicorn = unicornRef.current;
          const uLeft = unicorn.x + 8;
          const uRight = unicorn.x + UNICORN_WIDTH - 6;
          const uTop = unicorn.isDucking ? unicorn.y + 26 : unicorn.y + 6;
          const uBottom = unicorn.y + UNICORN_HEIGHT - 3;

          const oLeft = obs.x + 4;
          const oRight = obs.x + obs.width - 4;
          const oTop = obs.y + 4;
          const oBottom = obs.y + obs.height - 4;

          // Collision overlap check
          if (uRight > oLeft && uLeft < oRight && uBottom > oTop && uTop < oBottom) {
            // EXPLOSION SPARKLES
            soundManager.playHit();
            for (let i = 0; i < 35; i++) {
              particlesRef.current.push({
                x: (uRight + oLeft) / 2,
                y: (uBottom + oTop) / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8 - 1,
                color: obs.type === 'HIPPO' ? '#34d399' : obs.type === 'ZEBRA' ? '#fbbf24' : obs.type === 'WOLF' ? '#f87171' : obs.type === 'RHINO' ? '#f472b6' : '#60a5fa',
                size: 2 + Math.random() * 4,
                life: 0,
                maxLife: 25 + Math.random() * 20,
              });
            }
            setGameOver(true, obs.type);
          }

          // Filter out obstacles that left the viewport
          return obs.x + obs.width > -50;
        });

        // Update particles life
        particlesRef.current = particlesRef.current.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life += 1;
          // Apply light air friction
          p.vx *= 0.96;
          p.vy *= 0.96;
          return p.life < p.maxLife;
        });
      }

      // --- 2. DRAWING PARALLAX SCROLLING BACKGROUNDS ---
      // Drawing Sky lines / grid elements representing the internet browser
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 50; i < LOGICAL_HEIGHT; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(LOGICAL_WIDTH, i);
        ctx.stroke();
      }

      // Draw Layers
      bgLayersRef.current.forEach((layer) => {
        ctx.fillStyle = layer.color;

        if (layer.type === 'cloud') {
          // Draw fluffy workspace clouds (representing data backlogs!)
          ctx.beginPath();
          ctx.arc(layer.x, layer.y, layer.width * 0.3, Math.PI * 0.5, Math.PI * 1.5);
          ctx.arc(layer.x + layer.width * 0.25, layer.y - layer.height * 0.25, layer.width * 0.35, Math.PI, Math.PI * 2);
          ctx.arc(layer.x + layer.width * 0.55, layer.y - layer.height * 0.1, layer.width * 0.3, Math.PI * 1.2, Math.PI * 2.2);
          ctx.arc(layer.x + layer.width * 0.75, layer.y, layer.width * 0.3, Math.PI * 1.5, Math.PI * 0.5);
          ctx.closePath();
          ctx.fill();
          
          // Draw little binder lines inside cloud
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (layer.type === 'silhouette') {
          // Mid ground silhouettes:
          // Level 1: Tree hills or soft trees
          // Level 2: Sand dunes or sticky notepad mounds
          // Level 3: Ocean swell shapes or sprint curves
          ctx.beginPath();
          if (currentTheme.id === 'forest') {
            // Forest tree mounds
            ctx.moveTo(layer.x, GROUND_Y);
            ctx.quadraticCurveTo(layer.x + layer.width / 2, GROUND_Y - layer.height, layer.x + layer.width, GROUND_Y);
          } else if (currentTheme.id === 'desert') {
            // Whiteboard sticky shapes stacked together
            ctx.rect(layer.x, GROUND_Y - layer.height * 0.6, layer.width * 0.5, layer.height * 0.6);
          } else {
            // Waves & burndown charts with peaks
            ctx.moveTo(layer.x, GROUND_Y);
            ctx.lineTo(layer.x + layer.width * 0.2, GROUND_Y - layer.height);
            ctx.lineTo(layer.x + layer.width * 0.5, GROUND_Y - layer.height * 0.3);
            ctx.lineTo(layer.x + layer.width * 0.8, GROUND_Y - layer.height * 0.9);
            ctx.lineTo(layer.x + layer.width, GROUND_Y);
          }
          ctx.closePath();
          ctx.fill();
        } else if (layer.type === 'flora') {
          // Near structures
          if (currentTheme.id === 'forest') {
            // Modernist glowing office trees
            ctx.fillStyle = 'rgba(34, 197, 94, 0.25)'; // bright emerald
            ctx.beginPath();
            ctx.arc(layer.x, GROUND_Y - layer.height, layer.width * 0.6, 0, Math.PI * 2);
            ctx.fill();
            // trunk
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(layer.x - 3, GROUND_Y - layer.height, 6, layer.height);
          } else if (currentTheme.id === 'desert') {
            // Cacti made of dry-erase markers standing vertically!
            ctx.fillStyle = 'rgba(245, 158, 11, 0.25)'; // amber yellow
            ctx.fillRect(layer.x, GROUND_Y - layer.height, 8, layer.height);
            // arm 1
            ctx.fillRect(layer.x - 8, GROUND_Y - layer.height * 0.66, 12, 4);
            ctx.fillRect(layer.x - 8, GROUND_Y - layer.height * 0.8, 4, layer.height * 0.15);
            // arm 2
            ctx.fillRect(layer.x, GROUND_Y - layer.height * 0.5, 12, 4);
            ctx.fillRect(layer.x + 8, GROUND_Y - layer.height * 0.65, 4, layer.height * 0.15);
          } else {
            // gantt chart palms
            ctx.fillStyle = 'rgba(6, 182, 212, 0.25)'; // cyan
            ctx.beginPath();
            ctx.moveTo(layer.x, GROUND_Y);
            ctx.lineTo(layer.x + 10, GROUND_Y - layer.height);
            ctx.lineTo(layer.x - 10, GROUND_Y - layer.height);
            ctx.closePath();
            ctx.fill();
          }
        }
      });

      // --- 3. DRAWING THE SOLID REPETITIVE GROUND COVERS ---
      // Split ground bar highlighting layers
      ctx.fillStyle = currentTheme.groundColor;
      ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, LOGICAL_HEIGHT - GROUND_Y);

      // Grass top line
      ctx.fillStyle = currentTheme.foregroundColor;
      ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, 4);

      // Office files / folder crumbs along the bottom edge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let i = 0; i < LOGICAL_WIDTH; i += 30) {
        const offset = (Math.sin(i + (started && !ended && !paused ? Date.now() / 150 : 0)) * 2);
        ctx.fillRect(i, GROUND_Y + 12 + offset, 4, 4);
      }

      // --- 4. DRAWING THE SPARKLE PARTICLES ---
      particlesRef.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;

        // Draw cute sparkles as micro stars
        ctx.beginPath();
        const rot = (Math.PI / 2) * 3;
        let x = p.x;
        let y = p.y;
        const step = Math.PI / 4;
        
        ctx.moveTo(p.x, p.y - p.size);
        for (let i = 0; i < 5; i++) {
          x = p.x + Math.cos(rot + i * step * 2) * p.size;
          y = p.y + Math.sin(rot + i * step * 2) * p.size;
          ctx.lineTo(x, y);
          x = p.x + Math.cos(rot + (i * 2 + 1) * step) * (p.size * 0.4);
          y = p.y + Math.sin(rot + (i * 2 + 1) * step) * (p.size * 0.4);
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // --- 5. DRAWING THE METRIC WARNING MARKERS / OBSTACLES ---
      obstaclesRef.current.forEach((obs) => {
        const obsData = OBSTACLES_DATA[obs.type];
        if (!obsData) return;

        ctx.save();

        // 3D bounding box glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = obs.type === 'HIPPO' ? '#10b981' : obs.type === 'ZEBRA' ? '#f59e0b' : obs.type === 'WOLF' ? '#ef4444' : obs.type === 'RHINO' ? '#ec4899' : '#3b82f6';
        
        // Render detailed cartoon representation inside canvas
        // We render background card bubbles
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = obs.type === 'HIPPO' ? '#10b981' : obs.type === 'ZEBRA' ? '#f59e0b' : obs.type === 'WOLF' ? '#ef4444' : obs.type === 'RHINO' ? '#ec4899' : '#3b82f6';
        ctx.lineWidth = 1.5;
        
        // Draw circular or rounded cell bubble
        ctx.beginPath();
        const radius = Math.min(obs.width, obs.height) / 2 + 3;
        const centerX = obs.x + obs.width / 2;
        const centerY = obs.y + obs.height / 2;
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw Comic/Animal Emoji centered beautifully
        ctx.font = `${Math.floor(obs.width * 0.72)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0; // reset shadow for text clear rendering
        ctx.fillText(obsData.emoji, centerX, centerY + 1);

        // Draw tiny custom decorative animal features (accessory items!)
        if (obs.type === 'WOLF') {
          // Draw mini fire hat on wolf
          ctx.font = '11px Arial';
          ctx.fillText('🚒', centerX, centerY - obs.height / 2.3);
        } else if (obs.type === 'HIPPO') {
          // Gold crown for boss hippo
          ctx.font = '11px Arial';
          ctx.fillText('👑', centerX, centerY - obs.height / 2.3);
        } else if (obs.type === 'SEAGULL') {
          // A mini briefcase in the talons or golf visor
          ctx.font = '10px Arial';
          ctx.fillText('💼', centerX - 2, centerY + obs.height / 2);
        } else if (obs.type === 'RHINO') {
          // Glitter/gems for shiny high opportunity
          ctx.font = '10px Arial';
          ctx.fillText('✨', centerX + obs.width / 2, centerY - obs.height / 3);
        } else if (obs.type === 'ZEBRA') {
          // Little chart tag
          ctx.font = '9px Arial';
          ctx.fillText('📊', centerX - obs.width / 2, centerY - obs.height / 3);
        }

        // Draw acronym sticker above the obstacle
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(obsData.name, centerX, obs.y - 7);

        ctx.restore();
      });

      // --- 6. DRAWING THE HERO UNICORN ---
      const unicorn = unicornRef.current;
      ctx.save();
      
      // Setup dynamic jumping squeeze/stretch
      let scaleX = 1;
      let scaleY = 1;
      let translateYOffset = 0;

      if (unicorn.isDucking) {
        scaleY = 0.55;
        scaleX = 1.35;
        translateYOffset = 9.5; // push down so hooves anchor on the ground
      } else if (!unicorn.isGrounded) {
        if (unicorn.vy < 0) {
          // stretching upwards on ascent
          scaleY = 1.1;
          scaleX = 0.95;
        } else {
          // squishing on fall
          scaleY = 0.95;
          scaleX = 1.05;
        }
      }

      // Center transformations
      ctx.translate(unicorn.x + UNICORN_WIDTH / 2, unicorn.y + UNICORN_HEIGHT / 2 + translateYOffset);
      ctx.rotate(unicorn.rotation);
      ctx.scale(scaleX, scaleY);

      // Sparkle glow trail behind unicorn
      ctx.shadowBlur = 12;
      ctx.shadowColor = currentTheme.accentColor;

      // Draw Unicorn procedurally for premium visual finish:
      // A) The sparkling body (magical off-white with pinkish core)
      ctx.fillStyle = '#fdf2f8'; // soft sweet pink pink-50
      ctx.strokeStyle = '#f472b6'; // pink-400
      ctx.lineWidth = 2;

      // Draw stylized cute pony horse shape
      ctx.beginPath();
      // start at chest
      ctx.moveTo(12, -4);
      // head structure
      ctx.lineTo(15, -18);
      ctx.quadraticCurveTo(24, -22, 24, -14); // snout/muzzle
      ctx.lineTo(12, -8);
      // neck down to back
      ctx.lineTo(8, -2);
      ctx.quadraticCurveTo(-10, -8, -16, -2); // rump
      // legs and underbelly
      ctx.lineTo(-12, 10);
      ctx.lineTo(8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // B) Draw details: Cute purple eyes
      ctx.fillStyle = '#6b21a8'; // purple 800
      ctx.beginPath();
      ctx.arc(17, -15, 2, 0, Math.PI * 2);
      ctx.fill();

      // C) Glow golden magical Horn
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#fbbf24'; // amber-400
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(18, -19); // near center head
      ctx.lineTo(32, -26); // points forward-up
      ctx.lineTo(21, -15);
      ctx.closePath();
      ctx.fill();

      // D) Rainbow dynamic flowing mane (hair) and wavy tail
      ctx.shadowBlur = 4;
      const maneColors = ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#10b981', '#eab308'];
      
      // Moving cycle index to animate waving hair!
      const timeCycle = started && !ended && !paused ? Date.now() / 100 : 0;
      
      // Draw Tail ribbons
      ctx.lineWidth = 2.5;
      maneColors.forEach((col, i) => {
        ctx.strokeStyle = col;
        ctx.beginPath();
        const tailOffset = Math.sin(timeCycle + i) * 3;
        ctx.moveTo(-16, -3);
        ctx.quadraticCurveTo(-26, -5 + i * 2 + tailOffset, -30, -2 + i * 1.5 + tailOffset);
        ctx.stroke();
      });

      // E) Mane ribbons
      maneColors.slice(0, 4).forEach((col, i) => {
        ctx.strokeStyle = col;
        ctx.beginPath();
        const maneOffset = Math.cos(timeCycle + i) * 2;
        ctx.moveTo(10, -12);
        ctx.quadraticCurveTo(4 - i * 3, -16 + maneOffset, -2, -10 + maneOffset);
        ctx.stroke();
      });

      // F) Running hooves/legs back and forth animation
      ctx.shadowBlur = 0; // reset shadows for legs
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';

      // Determine leg strides based on ground vs air status
      let frontLegAngle = 0;
      let backLegAngle = 0;
      if (unicorn.isDucking) {
        // Folded legs while ducking/sliding
        frontLegAngle = 0.35;
        backLegAngle = -0.35;
      } else if (unicorn.isGrounded) {
        frontLegAngle = Math.sin(unicorn.runFrame) * 1.1;
        backLegAngle = Math.cos(unicorn.runFrame) * 1.1;
      } else {
        // Splat legs out when high in air
        frontLegAngle = 0.6;
        backLegAngle = -0.6;
      }

      // Draw Back legs
      ctx.beginPath();
      ctx.moveTo(-12, 10);
      ctx.lineTo(-12 + backLegAngle * 10, 21);
      ctx.moveTo(5, 10);
      ctx.lineTo(5 + frontLegAngle * 10, 21);
      ctx.stroke();

      // Draw golden hooves tips
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-12 + backLegAngle * 10, 19);
      ctx.lineTo(-12 + backLegAngle * 10, 21);
      ctx.moveTo(5 + frontLegAngle * 10, 19);
      ctx.lineTo(5 + frontLegAngle * 10, 21);
      ctx.stroke();

      ctx.restore();

      // Loop request
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  // Watch gameOver toggle to reset when toggled to start
  useEffect(() => {
    if (gameStarted && !gameOver) {
      resetGame();
    }
  }, [gameStarted, gameOver]);

  // Touch handlers for mobile / mouse buttons
  const handleDodgeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (stateRef.current.gameOver || !stateRef.current.gameStarted || stateRef.current.isPaused) return;
    unicornRef.current.isDucking = true;
  };

  const handleDodgeEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    unicornRef.current.isDucking = false;
  };

  const handleJumpStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (stateRef.current.gameOver || !stateRef.current.gameStarted || stateRef.current.isPaused) return;

    if (unicornRef.current.isGrounded) {
      unicornRef.current.vy = -12;
      unicornRef.current.isGrounded = false;
      soundManager.playJump();

      for (let i = 0; i < 15; i++) {
        particlesRef.current.push({
          x: unicornRef.current.x + 10,
          y: unicornRef.current.y + UNICORN_HEIGHT - 5,
          vx: -2 - Math.random() * 4,
          vy: 1 - Math.random() * 3,
          color: `hsl(${Math.random() * 360}, 90%, 75%)`,
          size: 2 + Math.random() * 3,
          life: 0,
          maxLife: 20 + Math.random() * 15,
        });
      }
    }
  };

  const handleJumpEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (unicornRef.current.vy < -4) {
      unicornRef.current.vy = -4;
    }
  };

  return (
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

      {/* On-screen touch buttons for comfortable mobile/couch play */}
      {gameStarted && !gameOver && (
        <div 
          className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none select-none z-10"
          id="mobile-touch-play-triggers"
        >
          {/* Dodge Button - Left Side */}
          <button
            onMouseDown={handleDodgeStart}
            onMouseUp={handleDodgeEnd}
            onMouseLeave={handleDodgeEnd}
            onTouchStart={handleDodgeStart}
            onTouchEnd={handleDodgeEnd}
            id="touch-dodge-trigger"
            className="pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 bg-slate-900/40 hover:bg-slate-900/60 active:bg-purple-600/30 text-white border border-purple-500/20 rounded-2xl flex flex-col items-center justify-center backdrop-blur-md active:scale-95 transition-all select-none shadow-lg outline-none"
          >
            <span className="text-lg sm:text-xl">⬇️</span>
            <span className="text-[8px] sm:text-[9.5px] font-mono tracking-wider font-bold text-purple-300">DODGE</span>
          </button>

          {/* Jump Button - Right Side */}
          <button
            onMouseDown={handleJumpStart}
            onMouseUp={handleJumpEnd}
            onMouseLeave={handleJumpEnd}
            onTouchStart={handleJumpStart}
            onTouchEnd={handleJumpEnd}
            id="touch-jump-trigger"
            className="pointer-events-auto w-14 h-14 sm:w-16 sm:h-16 bg-slate-900/40 hover:bg-slate-900/60 active:bg-purple-600/30 text-white border border-purple-500/20 rounded-2xl flex flex-col items-center justify-center backdrop-blur-md active:scale-95 transition-all select-none shadow-lg outline-none"
          >
            <span className="text-lg sm:text-xl">⬆️</span>
            <span className="text-[8px] sm:text-[9.5px] font-mono tracking-wider font-bold text-purple-300">JUMP</span>
          </button>
        </div>
      )}
      
      {/* Dynamic Watermark and Instructions Overlay inside game context */}
      {!gameStarted && !gameOver && (
        <div 
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 md:p-6 animate-fade-in"
          id="ready-screen-overlay"
        >
          <div className="text-4xl md:text-5xl lg:text-6xl animate-float mb-2 md:mb-3" id="intro-emoji">🦄</div>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-white font-display tracking-tight mb-1 md:mb-2 uppercase glow-text italic" id="intro-title">
            Can You Lead the Unicorn to Launch?
          </h2>
          <p className="text-slate-300 text-[11px] md:text-xs lg:text-sm max-w-md mb-4 md:mb-5 leading-relaxed" id="intro-tagline">
            Dodge the 5 most dangerous animal personalities of Product Management. Jump over blockers, plus crouch/dodge under high flying Seagulls!
          </p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              soundManager.playClick();
              resetGame();
              // Trigger active game flag in parent
              setGameOver(false, 'HIPPO'); // trigger dummy reset state
            }}
            id="start-button-overlay"
            className="px-5 py-2 md:px-6 md:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95 transition-all text-xs md:text-sm tracking-widest uppercase cursor-pointer"
          >
            LAUNCH PRODUCT
          </button>
          
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10px] md:text-xs text-slate-500 font-mono" id="intro-keys">
            <span className="flex items-center gap-1.5"><span className="text-purple-400 bg-purple-500/10 px-1 py-0.2 rounded border border-purple-500/20">SPACE / CLICK</span> Jump</span>
            <span className="flex items-center gap-1.5"><span className="text-purple-400 bg-purple-500/10 px-1 py-0.2 rounded border border-purple-500/20">S / ARROW DOWN</span> Dodge / Fast Fall</span>
          </div>
        </div>
      )}

      {/* Level Banner & Ambient level flash */}
      {gameStarted && !gameOver && (
        <div 
          className="absolute top-4 left-4 flex flex-col text-left select-none pointer-events-none"
          id="game-hud-level"
        >
          <span className="text-[10px] font-mono tracking-widest text-[#ec4899] uppercase font-bold">
            {theme.levelName}
          </span>
          <span className="text-lg font-bold text-white font-display leading-tight flex items-center gap-1.5 shadow-sm text-shadow">
            Level {level} <span className="text-xs text-slate-400">({theme.name})</span>
          </span>
        </div>
      )}

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
  );
}
