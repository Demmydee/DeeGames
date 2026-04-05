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
      game_type:game_types(*),
      requester:users(username),
      participants:game_request_participants(
        user_id,
        status,
        joined_at,
        users(username)
      )
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
      participants:match_participants(
        user_id,
        status,
        joined_at,
        users(username)
      )
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
