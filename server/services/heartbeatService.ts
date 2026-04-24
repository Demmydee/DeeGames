import { supabase } from '../config/supabase';
import { GameStateService } from './gameStateService';

export class HeartbeatService {
  private static TIMEOUT_SECONDS = 30;
  private static COUNTDOWN_SECONDS = 300;

  static async recordHeartbeat(matchId: string, userId: string) {
    const { error } = await supabase
      .from('match_heartbeats')
      .upsert({
        match_id: matchId,
        user_id: userId,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'match_id,user_id' });

    if (error) throw error;

    // Also update reconnected status if they were disconnected
    await supabase
      .from('match_participants')
      .update({
        reconnected_at: new Date().toISOString(),
        disconnect_detected_at: null,
        countdown_expires_at: null
      })
      .eq('match_id', matchId)
      .eq('user_id', userId)
      .not('disconnect_detected_at', 'is', null);

    return { success: true };
  }

  static async checkStaleHeartbeats() {
    // This should be called by a cron job or periodically
    const staleTime = new Date(Date.now() - this.TIMEOUT_SECONDS * 1000).toISOString();

    const { data: staleHeartbeats, error } = await supabase
      .from('match_heartbeats')
      .select('match_id, user_id')
      .lt('last_seen_at', staleTime);

    if (error) {
        console.error('Error fetching stale heartbeats:', JSON.stringify(error, null, 2));
        return;
    }

    for (const hb of staleHeartbeats) {
      await this.handleDisconnect(hb.match_id, hb.user_id);
    }
  }

  static async handleDisconnect(matchId: string, userId: string) {
    // Check if already marked as disconnected
    const { data: participant, error: pError } = await supabase
      .from('match_participants')
      .select('*')
      .eq('match_id', matchId)
      .eq('user_id', userId)
      .single();

    if (pError || !participant || participant.disconnect_detected_at || participant.status !== 'active') {
      return;
    }

    const expiresAt = new Date(Date.now() + this.COUNTDOWN_SECONDS * 1000).toISOString();

    await supabase
      .from('match_participants')
      .update({
        disconnect_detected_at: new Date().toISOString(),
        countdown_expires_at: expiresAt
      })
      .eq('match_id', matchId)
      .eq('user_id', userId);

    console.log(`Player ${userId} disconnected from match ${matchId}. Countdown expires at ${expiresAt}`);
  }

  static async checkExpiredCountdowns() {
    const now = new Date().toISOString();

    const { data: expiredParticipants, error } = await supabase
      .from('match_participants')
      .select('match_id, user_id')
      .lt('countdown_expires_at', now)
      .not('countdown_expires_at', 'is', null)
      .eq('status', 'active');

    if (error) {
        console.error('Error fetching expired countdowns:', JSON.stringify(error, null, 2));
        return;
    }

    for (const p of expiredParticipants) {
      await GameStateService.handlePlayerDefeat(p.match_id, p.user_id, 'disconnected');
    }
  }

  static async checkChessClocks() {
    const { data: activeChessGames, error } = await supabase
      .from('game_states')
      .select('*')
      .ilike('game_type', '%chess%')
      .eq('status', 'active');

    if (error || !activeChessGames) return;

    for (const game of activeChessGames) {
      try {
        const state = game.state;
        if (!state || !state.turn_started_at) continue;

        const now = Date.now();
        const turnStartedAt = new Date(state.turn_started_at).getTime();
        const elapsed = now - turnStartedAt;

        const currentTurnUserId = state.currentTurnPlayerId;
        const isWhite = currentTurnUserId === state.white_user_id;
        const remaining = isWhite ? state.white_time_remaining_ms : state.black_time_remaining_ms;

        if (remaining - elapsed <= 0) {
          console.log(`Time forfeit detected for match ${game.match_id}, player ${currentTurnUserId}`);
          await GameStateService.handlePlayerDefeat(game.match_id, currentTurnUserId, 'time_forfeit');
        }
      } catch (gameError) {
        console.error(`Error checking chess clock for match ${game.match_id}:`, JSON.stringify(gameError, null, 2));
      }
    }
  }
}
