import { useRef, useCallback } from 'react';
import { ObstacleType, ObstacleInstance, ThemeConfig } from '../types';
import { getThemeForLevel, OBSTACLES_DATA, THEMES } from '../data/obstacles';
import { soundManager } from '../utils/audio';

// --- Canvas geometry (exported: GameCanvas reads these for drawing) ---
export const LOGICAL_WIDTH  = 800;
export const LOGICAL_HEIGHT = 280;
export const GROUND_Y       = 220;
export const UNICORN_WIDTH  = 55;
export const UNICORN_HEIGHT = 50;

// --- Level progression ---
const LEVEL_2_SCORE = 500;
const LEVEL_3_SCORE = 1200;
const MILESTONE_INTERVAL  = 200;  // score cue every N points
const OBSTACLE_PASS_BONUS = 50;   // bonus points for clearing an obstacle

// --- Unicorn physics ---
const UNICORN_START_X    = 80;
const GRAVITY            = 0.52;  // downward acceleration per frame
const DUCK_GRAVITY       = 1.05;  // faster fall when ducking
const JUMP_IMPULSE       = -12;   // initial upward velocity on jump
const JUMP_CUTOFF_VY     = -4;    // early key-release clamps velocity to this
const RUN_FRAME_SPEED    = 0.028; // animation speed scales with game speed
const ROTATION_SPEED     = 0.03;  // tilt amount per unit of vertical velocity

// --- Speed formula (score-driven, per level) ---
const SPEED_L1_BASE  = 3.6;
const SPEED_L1_RANGE = 1.6;
const SPEED_L2_BASE  = 5.2;
const SPEED_L2_WIDTH = 700;  // score width of level 2 band
const SPEED_L2_RANGE = 2.8;
const SPEED_L3_BASE  = 8.0;
const SPEED_L3_RAMP  = 1000; // score range over which L3 reaches max speed
const SPEED_L3_RANGE = 4.5;

// --- Obstacle spawning ---
const SPAWN_INTERVAL_INIT        = 100; // first spawn delay (frames)
const SPAWN_INTERVAL_RESET       = 80;  // spawn delay after game reset
const SPAWN_MIN_SEP_PX           = 320; // minimum pixel gap between obstacles
const SPAWN_EXTRA_PX_MAX         = 180; // extra random gap ceiling (pixels)
const SPAWN_MIN_SEP_FRAMES_FLOOR = 28;  // floor for minimum separation frames
const SPAWN_EXTRA_FRAMES_FLOOR   = 15;  // floor for random extra frames

// --- Seagull behavior ---
const SEAGULL_SPEED_MULT      = 1.15;
const SEAGULL_WING_FLAP_CHANCE = 0.15;
const SEAGULL_FLOAT_SPEED     = 0.08;
const SEAGULL_FLOAT_AMP       = 0.6;
const SEAGULL_MIN_HEIGHT      = 75;  // px above ground
const SEAGULL_HEIGHT_RANGE    = 35;  // random height variance

// --- Collision hitbox insets (smaller than sprite = forgiving feel) ---
const HITBOX_U_LEFT     = 8;
const HITBOX_U_RIGHT    = 6;
const HITBOX_U_TOP      = 6;
const HITBOX_U_TOP_DUCK = 26; // larger top inset while ducking
const HITBOX_U_BOTTOM   = 3;
const HITBOX_OBS_INSET  = 4;

// --- Particles ---
const TRAIL_SPARKLE_RATE  = 0.35; // probability of spawning a trail particle per frame
const TRAIL_SPARKLE_SPEED = 0.4;  // trail vx as fraction of baseSpeed
const JUMP_PARTICLE_COUNT    = 15;
const LEVELUP_PARTICLE_COUNT = 40;
const EXPLOSION_PARTICLE_COUNT = 35;
const PARTICLE_FRICTION = 0.96;

// --- Internal types (not exported: callers use refs, not these shapes directly) ---
interface UnicornState {
  x: number;
  y: number;
  vy: number;
  isGrounded: boolean;
  runFrame: number;
  rotation: number;
  isDucking: boolean;
}

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
  y: number;
  width: number;
  height: number;
  type: string;
  color: string;
  speedMultiplier: number;
}

