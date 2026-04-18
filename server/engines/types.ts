import { Match, MatchParticipant } from '../../src/types/multiplayer';

export interface GameConfig {
  variant: 'sudden_drop' | 'marathon';
  diceCount: number; // 1 or 2
  rounds?: number; // for marathon
}

export interface GameState {
  variant: 'sudden_drop' | 'marathon';
  status: 'active' | 'completed' | 'abandoned';
  currentRound: number;
  totalRounds: number;
  activePlayerIds: string[];
  participants: RankedParticipant[];
  rolls: Record<string, number | null>; // current round rolls
  currentTurnPlayerId: string | null;
  history: RoundResult[];
  config: GameConfig;
  tieBreaker?: {
    playerIds: string[];
    rolls: Record<string, number | null>;
  };
}

export interface RankedParticipant {
  userId: string;
  username: string;
  rank?: number;
  score: number; // cumulative score for marathon
  status: 'active' | 'eliminated' | 'left' | 'disconnected';
  eliminatedRound?: number;
  defeatReason?: 'left' | 'disconnected' | 'eliminated' | 'loss';
}

export interface RoundResult {
  round: number;
  rolls: Record<string, number>;
  eliminatedPlayerId?: string;
  isTieBreaker?: boolean;
}

export interface MoveData {
  type: 'roll' | 'tie_reroll' | 'sudden_death_roll';
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
  winnerId: string | null;
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
    reason: 'left' | 'disconnected'
  ): GameStateUpdateResult;

  detectEndCondition(
    currentState: GameState
  ): EndConditionResult | null;

  getRankings(
    currentState: GameState
  ): RankedParticipant[];
}
