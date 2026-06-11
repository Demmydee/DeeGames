import { supabase } from '../config/supabase';
import { createNotification } from './notificationService';

export const sendFriendRequest = async (requesterId: string, addresseeId: string) => {
  if (requesterId === addresseeId) {
    throw new Error('You cannot send a friend request to yourself');
  }

  // Check if relationship already exists (including rejected, removed, declined, etc.)
  const { data: existing, error: findError } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(requester_user_id.eq.${requesterId},addressee_user_id.eq.${addresseeId}),and(requester_user_id.eq.${addresseeId},addressee_user_id.eq.${requesterId})`)
    .maybeSingle();

  if (findError) throw new Error(`Failed to check existing friendship: ${findError.message}`);

  if (existing) {
    if (existing.status === 'accepted') throw new Error('You are already friends');
    if (existing.status === 'pending') throw new Error('A friend request is already pending');
    if (existing.status === 'blocked') throw new Error('This user is blocked');

    // If it was rejected or removed, update the entry back to pending
    const { data: updated, error: updateError } = await supabase
      .from('friendships')
      .update({
        requester_user_id: requesterId,
        addressee_user_id: addresseeId,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to update friend request: ${updateError.message}`);

    // Notify the addressee
    const { data: requester } = await supabase.from('users').select('username').eq('id', requesterId).single();
    await createNotification(
      addresseeId,
      'friend_request_received',
      'New Friend Request',
      `${requester?.username || 'Someone'} sent you a friend request`,
      { requester_id: requesterId, friendship_id: updated.id }
    );

    return updated;
  }

  const { data: created, error: createError } = await supabase
    .from('friendships')
    .insert([{
      requester_user_id: requesterId,
      addressee_user_id: addresseeId,
      status: 'pending'
    }])
    .select()
    .single();

  if (createError) throw new Error(`Failed to send friend request: ${createError.message}`);

  // Notify the addressee
  const { data: requester } = await supabase.from('users').select('username').eq('id', requesterId).single();
  await createNotification(
    addresseeId,
    'friend_request_received',
    'New Friend Request',
    `${requester?.username || 'Someone'} sent you a friend request`,
    { requester_id: requesterId, friendship_id: created.id }
  );

  return created;
};

export const acceptFriendRequest = async (userId: string, friendshipId: string) => {
  const { data: friendship, error: findError } = await supabase
    .from('friendships')
    .select('*')
    .eq('id', friendshipId)
    .eq('addressee_user_id', userId)
    .eq('status', 'pending')
    .single();

  if (findError || !friendship) throw new Error(`Friend request not found or already processed: ${findError?.message || 'Not found'}`);

  const { error: updateError } = await supabase
    .from('friendships')
    .update({
      status: 'accepted',
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', friendshipId);

  if (updateError) throw new Error(`Failed to accept friend request: ${updateError.message}`);

  // Notify the requester
  const { data: addressee } = await supabase.from('users').select('username').eq('id', userId).single();
  await createNotification(
    friendship.requester_user_id,
    'friend_request_accepted',
    'Friend Request Accepted',
    `${addressee?.username || 'Someone'} accepted your friend request`,
    { addressee_id: userId, friendship_id: friendshipId }
  );

  return { success: true };
};

export const rejectFriendRequest = async (userId: string, friendshipId: string) => {
  const { error } = await supabase
    .from('friendships')
    .update({
      status: 'rejected',
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', friendshipId)
    .eq('addressee_user_id', userId)
    .eq('status', 'pending');

  if (error) throw new Error(`Failed to reject friend request: ${error.message}`);
  return { success: true };
};

export const removeFriend = async (userId: string, friendshipId: string) => {
  const { error } = await supabase
    .from('friendships')
    .update({
      status: 'removed',
      updated_at: new Date().toISOString()
    })
    .eq('id', friendshipId)
    .or(`requester_user_id.eq.${userId},addressee_user_id.eq.${userId}`);

  if (error) throw new Error(`Failed to remove friend: ${error.message}`);
  return { success: true };
};

export const getFriends = async (userId: string) => {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      status,
      requester_user_id,
      addressee_user_id,
      requester:requester_user_id(id, username, last_seen_at),
      addressee:addressee_user_id(id, username, last_seen_at)
    `)
    .or(`requester_user_id.eq.${userId},addressee_user_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (error) throw new Error(`Failed to fetch friends: ${error.message}`);

  return (data || []).map(f => {
    let reqUser: any = f.requester;
    if (Array.isArray(reqUser)) reqUser = reqUser[0];
    let addUser: any = f.addressee;
    if (Array.isArray(addUser)) addUser = addUser[0];

    const friend = f.requester_user_id === userId ? addUser : reqUser;
    return {
      friendship_id: f.id,
      ...friend
    };
  });
};

export const getIncomingRequests = async (userId: string) => {
  const { data, error } = await supabase
    .from('friendships')
    .select('*, requester:requester_user_id(id, username)')
    .eq('addressee_user_id', userId)
    .eq('status', 'pending');

  if (error) throw new Error(`Failed to fetch incoming requests: ${error.message}`);

  return (data || []).map(req => {
    let r = req.requester;
    if (Array.isArray(r)) r = r[0];
    return {
      ...req,
      requester: r
    };
  });
};

export const getOutgoingRequests = async (userId: string) => {
  const { data, error } = await supabase
    .from('friendships')
    .select('*, addressee:addressee_user_id(id, username)')
    .eq('requester_user_id', userId)
    .eq('status', 'pending');

  if (error) throw new Error(`Failed to fetch outgoing requests: ${error.message}`);

  return (data || []).map(req => {
    let a = req.addressee;
    if (Array.isArray(a)) a = a[0];
    return {
      ...req,
      addressee: a
    };
  });
};
