import { supabase } from '../config/supabase';
import { GameStateService } from './gameStateService';
import { SettlementService } from './settlementService';
import { getMatchById } from './matchService';

export class ChessService {
  static async createDrawOffer(matchId: string, userId: string) {
    console.log(`CHESS_SERVICE: createDrawOffer matchId=${matchId} userId=${userId}`);
    // 1. Verify existence of pending draw offer
    const { data: existing, error: fetchError } = await supabase
      .from('draw_offers')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError) {
      console.error('CHESS_SERVICE: Error fetching existing draw offer:', fetchError);
      throw new Error(`Database error: ${fetchError.message}`);
    }

    if (existing) {
      console.warn('CHESS_SERVICE: Draw offer already exists', existing);
      throw new Error('A draw offer is already pending for this match');
    }

    // 2. Create new offer
    console.log('CHESS_SERVICE: Inserting new draw offer into DB...');
    const { data, error } = await supabase
      .from('draw_offers')
      .insert([{
        match_id: matchId,
        offered_by_user_id: userId,
        status: 'pending'
      }])
      .select()
      .maybeSingle();

    if (error) {
      console.error('CHESS_SERVICE: Error inserting draw offer:', error);
      throw error;
    }
    console.log('CHESS_SERVICE: Draw offer created successfully:', data);
    return data;
  }

  static async acceptDrawOffer(matchId: string, userId: string) {
    const { data: offer, error: offerError } = await supabase
      .from('draw_offers')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'pending')
      .maybeSingle();

    if (offerError || !offer) {
      throw new Error('No pending draw offer found');
    }

    if (offer.offered_by_user_id === userId) {
      throw new Error('You cannot accept your own offer');
    }

    // Update offer status
    await supabase
      .from('draw_offers')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', offer.id);

    // End game as draw
    const gameStateRecord = await GameStateService.getGameState(matchId);
    const newState = {
      ...gameStateRecord.state,
      status: 'completed',
      game_over: true,
      result: 'draw',
      draw_reason: 'mutual_agreement'
    };

    // Use ChessEngine rankings for draw
    const engine = (GameStateService as any).engines['chess'];
    const rankings = engine.getRankings(newState).map((r: any) => ({
      ...r,
      rank: 1,
      score: 0.5,
      status: 'active'
    }));

    await supabase
      .from('game_states')
      .update({ state: newState, status: 'completed' })
      .eq('id', gameStateRecord.id);

    const match = await getMatchById(matchId);
    await SettlementService.settleMatch(match, rankings, newState.history, { isDraw: true, drawReason: 'mutual_agreement' });

    return { success: true };
  }

  static async declineDrawOffer(matchId: string, userId: string) {
    const { data: offer, error: offerError } = await supabase
      .from('draw_offers')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'pending')
      .maybeSingle();

    if (offerError || !offer) {
      throw new Error('No pending draw offer found');
    }

    if (offer.offered_by_user_id === userId) {
      throw new Error('You cannot decline your own offer');
    }

    await supabase
      .from('draw_offers')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', offer.id);

    return { success: true };
  }

  static async expireDrawOffer(matchId: string) {
    await supabase
      .from('draw_offers')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('match_id', matchId)
      .eq('status', 'pending');
  }
}
