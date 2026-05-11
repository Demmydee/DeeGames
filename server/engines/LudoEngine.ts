import { 
  GameEngine, 
  GameState, 
  GameConfig, 
  MoveData, 
  GameStateUpdateResult, 
  EndConditionResult, 
  RankedParticipant 
} from './types';
import { Match, MatchParticipant } from '../../src/types/multiplayer';

export class LudoEngine implements GameEngine {
  
  // Board setup constants
  private static readonly PATH_LENGTH = 52;
  private static readonly HOME_PATH_LENGTH = 6; // Includes final home square
  private static readonly PLAYERS_INFO = [
    { color: 'red', start: 0, end: 50 },
    { color: 'green', start: 13, end: 11 },
    { color: 'yellow', start: 26, end: 24 },
    { color: 'blue', start: 39, end: 37 }
  ];

  // Positions where pieces cannot be captured
  private static readonly SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

  initializeState(
    match: Match,
    participants: MatchParticipant[],
    config: GameConfig
  ): GameState {
    if (!participants || participants.length < 2) {
      throw new Error('Ludo requires at least 2 participants');
    }

    // Assign positions based on participant order
    const ludoParticipants = participants.slice(0, 4).map((p, idx) => ({
      userId: p.user_id,
      username: p.users?.username || 'Unknown',
      status: 'active' as const,
      score: 0,
      color: LudoEngine.PLAYERS_INFO[idx].color,
      tokens: [-1, -1, -1, -1] as number[] // -1 = home base, 0-50 = common path, 51-55 = home path, 56 = goal
    }));

    const activePlayerIds = ludoParticipants.map(p => p.userId);

    return {
      variant: config.variant || 'classic',
      status: 'active',
      activePlayerIds,
      participants: ludoParticipants as any,
      currentTurnPlayerId: activePlayerIds[0],
      dieValue: null,
      lastRoll: null,
      waitingForTokenMove: false,
      extraTurn: false,
      history: [],
      config
    };
  }

  processMove(
    currentState: GameState,
    userId: string,
    moveData: MoveData
  ): GameStateUpdateResult {
    if (currentState.status !== 'active') throw new Error('Game is not active');
    if (currentState.currentTurnPlayerId !== userId) throw new Error("Not your turn");

    const newState = JSON.parse(JSON.stringify(currentState)) as GameState;
    const events: any[] = [];

    if (moveData.type === 'roll_die') {
      if (newState.waitingForTokenMove) throw new Error('Waiting for token move');

      const roll = Math.floor(Math.random() * 6) + 1;
      newState.dieValue = roll;
      newState.lastRoll = { userId, value: roll };
      
      // Check if player has any valid moves
      const playerIndex = newState.activePlayerIds.indexOf(userId);
      const participant = newState.participants[playerIndex] as any;
      const validMoves = this.getValidMoveIndices(participant.tokens, roll);

      if (validMoves.length === 0) {
        // No moves possible, skip to next turn
        events.push({ type: 'no_moves_possible', payload: { userId, roll } });
        this.advanceTurn(newState);
      } else {
        newState.waitingForTokenMove = true;
        events.push({ type: 'rolled_die', payload: { userId, roll, validMoves } });
      }
    } else if (moveData.type === 'move_token') {
      if (!newState.waitingForTokenMove) throw new Error('Must roll die first');
      const tokenIndex = moveData.tokenIndex;
      if (typeof tokenIndex !== 'number' || tokenIndex < 0 || tokenIndex > 3) {
        throw new Error('Invalid token index');
      }

      const roll = newState.dieValue!;
      const playerIndex = newState.activePlayerIds.indexOf(userId);
      const participant = newState.participants[playerIndex] as any;
      
      if (!this.isValidMove(participant.tokens[tokenIndex], roll)) {
        throw new Error('Invalid move for this token');
      }

      // Execute move
      const oldPos = participant.tokens[tokenIndex];
      const newPos = this.calculateNewPos(oldPos, roll);
      participant.tokens[tokenIndex] = newPos;

      // Handle capture if not in safe zone
      const captures = this.handleCaptures(newState, playerIndex, tokenIndex);
      if (captures.length > 0) {
        events.push({ type: 'capture', payload: { capturer: userId, captured: captures } });
        newState.extraTurn = true; // Capture gives another turn in many variants
      }

      // Check if finished
      if (newPos === 56) {
        participant.score += 1;
        events.push({ type: 'token_home', payload: { userId, tokenIndex } });
        newState.extraTurn = true; // Reaching home gives another turn
        
        if (participant.score === 4) {
          this.finalizeGame(newState, events);
          return { newState, events };
        }
      }

      // Set extra turn for rolling a 6
      if (roll === 6) {
        newState.extraTurn = true;
      }

      events.push({ type: 'token_moved', payload: { userId, tokenIndex, oldPos, newPos } });
      this.advanceTurn(newState);
    }

    return { newState, events };
  }

