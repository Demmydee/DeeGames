import { supabase } from '../config/supabase';
import { DiceGameEngine } from '../engines/DiceGameEngine';
import { ChessEngine } from '../engines/ChessEngine';
import { GameEngine, GameState, MoveData, GameConfig } from '../engines/types';
import { SettlementService } from './settlementService';
import { Match } from '../../src/types/multiplayer';
import { getMatchById } from './matchService';

export class GameStateService {
  private static engines: Record<string, GameEngine> = {
    'dice': new DiceGameEngine(),
    'chess': new ChessEngine()
  };

  static async initializeGame(matchId: string) {
    const match = await getMatchById(matchId);
    const gameTypeName = match.game_type?.name.toLowerCase() || 'dice';
    const engine = this.engines[gameTypeName] || this.engines['dice'];
    
    // Config logic
    let config: GameConfig;
    if (gameTypeName.includes('chess')) {
      config = {
        variant: match.game_request?.game_variant || 'blitz'
      };
    } else {
      config = {
        variant: (match.game_request?.game_variant as any) || 'sudden_drop',
        diceCount: 1,
        rounds: 5
      };
    }

    const initialState = engine.initializeState(match, match.participants!, config);

    try {
      const { data, error } = await supabase
        .from('game_states')
        .insert([{
          match_id: matchId,
          game_type: match.game_type!.name.toLowerCase(),
          game_variant: config.variant,
          state: initialState,
          current_round: initialState.currentRound,
          total_rounds: initialState.totalRounds,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('GameStateService.initializeGame Error:', {
        message: error.message,
        details: error.details,
        code: error.code,
        matchId
      });
      throw error;
    }
  }

  static async getGameState(matchId: string) {
    const { data, error } = await supabase
      .from('game_states')
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (error) throw error;
    return data;
  }

  static async processMove(matchId: string, userId: string, moveData: MoveData) {
    const gameStateRecord = await this.getGameState(matchId);
    const engine = this.engines[gameStateRecord.game_type] || this.engines['dice'];
    
    const { newState, events } = engine.processMove(gameStateRecord.state, userId, moveData);

    // Save move
    await supabase.from('game_moves').insert([{
      match_id: matchId,
      game_state_id: gameStateRecord.id,
      user_id: userId,
      move_type: moveData.type,
      move_data: moveData,
      result_data: { 
        roll: newState.rolls?.[userId],
        move: newState.last_move
      },
      round_number: newState.currentRound || 1,
      move_number: (gameStateRecord.state.history?.length || 0) + 1
    }]);

    // Handle Draw Offer Expiry for Chess
    if (gameStateRecord.game_type === 'chess') {
      const { ChessService } = await import('./chessService');
      await ChessService.expireDrawOffer(matchId);
    }

    // Update state
    const { data: updatedRecord, error: updateError } = await supabase
      .from('game_states')
      .update({
        state: newState,
        current_round: newState.currentRound || 1,
        status: newState.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameStateRecord.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Check end condition
    if (newState.status === 'completed') {
      await this.handleGameEnd(matchId, newState);
    }

    return { state: updatedRecord, events };
  }

  static async handlePlayerDefeat(matchId: string, userId: string, reason: 'left' | 'disconnected' | 'time_forfeit') {
    const gameStateRecord = await this.getGameState(matchId);
    if (gameStateRecord.status !== 'active') return;

    const engineName = gameStateRecord.game_type || 'dice';
    const engine = this.engines[engineName] || this.engines['dice'];
    const { newState, events } = engine.handlePlayerDefeat(gameStateRecord.state, userId, reason);

    // Update state
    const { data: updatedRecord, error: updateError } = await supabase
      .from('game_states')
      .update({
        state: newState,
        status: newState.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameStateRecord.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update participant status in DB
    const participantStatus = (reason === 'left' || reason === 'disconnected' || reason === 'time_forfeit') ? 'defeated' : 'eliminated';
    
    await supabase
      .from('match_participants')
      .update({ 
        status: participantStatus, 
        defeat_reason: reason,
        left_at: reason === 'left' ? new Date().toISOString() : null
      })
      .eq('match_id', matchId)
      .eq('user_id', userId);

    // Check end condition
    if (newState.status === 'completed') {
      await this.handleGameEnd(matchId, newState);
    }

    return { state: updatedRecord, events };
  }

  private static async handleGameEnd(matchId: string, state: GameState) {
    const match = await getMatchById(matchId);
    const engineName = (match.game_type?.name.toLowerCase() || 'dice');
    const engine = this.engines[engineName] || this.engines['dice'];
    const endResult = engine.detectEndCondition(state);

    if (endResult) {
      await SettlementService.settleMatch(match, endResult.rankings, state.history, endResult);
    }
  }
}
