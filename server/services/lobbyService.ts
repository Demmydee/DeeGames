import { supabase } from '../config/supabase';

export const getRoomCategories = async () => {
  // Prune old presence once for all rooms
  await supabase.rpc('prune_room_presence');

  const { data: rooms, error } = await supabase
    .from('room_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error('Failed to fetch room categories');

  // Add occupancy to each room
  const roomsWithOccupancy = await Promise.all(rooms.map(async (room) => {
    try {
      const occupancy = await getRoomOccupancy(room.id);
      return { ...room, occupancy };
    } catch (err) {
      return { ...room, occupancy: 0 };
    }
  }));

  return roomsWithOccupancy;
};

export const getRoomCategoryById = async (id: string) => {
  // Prune old presence
  await supabase.rpc('prune_room_presence');

  const { data: room, error } = await supabase
    .from('room_categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !room) throw new Error('Room category not found');

  try {
    const occupancy = await getRoomOccupancy(room.id);
    return { ...room, occupancy };
  } catch (err) {
    return { ...room, occupancy: 0 };
  }
};

export const getRoomOccupancy = async (roomId: string) => {
  // Count active users in this room from room_presence table
  const { count, error } = await supabase
    .from('room_presence')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId);

  if (error) {
    console.error('Fetch Occupancy Error:', error);
    return 0;
  }

  return count || 0;
};

export const updateRoomPresence = async (roomId: string, userId: string) => {
  const { error } = await supabase.rpc('update_room_presence', {
    p_room_id: roomId,
    p_user_id: userId
  });

  if (error) {
    console.error('Update Presence Error:', error);
    throw new Error('Failed to update presence');
  }
};

export const getRoomGames = async (roomId: string) => {
  // get pending requests
  const { data: requests, error: requestsError } = await supabase
    .from('game_requests')
    .select(`
      *,
      game_type:game_types(*)
    `)
    .eq('room_category_id', roomId)
    .in('status', ['awaiting_opponents', 'ready_to_start'])
    .order('created_at', { ascending: true });

  // get in-progress matches
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(`
      *,
      game_type:game_types(*)
    `)
    .eq('room_category_id', roomId)
    .in('status', ['waiting', 'in_progress'])
    .order('started_at', { ascending: false });

  if (requestsError) {
    console.error('Fetch Requests Error:', JSON.stringify(requestsError, Object.getOwnPropertyNames(requestsError), 2));
    throw new Error('Failed to fetch game requests');
  }
  if (matchesError) {
    console.error('Fetch Matches Error:', JSON.stringify(matchesError, null, 2));
    throw new Error('Failed to fetch matches');
  }

  // Enrich requests with requester and participants data manually if needed,
  // but for now let's try to get the base data working first.
  // We can add a second pass to fetch usernames if the base query works.

  // Fetch usernames for requesters
  const requesterIds = [...new Set(requests.map(r => r.requester_user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, username')
    .in('id', requesterIds);

  const userMap = (users || []).reduce((acc: any, user: any) => {
    acc[user.id] = user.username;
    return acc;
  }, {});

  const enrichedRequests = requests.map(r => ({
    ...r,
    requester: { username: userMap[r.requester_user_id] || 'Unknown' }
  }));

  return {
    requests: enrichedRequests,
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
