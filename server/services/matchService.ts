import { supabase } from '../config/supabase';

export const getMatchById = async (id: string) => {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      game_type:game_types(*),
      room:room_categories(*),
      started_by:users(username),
      participants:match_participants(
        user_id,
        status,
        joined_at,
        users(username)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error('Match not found');
  return data;
};

export const leaveMatch = async (userId: string, matchId: string) => {
  // Logic for leaving an active match
  // 1. Update participant status to 'left'
  const { error: updateError } = await supabase
    .from('match_participants')
    .update({ status: 'left', left_at: new Date().toISOString() })
    .eq('match_id', matchId)
    .eq('user_id', userId);

  if (updateError) throw new Error('Failed to update participant status');

  // 2. Check remaining participants
  const { data: participants, error: participantsError } = await supabase
    .from('match_participants')
    .select('user_id, status')
    .eq('match_id', matchId);

  if (participantsError) throw new Error('Failed to fetch participants');

  const activeParticipants = participants.filter(p => p.status === 'active');

  // 3. If only one active participant remains, they win
  if (activeParticipants.length === 1) {
    const winnerId = activeParticipants[0].user_id;
    await supabase
      .from('matches')
      .update({ 
        status: 'finished', 
        winner_user_id: winnerId,
        finished_at: new Date().toISOString()
      })
      .eq('id', matchId);

    await supabase
      .from('match_participants')
      .update({ status: 'winner' })
      .eq('match_id', matchId)
      .eq('user_id', winnerId);
    
    // TODO: Trigger wager release logic in a future phase
  } else if (activeParticipants.length === 0) {
    // All left, match cancelled/finished without winner
    await supabase
      .from('matches')
      .update({ 
        status: 'cancelled', 
        finished_at: new Date().toISOString()
      })
      .eq('id', matchId);
  }

  return { success: true };
};

export const getUserActiveMatch = async (userId: string) => {
  const { data, error } = await supabase
    .from('match_participants')
    .select('match_id, matches(*)')
    .eq('user_id', userId)
    .in('status', ['active'])
    .order('joined_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error('Failed to fetch active match');
  return data;
};
