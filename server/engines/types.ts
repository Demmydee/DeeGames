import { Match, MatchParticipant } from '../../src/types/multiplayer';

export interface GameConfig {
  variant: string;
  [key: string]: any;
}

export interface GameState {
  variant: string;
  status: 'active' | 'completed' | 'abandoned';
  currentRound?: number;
  totalRounds?: number;
  activePlayerIds: string[];
  participants: RankedParticipant[];
  currentTurnPlayerId: string | null;
  history: any[];
  config: GameConfig;
  [key: string]: any;
}

export interface RankedParticipant {
  userId: string;
  username: string;
  rank?: number;
  score: number; // cumulative score for marathon
  status: 'active' | 'eliminated' | 'left' | 'disconnected' | 'defeated';
  eliminatedRound?: number;
  defeatReason?: 'left' | 'disconnected' | 'eliminated' | 'loss' | 'time_forfeit';
}

export interface RoundResult {
  round: number;
  rolls: Record<string, number>;
  eliminatedPlayerId?: string;
  isTieBreakerInitial?: boolean;
  isTieBreakerContinued?: boolean;
  isTieBreakerResolved?: boolean;
}

export interface MoveData {
  type: string;
  [key: string]: any;
}

export interface GameStateUpdateResult {
  newState: GameState;
  events: GameEvent[];
}

export interface GameEvent {
  type: string;
  payload: any;
}

export interface EndConditionResult {
  isOver: boolean;
  winnerId: string | null;
  isDraw?: boolean;
  drawReason?: string;
  rankings: RankedParticipant[];
}

export interface GameEngine {
  initializeState(
    match: Match,
    participants: MatchParticipant[],
    config: GameConfig
  ): GameState;

  processMove(
    currentState: GameState,
    userId: string,
    moveData: MoveData
  ): GameStateUpdateResult;

  handlePlayerDefeat(
    currentState: GameState,
    userId: string,
    reason: 'left' | 'disconnected' | 'time_forfeit'
  ): GameStateUpdateResult;

  detectEndCondition(
    currentState: GameState
  ): EndConditionResult | null;

  getRankings(
    currentState: GameState
  ): RankedParticipant[];
}
