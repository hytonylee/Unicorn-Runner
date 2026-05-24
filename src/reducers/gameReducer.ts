import { ObstacleType } from '../types';

export interface GameState {
  gameStarted: boolean;
  gameOver: boolean;
  isPaused: boolean;
  killedBy: ObstacleType;
  highScore: number;
}

export type GameAction =
  | { type: 'START' }
  | { type: 'GAME_OVER'; obstacle: ObstacleType; currentScore: number }
  | { type: 'CLOSE_MODAL' }
  | { type: 'INIT_BEST_SCORE'; score: number }
  | { type: 'CLEAR_BEST_SCORE' };

export const initialGameState: GameState = {
  gameStarted: false,
  gameOver:    false,
  isPaused:    false,
  killedBy:    'HIPPO',
  highScore:   0,
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START':
      return { ...state, gameStarted: true, gameOver: false, isPaused: false };

    case 'GAME_OVER':
      return {
        ...state,
        gameOver:  true,
        killedBy:  action.obstacle,
        highScore: Math.max(state.highScore, action.currentScore),
      };

    case 'CLOSE_MODAL':
      return { ...state, gameOver: false, gameStarted: false };

    case 'INIT_BEST_SCORE':
      return { ...state, highScore: action.score };

    case 'CLEAR_BEST_SCORE':
      return { ...state, highScore: 0 };

    default:
      return state;
  }
}
