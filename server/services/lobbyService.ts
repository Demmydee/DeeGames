import { supabase } from '../config/supabase';

export const getRoomCategories = async () => {
  const { data, error } = await supabase
    .from('room_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error('Failed to fetch room categories');
  return data;
};

export const getRoomCategoryById = async (id: string) => {
  const { data, error } = await supabase
    .from('room_categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error('Room category not found');
  return data;
};

export const getRoomOccupancy = async (roomId: string) => {
  // occupancy count based on active matches and pending requests
  
  // 1. Get active requests in this room
  const { data: requests, error: requestsError } = await supabase
    .from('game_requests')
    .select('id')
    .eq('room_category_id', roomId)
    .in('status', ['awaiting_opponents', 'ready_to_start']);

  if (requestsError) throw new Error('Failed to fetch requests for occupancy');

  const requestIds = requests.map(r => r.id);
  let requestsParticipantsCount = 0;

  if (requestIds.length > 0) {
    const { count, error } = await supabase
      .from('game_request_participants')
      .select('*', { count: 'exact', head: true })
      .in('game_request_id', requestIds);
    
    if (error) throw new Error('Failed to fetch request participants for occupancy');
    requestsParticipantsCount = count || 0;
  }

  // 2. Get active matches in this room
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id')
    .eq('room_category_id', roomId)
    .in('status', ['waiting', 'in_progress']);

  if (matchesError) throw new Error('Failed to fetch matches for occupancy');

  const matchIds = matches.map(m => m.id);
  let matchesParticipantsCount = 0;

  if (matchIds.length > 0) {
    const { count, error } = await supabase
      .from('match_participants')
      .select('*', { count: 'exact', head: true })
      .in('match_id', matchIds);

    if (error) throw new Error('Failed to fetch match participants for occupancy');
    matchesParticipantsCount = count || 0;
  }
  
  return requestsParticipantsCount + matchesParticipantsCount;
};

export const getRoomGames = async (roomId: string) => {
  // get pending requests
  const { data: requests, error: requestsError } = await supabase
    .from('game_requests')
    .select(`
      *,
      game_type:game_types(*),
      requester:users(username),
      participants:game_request_participants(user_id, status, joined_at)
    `)
    .eq('room_category_id', roomId)
    .in('status', ['awaiting_opponents', 'ready_to_start'])
    .order('created_at', { ascending: true });

  // get in-progress matches
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(`
      *,
      game_type:game_types(*),
      started_by:users(username),
      participants:match_participants(user_id, status, joined_at)
    `)
    .eq('room_category_id', roomId)
    .in('status', ['waiting', 'in_progress'])
    .order('started_at', { ascending: false });

  if (requestsError || matchesError) throw new Error('Failed to fetch games');

  return {
    requests,
    matches
  };
};

export const getGameTypes = async () => {
  const { data, error } = await supabase
    .from('game_types')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw new Error('Failed to fetch game types');
  return data;
};