function computeBaseSpeed(score: number, level: number): number {
  if (level === 1) return SPEED_L1_BASE + (score / LEVEL_2_SCORE) * SPEED_L1_RANGE;
  if (level === 2) return SPEED_L2_BASE + ((score - LEVEL_2_SCORE) / SPEED_L2_WIDTH) * SPEED_L2_RANGE;
  return SPEED_L3_BASE + Math.min((score - LEVEL_3_SCORE) / SPEED_L3_RAMP, 1.0) * SPEED_L3_RANGE;
}

interface UseGamePhysicsOptions {
  onScoreUpdate: (score: number, level: number, theme: ThemeConfig) => void;
  onGameOver: (obstacle: ObstacleType) => void;
}

export function useGamePhysics({ onScoreUpdate, onGameOver }: UseGamePhysicsOptions) {
  const unicornRef = useRef<UnicornState>({
    x: UNICORN_START_X,
    y: GROUND_Y - UNICORN_HEIGHT,
    vy: 0,
    isGrounded: true,
    runFrame: 0,
    rotation: 0,
    isDucking: false,
  });

  const obstaclesRef = useRef<ObstacleInstance[]>([]);
  const particlesRef = useRef<SparkleParticle[]>([]);
  const bgLayersRef  = useRef<BackgroundAsset[]>([]);
  const spawnTimerRef        = useRef(0);
  const nextSpawnTimeRef     = useRef(SPAWN_INTERVAL_INIT);
  const milestoneReachedRef  = useRef(0);
  const scoreRef    = useRef(0);
  const levelRef    = useRef(1);
  const themeRef    = useRef<ThemeConfig>(THEMES[0]);
  const gameOverRef = useRef(false);

  // Store callbacks in refs so tick() closure never goes stale
  const onScoreUpdateRef = useRef(onScoreUpdate);
  const onGameOverRef    = useRef(onGameOver);
  onScoreUpdateRef.current = onScoreUpdate;
  onGameOverRef.current    = onGameOver;

  const initParallaxLayers = useCallback(() => {
    const layers: BackgroundAsset[] = [];
    for (let i = 0; i < 5; i++) {
      layers.push({
        x: Math.random() * LOGICAL_WIDTH,
        y: 30 + Math.random() * 60,
        width: 60 + Math.random() * 80,
        height: 20 + Math.random() * 20,
        type: 'cloud',
        color: 'rgba(255, 255, 255, 0.07)',
        speedMultiplier: 0.1,
      });
    }
    for (let i = 0; i < 4; i++) {
      layers.push({
        x: (i * (LOGICAL_WIDTH / 3)) + Math.random() * 50,
        y: 0,
        width: 100 + Math.random() * 120,
        height: 70 + Math.random() * 60,
        type: 'silhouette',
        color: 'rgba(255, 255, 255, 0.05)',
        speedMultiplier: 0.3,
      });
    }
    for (let i = 0; i < 6; i++) {
      layers.push({
        x: (i * (LOGICAL_WIDTH / 5)) + Math.random() * 40,
        y: 0,
        width: 25 + Math.random() * 20,
        height: 40 + Math.random() * 40,
        type: 'flora',
        color: 'rgba(255, 255, 255, 0.12)',
        speedMultiplier: 0.7,
      });
    }
    bgLayersRef.current = layers;
  }, []);

  const resetGame = useCallback(() => {
    unicornRef.current = {
      x: UNICORN_START_X,
      y: GROUND_Y - UNICORN_HEIGHT,
      vy: 0,
      isGrounded: true,
      runFrame: 0,
      rotation: 0,
      isDucking: false,
    };
    obstaclesRef.current = [];
    particlesRef.current = [];
    spawnTimerRef.current    = 0;
    nextSpawnTimeRef.current = SPAWN_INTERVAL_RESET;
    scoreRef.current         = 0;
    levelRef.current         = 1;
    themeRef.current         = getThemeForLevel(0);
    milestoneReachedRef.current = 0;
    gameOverRef.current      = false;
    initParallaxLayers();
    onScoreUpdateRef.current(0, 1, getThemeForLevel(0));
  }, [initParallaxLayers]);

  const handleJump = useCallback(() => {
    if (unicornRef.current.isGrounded) {
      unicornRef.current.vy = JUMP_IMPULSE;
      unicornRef.current.isGrounded = false;
      soundManager.playJump();
      for (let i = 0; i < JUMP_PARTICLE_COUNT; i++) {
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
  }, []);

  const handleJumpEnd = useCallback(() => {
    if (unicornRef.current.vy < JUMP_CUTOFF_VY) {
      unicornRef.current.vy = JUMP_CUTOFF_VY;
    }
  }, []);

  const handleDuckStart = useCallback(() => { unicornRef.current.isDucking = true;  }, []);
  const handleDuckEnd   = useCallback(() => { unicornRef.current.isDucking = false; }, []);

  // Called each animation frame from GameCanvas. Mutates refs; never touches canvas.
  const tick = useCallback((isActive: boolean) => {
    if (!isActive || gameOverRef.current) return;

    const baseSpeed = computeBaseSpeed(scoreRef.current, levelRef.current);

    // Score increment
    const nextScore = scoreRef.current + 1;
    scoreRef.current = nextScore;

    if (nextScore > 0 && nextScore % MILESTONE_INTERVAL === 0 && milestoneReachedRef.current !== nextScore) {
      milestoneReachedRef.current = nextScore;
      soundManager.playScoreMilestone();
    }

    const nextLevel = nextScore >= LEVEL_3_SCORE ? 3 : nextScore >= LEVEL_2_SCORE ? 2 : 1;
    if (nextLevel !== levelRef.current) {
      levelRef.current = nextLevel;
      soundManager.playLevelUp();
      for (let i = 0; i < LEVELUP_PARTICLE_COUNT; i++) {
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

    const targetTheme = getThemeForLevel(nextScore);
    if (targetTheme.id !== themeRef.current.id) {
      themeRef.current = targetTheme;
    }

    onScoreUpdateRef.current(nextScore, levelRef.current, themeRef.current);

    // Scroll parallax background
    bgLayersRef.current.forEach((layer) => {
      layer.x -= baseSpeed * layer.speedMultiplier;
      if (layer.x + layer.width < 0) {
        layer.x = LOGICAL_WIDTH + Math.random() * 100;
      }
    });

    // Unicorn physics
    const unicorn = unicornRef.current;
    unicorn.vy += unicorn.isDucking ? DUCK_GRAVITY : GRAVITY;
    unicorn.y  += unicorn.vy;

    if (unicorn.y >= GROUND_Y - UNICORN_HEIGHT) {
      unicorn.y         = GROUND_Y - UNICORN_HEIGHT;
      unicorn.vy        = 0;
      unicorn.isGrounded = true;
      unicorn.runFrame  += baseSpeed * RUN_FRAME_SPEED;
    } else {
      unicorn.rotation = unicorn.vy * ROTATION_SPEED;
    }

    // Running trail sparkles
    if (Math.random() < TRAIL_SPARKLE_RATE) {
      particlesRef.current.push({
        x: unicorn.x - 5,
        y: unicorn.isDucking
          ? unicorn.y + UNICORN_HEIGHT * 0.75 + (Math.random() - 0.5) * 5
          : unicorn.y + UNICORN_HEIGHT / 2  + (Math.random() - 0.5) * 15,
        vx: -baseSpeed * TRAIL_SPARKLE_SPEED - Math.random() * 2,
        vy: (Math.random() - 0.5) * 2,
        color: `hsl(${270 + Math.random() * 90}, 95%, ${70 + Math.random() * 20}%)`,
        size: 2 + Math.random() * 3,
        life: 0,
        maxLife: 15 + Math.random() * 10,
      });
    }

    // Obstacle spawning
    spawnTimerRef.current += 1;
    if (spawnTimerRef.current >= nextSpawnTimeRef.current) {
      spawnTimerRef.current = 0;
      const minFrames  = Math.max(SPAWN_MIN_SEP_FRAMES_FLOOR, Math.floor(SPAWN_MIN_SEP_PX  / baseSpeed));
      const extraFrames = Math.max(SPAWN_EXTRA_FRAMES_FLOOR,  Math.floor(SPAWN_EXTRA_PX_MAX / baseSpeed));
      nextSpawnTimeRef.current = minFrames + Math.floor(Math.random() * extraFrames);

      const currentLevel = levelRef.current;
      const availableTypes: ObstacleType[] = [];
      if (currentLevel === 1) {
        availableTypes.push('HIPPO', 'WOLF');
      } else if (currentLevel === 2) {
        availableTypes.push('ZEBRA', 'WOLF', 'SEAGULL');
      } else {
        availableTypes.push('RHINO', 'SEAGULL', 'HIPPO', 'WOLF', 'ZEBRA');
      }

      const chosenType = availableTypes[Math.floor(Math.random() * availableTypes.length)] || 'HIPPO';
      let obsY = GROUND_Y - 45;
      let obsH = 45;
      let obsW = 45;
      let floatOffset: number | undefined;

      if (chosenType === 'SEAGULL') {
        obsY = GROUND_Y - SEAGULL_MIN_HEIGHT - Math.floor(Math.random() * SEAGULL_HEIGHT_RANGE);
        obsH = 36;
        obsW = 42;
        floatOffset = Math.random() * 100;
      } else if (chosenType === 'HIPPO') {
        obsH = 46; obsW = 48; obsY = GROUND_Y - obsH;
      } else if (chosenType === 'RHINO') {
        obsH = 45; obsW = 54; obsY = GROUND_Y - obsH;
      } else if (chosenType === 'WOLF') {
        obsH = 44; obsW = 41; obsY = GROUND_Y - obsH;
      } else if (chosenType === 'ZEBRA') {
        obsH = 48; obsW = 38; obsY = GROUND_Y - obsH;
      }

      obstaclesRef.current.push({
        id: Math.random().toString(),
        type: chosenType,
        x: LOGICAL_WIDTH,
        y: obsY,
        width: obsW,
        height: obsH,
        passed: false,
        speedMultiplier: chosenType === 'SEAGULL' ? SEAGULL_SPEED_MULT : 1.0,
        floatOffset,
        wingDirection: 1,
      });
    }

    // Move obstacles, detect collision
    obstaclesRef.current = obstaclesRef.current.filter((obs) => {
      obs.x -= baseSpeed * obs.speedMultiplier;

      if (obs.type === 'SEAGULL') {
        if (!obs.wingDirection) obs.wingDirection = 1;
        if (Math.random() < SEAGULL_WING_FLAP_CHANCE) obs.wingDirection = -obs.wingDirection;
        if (obs.floatOffset !== undefined) {
          obs.floatOffset += SEAGULL_FLOAT_SPEED;
          obs.y += Math.sin(obs.floatOffset) * SEAGULL_FLOAT_AMP;
        }
      }

      if (!obs.passed && obs.x + obs.width < unicornRef.current.x) {
        obs.passed = true;
        scoreRef.current += OBSTACLE_PASS_BONUS;
        onScoreUpdateRef.current(scoreRef.current, levelRef.current, themeRef.current);
      }

      const u = unicornRef.current;
      const uLeft   = u.x + HITBOX_U_LEFT;
      const uRight  = u.x + UNICORN_WIDTH  - HITBOX_U_RIGHT;
      const uTop    = u.isDucking ? u.y + HITBOX_U_TOP_DUCK : u.y + HITBOX_U_TOP;
      const uBottom = u.y + UNICORN_HEIGHT - HITBOX_U_BOTTOM;
      const oLeft   = obs.x + HITBOX_OBS_INSET;
      const oRight  = obs.x + obs.width  - HITBOX_OBS_INSET;
      const oTop    = obs.y + HITBOX_OBS_INSET;
      const oBottom = obs.y + obs.height - HITBOX_OBS_INSET;

      if (uRight > oLeft && uLeft < oRight && uBottom > oTop && uTop < oBottom) {
        if (!gameOverRef.current) {
          gameOverRef.current = true;
          soundManager.playHit();
          for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
            particlesRef.current.push({
              x: (uRight + oLeft) / 2,
              y: (uBottom + oTop) / 2,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8 - 1,
              color:
                obs.type === 'HIPPO' ? '#34d399' :
                obs.type === 'ZEBRA' ? '#fbbf24' :
                obs.type === 'WOLF'  ? '#f87171' :
                obs.type === 'RHINO' ? '#f472b6' : '#60a5fa',
              size: 2 + Math.random() * 4,
              life: 0,
              maxLife: 25 + Math.random() * 20,
            });
          }
          onGameOverRef.current(obs.type);
        }
      }

      return obs.x + obs.width > -50;
    });

    // Age particles
    particlesRef.current = particlesRef.current.filter((p) => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.life += 1;
      p.vx *= PARTICLE_FRICTION;
      p.vy *= PARTICLE_FRICTION;
      return p.life < p.maxLife;
    });
  }, []);

  return {
    unicornRef,
    obstaclesRef,
    particlesRef,
    bgLayersRef,
    scoreRef,
    levelRef,
    themeRef,
    tick,
    resetGame,
    initParallaxLayers,
    handleJump,
    handleJumpEnd,
    handleDuckStart,
    handleDuckEnd,
  };
}
