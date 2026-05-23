export type ObstacleType = 'HIPPO' | 'ZEBRA' | 'WOLF' | 'RHINO' | 'SEAGULL';

export interface ObstacleInfo {
  type: ObstacleType;
  name: string;
  acronym: string;
  fullName: string;
  emoji: string;
  pmConcept: string;
  sarcasticQuote: string;
  color: string;
  lightColor: string;
  textColor: string;
  borderColor: string;
}

export interface ObstacleInstance {
  id: string;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  passed: boolean;
  speedMultiplier: number;
  floatOffset?: number; // For flying Seagulls!
  wingDirection?: number; // For wing flapping visuals!
}

export interface ThemeConfig {
  id: 'forest' | 'desert' | 'beach';
  name: string;
  skyGradient: [string, string];
  groundColor: string;
  midgroundColor: string;
  foregroundColor: string;
  accentColor: string;
  levelName: string;
}

export interface HighScore {
  id: string;
  name: string;
  score: number;
  date: string;
  level: number;
  killedByAcronym: string;
  killedByName: string;
}