  handlePlayerDefeat(
    currentState: GameState,
    userId: string,
    reason: 'left' | 'disconnected' | 'time_forfeit'
  ): GameStateUpdateResult {
    const newState = JSON.parse(JSON.stringify(currentState)) as GameState;
    const events: any[] = [];

    const participant = newState.participants.find((p: any) => p.userId === userId);
    if (!participant || participant.status !== 'active') return { newState, events };

    participant.status = reason === 'left' ? 'left' : 'disconnected';
    participant.defeatReason = reason;

    newState.activePlayerIds = newState.activePlayerIds.filter(id => id !== userId);
    
    if (newState.currentTurnPlayerId === userId) {
      this.advanceTurn(newState);
    }

    if (newState.activePlayerIds.length <= 1) {
      this.finalizeGame(newState, events);
    }

    return { newState, events };
  }

  detectEndCondition(currentState: GameState): EndConditionResult | null {
    if (currentState.status !== 'completed') return null;
    const winner = currentState.participants.find((p: any) => p.rank === 1);
    return {
      isOver: true,
      winnerId: winner ? winner.userId : null,
      rankings: this.getRankings(currentState)
    };
  }

  getRankings(currentState: GameState): RankedParticipant[] {
    return [...currentState.participants].sort((a: any, b: any) => (a.rank || 99) - (b.rank || 99));
  }

  private advanceTurn(state: GameState) {
    if (state.extraTurn && state.status === 'active') {
      state.extraTurn = false;
      state.dieValue = null;
      state.waitingForTokenMove = false;
      return;
    }

    const currentIndex = state.activePlayerIds.indexOf(state.currentTurnPlayerId!);
    if (currentIndex === -1) {
      state.currentTurnPlayerId = state.activePlayerIds[0] || null;
    } else {
      state.currentTurnPlayerId = state.activePlayerIds[(currentIndex + 1) % state.activePlayerIds.length];
    }
    state.dieValue = null;
    state.waitingForTokenMove = false;
    state.extraTurn = false;
  }

  private getValidMoveIndices(tokens: number[], roll: number): number[] {
    return tokens
      .map((pos, idx) => (this.isValidMove(pos, roll) ? idx : -1))
      .filter(idx => idx !== -1);
  }

  private isValidMove(pos: number, roll: number): boolean {
    if (pos === -1) return roll === 6; // Can only leave home on 6
    if (pos >= 56) return false; // Already reached goal
    return pos + roll <= 56; // Cannot overshoot goal
  }

  private calculateNewPos(pos: number, roll: number): number {
    if (pos === -1) return 0; // Move out to start square
    return pos + roll;
  }

  private handleCaptures(state: GameState, movingPlayerIdx: number, tokenIdx: number): any[] {
    const movingParticipant = state.participants[movingPlayerIdx];
    const newPos = movingParticipant.tokens[tokenIdx];
    
    // Can only capture on common path
    if (newPos < 0 || newPos > 50) return [];

    const realBoardPos = (LudoEngine.PLAYERS_INFO[movingPlayerIdx].start + newPos) % LudoEngine.PATH_LENGTH;
    
    // Check if safe zone
    if (LudoEngine.SAFE_SQUARES.includes(realBoardPos)) return [];

    const captures: any[] = [];

    state.participants.forEach((p: any, pIdx: number) => {
      if (pIdx === movingPlayerIdx) return;
      
      p.tokens.forEach((tPos: number, tIdx: number) => {
        if (tPos < 0 || tPos > 50) return;
        
        const otherRealPos = (LudoEngine.PLAYERS_INFO[pIdx].start + tPos) % LudoEngine.PATH_LENGTH;
        if (otherRealPos === realBoardPos) {
          // CAPTURE!
          p.tokens[tIdx] = -1;
          captures.push({ userId: p.userId, tokenIndex: tIdx });
        }
      });
    });

    return captures;
  }

  private finalizeGame(state: GameState, events: any[]) {
    state.status = 'completed';
    state.currentTurnPlayerId = null;

    // Sort by tokens home (score)
    const ranked = [...state.participants].sort((a: any, b: any) => {
      if (a.score !== b.score) return b.score - a.score;
      // Tie-breaker: sum of token positions
      const sumA = a.tokens.reduce((s: number, p: number) => s + (p === -1 ? 0 : p), 0);
      const sumB = b.tokens.reduce((s: number, p: number) => s + (p === -1 ? 0 : p), 0);
      return sumB - sumA;
    });

    ranked.forEach((p: any, idx) => {
      const original = state.participants.find((op: any) => op.userId === p.userId);
      if (original) original.rank = idx + 1;
    });

    events.push({ type: 'game_completed', payload: { rankings: this.getRankings(state) } });
  }
}
