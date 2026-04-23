import { Chess } from 'chess.js';
import { 
  GameEngine, 
  GameState, 
  MoveData, 
  GameStateUpdateResult, 
  EndConditionResult, 
  RankedParticipant,
  GameConfig
} from './types';
import { Match, MatchParticipant } from '../../src/types/multiplayer';

export class ChessEngine implements GameEngine {
  initializeState(
    match: Match,
    participants: MatchParticipant[],
    config: GameConfig
  ): GameState {
    const isBlitz = config.variant === 'blitz';
    const startingTime = isBlitz 
      ? parseInt(process.env.CHESS_BLITZ_START_TIME_MS || '600000')
      : parseInt(process.env.CHESS_RAPID_START_TIME_MS || '900000');
    
    const increment = isBlitz
      ? parseInt(process.env.CHESS_BLITZ_INCREMENT_MS || '5000')
      : parseInt(process.env.CHESS_RAPID_INCREMENT_MS || '10000');

    // Randomly assign white and black
    if (participants.length < 2) {
      throw new Error('Chess requires at least 2 participants');
    }
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const whiteUserId = shuffled[0].user_id;
    const blackUserId = shuffled[1].user_id;

    const chess = new Chess();

    return {
      variant: config.variant,
      status: 'active',
      activePlayerIds: [whiteUserId, blackUserId],
      participants: participants.map(p => ({
        userId: p.user_id,
        username: p.users?.username || 'Unknown',
        score: 0,
        status: 'active'
      })),
      currentTurnPlayerId: whiteUserId,
      history: [],
      config,
      // Chess specific state
      fen: chess.fen(),
      white_user_id: whiteUserId,
      black_user_id: blackUserId,
      white_time_remaining_ms: startingTime,
      black_time_remaining_ms: startingTime,
      turn_started_at: new Date().toISOString(),
      increment_ms: increment,
      starting_time_ms: startingTime,
      move_count: 0,
      last_move: null,
      is_in_check: false,
      draw_offer_by: null,
      game_over: false,
      result: null,
      end_reason: null,
      draw_reason: null
    };
  }

  processMove(
    currentState: GameState,
    userId: string,
    moveData: MoveData
  ): GameStateUpdateResult {
    if (currentState.status !== 'active') {
      throw new Error('Game is not active');
    }

    if (userId !== currentState.currentTurnPlayerId) {
      throw new Error('Not your turn');
    }

    const now = Date.now();
    const turnStartedAt = new Date(currentState.turn_started_at).getTime();
    const elapsed = now - turnStartedAt;

    const isWhite = userId === currentState.white_user_id;
    const currentRemaining = isWhite
      ? currentState.white_time_remaining_ms
      : currentState.black_time_remaining_ms;

    // 1. Check for time forfeit
    if (currentRemaining - elapsed <= 0) {
      return this.handlePlayerDefeat(currentState, userId, 'time_forfeit');
    }

    // 2. Validate move with chess.js
    const chess = new Chess(currentState.fen);
    try {
      const moveResult = chess.move({
        from: moveData.from,
        to: moveData.to,
        promotion: moveData.promotion // 'q', 'r', 'b', 'n'
      });

      if (!moveResult) {
        throw new Error('Invalid move');
      }

      // 3. Update time bank
      const newRemaining = currentRemaining - elapsed + currentState.increment_ms;
      const nextTurnPlayerId = isWhite ? currentState.black_user_id : currentState.white_user_id;

      const newState: GameState = {
        ...currentState,
        fen: chess.fen(),
        currentTurnPlayerId: nextTurnPlayerId,
        turn_started_at: new Date().toISOString(),
        move_count: currentState.move_count + 1,
        last_move: { from: moveData.from, to: moveData.to, san: moveResult.san },
        is_in_check: chess.inCheck(),
        draw_offer_by: null, // Move expires draw offer
        [isWhite ? 'white_time_remaining_ms' : 'black_time_remaining_ms']: newRemaining,
        history: [...currentState.history, {
          move: moveResult.san,
          from: moveData.from,
          to: moveData.to,
          player: isWhite ? 'white' : 'black',
          timestamp: new Date().toISOString()
        }]
      };

      // 4. Check for end conditions
      const endResult = this.detectEndCondition(newState);
      if (endResult && endResult.isOver) {
        newState.status = 'completed';
        newState.game_over = true;
        newState.participants = endResult.rankings;
        // Map engine flags to settlement-friendly state attributes
        if (endResult.isDraw) {
          newState.result = 'draw';
          newState.draw_reason = endResult.drawReason;
        } else {
          newState.result = 'win';
          newState.winner_id = endResult.winnerId;
        }
      }

      return {
        newState,
        events: [{
          type: 'MOVE_PROCESSED',
          payload: { move: moveResult, turn: chess.turn() }
        }]
      };

    } catch (error: any) {
      throw new Error(error.message || 'Invalid move execution');
    }
  }

  handlePlayerDefeat(
    currentState: GameState,
    userId: string,
    reason: 'left' | 'disconnected' | 'time_forfeit'
  ): GameStateUpdateResult {
    const winnerId = currentState.participants.find(p => p.userId !== userId)?.userId || null;

    const rankings: RankedParticipant[] = currentState.participants.map(p => ({
      ...p,
      rank: p.userId === winnerId ? 1 : 2,
      status: (p.userId === userId ? (reason === 'left' ? 'left' : (reason === 'disconnected' ? 'disconnected' : 'defeated')) : 'active') as any,
      defeatReason: p.userId === userId ? reason : undefined,
      score: p.userId === winnerId ? 1 : 0
    }));

    const newState: GameState = {
      ...currentState,
      status: 'completed',
      game_over: true,
      result: 'win',
      winner_id: winnerId,
      end_reason: reason,
      participants: rankings
    };

    return {
      newState,
      events: [{
        type: 'GAME_OVER',
        payload: { winnerId, reason }
      }]
    };
  }

  detectEndCondition(currentState: GameState): EndConditionResult | null {
    const chess = new Chess(currentState.fen);

    if (chess.isGameOver()) {
      let isDraw = false;
      let drawReason = '';
      let winnerId: string | null = null;

      if (chess.isCheckmate()) {
        winnerId = chess.turn() === 'w' ? currentState.black_user_id : currentState.white_user_id;
      } else if (chess.isDraw()) {
        isDraw = true;
        if (chess.isStalemate()) drawReason = 'stalemate';
        else if (chess.isThreefoldRepetition()) drawReason = 'threefold_repetition';
        else if (chess.isInsufficientMaterial()) drawReason = 'insufficient_material';
        else if (chess.isDrawByFiftyMoves()) drawReason = 'fifty_move_rule';
        else drawReason = 'mutual_agreement'; // Fallback / default draw
      }

      const rankings: RankedParticipant[] = currentState.participants.map(p => ({
        ...p,
        rank: isDraw ? 1 : (p.userId === winnerId ? 1 : 2),
        status: (isDraw ? 'active' : (p.userId === winnerId ? 'active' : 'defeated')) as any,
        score: isDraw ? 0.5 : (p.userId === winnerId ? 1 : 0)
      })).sort((a, b) => (a.rank || 0) - (b.rank || 0));

      return {
        isOver: true,
        isDraw,
        drawReason,
        winnerId,
        rankings
      };
    }

    return null;
  }

  getRankings(currentState: GameState): RankedParticipant[] {
    return currentState.participants;
  }
}
