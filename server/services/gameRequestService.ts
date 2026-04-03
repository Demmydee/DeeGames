import { supabase } from '../config/supabase';

export const createGameRequest = async (userId: string, requestData: any) => {
  let { room_category_id, game_type_id, category, pay_mode, amount, required_players } = requestData;

  // 1. Validate category and pay_mode rules
  if (category === 'duel') {
    pay_mode = 'knockout'; // Duel is always knockout
    required_players = 2; // Duel is always 2 players
  }

  if (category === 'arena') {
    if (!['knockout', 'split'].includes(pay_mode)) {
      throw new Error('Arena must be knockout or split');
    }
    // Arena can have more than 2 players
  }

  if (pay_mode === 'split') {
    // Split mode must only be available where player count and game mode are valid
    // For now, let's say split is only for arena with > 2 players
    if (category !== 'arena' || required_players <= 2) {
      throw new Error('Split mode is only available for Arena with more than 2 players');
    }
  }

  // 2. Check active participation
  const { data: participation, error: participationError } = await supabase.rpc('check_user_active_participation', { p_user_id: userId });
  if (participationError) throw new Error('Failed to check active participation');
  if (participation.active) {
    throw new Error(`You already have an active ${participation.type}. Please complete or leave it first.`);
  }

  // 2. Validate room category and amount
  const { data: room, error: roomError } = await supabase
    .from('room_categories')
    .select('*')
    .eq('id', room_category_id)
    .single();
  if (roomError || !room) throw new Error('Room category not found');

  if (!room.is_free) {
    if (amount < room.min_wager || (room.max_wager && amount > room.max_wager)) {
      throw new Error(`Wager amount must be between ${room.min_wager} and ${room.max_wager || 'above'}`);
    }

    // Precheck balance for paid rooms
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('available_balance')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) throw new Error('Wallet not found');
    if (wallet.available_balance < amount) {
      throw new Error(`Insufficient balance. You need ₦${amount.toLocaleString()} to create this game.`);
    }
  } else if (amount > 0) {
    throw new Error('Wager amount must be 0 for free rooms');
  }

  // 3. Create request and add requester as participant
  const { data: request, error: requestError } = await supabase
    .from('game_requests')
    .insert([{
      room_category_id,
      game_type_id,
      requester_user_id: userId,
      category,
      pay_mode,
      amount,
      required_players,
      status: 'awaiting_opponents'
    }])
    .select()
    .single();

  if (requestError) throw new Error('Failed to create game request');

  const { error: participantError } = await supabase
    .from('game_request_participants')
    .insert([{
      game_request_id: request.id,
      user_id: userId,
      role: 'requester',
      status: 'joined'
    }]);

  if (participantError) {
    // Rollback request if participant creation fails
    await supabase.from('game_requests').delete().eq('id', request.id);
    throw new Error('Failed to add requester to participants');
  }

  return request;
};

export const joinGameRequest = async (userId: string, requestId: string) => {
  // 1. Check active participation
  const { data: participation, error: participationError } = await supabase.rpc('check_user_active_participation', { p_user_id: userId });
  if (participationError) throw new Error('Failed to check active participation');
  if (participation.active) {
    throw new Error(`You already have an active ${participation.type}. Please complete or leave it first.`);
  }

  // 2. Get request and check status
  const { data: request, error: requestError } = await supabase
    .from('game_requests')
    .select('*, participants:game_request_participants(user_id)')
    .eq('id', requestId)
    .single();

  if (requestError || !request) throw new Error('Game request not found');
  if (request.status !== 'awaiting_opponents' && request.status !== 'ready_to_start') {
    throw new Error('Game request is no longer open');
  }

  // 3. Precheck balance if paid room
  if (request.amount > 0) {
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('available_balance')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) throw new Error('Wallet not found');
    if (wallet.available_balance < request.amount) {
      throw new Error(`Insufficient balance. You need ₦${request.amount.toLocaleString()} to join this game.`);
    }
  }

  if (request.participants.length >= request.required_players) {
    throw new Error('Game request is already full');
  }

  // 3. Join request
  const { error: joinError } = await supabase
    .from('game_request_participants')
    .insert([{
      game_request_id: requestId,
      user_id: userId,
      role: 'player',
      status: 'joined'
    }]);

  if (joinError) throw new Error('Failed to join game request');

  // 4. Update request status if full
  if (request.participants.length + 1 === request.required_players) {
    await supabase
      .from('game_requests')
      .update({ status: 'ready_to_start' })
      .eq('id', requestId);
  }

  return { success: true };
};

export const cancelGameRequest = async (userId: string, requestId: string) => {
  const { data, error } = await supabase.rpc('cancel_game_request', {
    p_request_id: requestId,
    p_user_id: userId
  });

  if (error) throw new Error(error.message || 'Failed to cancel game request');
  return data;
};

export const leaveGameRequest = async (userId: string, requestId: string) => {
  const { data, error } = await supabase.rpc('leave_game_request', {
    p_request_id: requestId,
    p_user_id: userId
  });

  if (error) throw new Error(error.message || 'Failed to leave game request');
  return data;
};

export const startGameRequest = async (userId: string, requestId: string) => {
  // Use the atomic RPC function for starting the game
  const { data, error } = await supabase.rpc('start_game_request_atomic', {
    p_request_id: requestId,
    p_started_by_user_id: userId
  });

  if (error) {
    console.error('Start Game RPC Error:', error);
    throw new Error(error.message || 'Failed to start game');
  }

  return data;
};

export const getGameRequestById = async (id: string) => {
  const { data, error } = await supabase
    .from('game_requests')
    .select(`
      *,
      game_type:game_types(*),
      room:room_categories(*),
      requester:users(username),
      participants:game_request_participants(
        user_id,
        role,
        status,
        joined_at,
        users(username)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error('Game request not found');
  return data;
};
