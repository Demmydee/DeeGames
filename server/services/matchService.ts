import { supabase } from '../config/supabase';

export const getMatchById = async (id: string) => {
  const { data: match, error } = await supabase
    .from('matches')
    .select(`
      *,
      game_type:game_types(*),
      room:room_categories(*),
      game_request:game_requests(*)
    `)
    .eq('id', id)
    .single();

  if (error || !match) throw new Error('Match not found');

  // Fetch starter and participants manually
  const { data: startedBy } = await supabase
    .from('users')
    .select('username')
    .eq('id', match.started_by_user_id)
    .single();

  // Run timeout check before fetching participants
  await supabase.rpc('check_match_timeouts', { p_match_id: id });

  const { data: participants } = await supabase
    .from('match_participants')
    .select('*')
    .eq('match_id', id);

  // Fetch usernames for participants
  const participantIds = (participants || []).map(p => p.user_id);
  const { data: participantUsers } = await supabase
    .from('users')
    .select('id, username')
    .in('id', participantIds);
  
  const participantUserMap = (participantUsers || []).reduce((acc: any, user: any) => {
    acc[user.id] = user.username;
    return acc;
  }, {});

  const enrichedParticipants = (participants || []).map(p => ({
    ...p,
    users: { username: participantUserMap[p.user_id] || 'Unknown' }
  }));

  return {
    ...match,
    started_by: startedBy || { username: 'Unknown' },
    participants: enrichedParticipants
  };
};

export const updateMatchPresence = async (userId: string, matchId: string) => {
  const { error } = await supabase.rpc('update_match_presence', {
    p_match_id: matchId,
    p_user_id: userId
  });

  if (error) throw new Error('Failed to update match presence');
  return { success: true };
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
