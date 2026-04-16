import { supabase } from '../config/supabase';
import { createNotification } from './notificationService';

export const sendFriendRequest = async (requesterId: string, addresseeId: string) => {
  if (requesterId === addresseeId) {
    throw new Error('You cannot send a friend request to yourself');
  }

  // Check if relationship already exists
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
  
  return data.map(f => {
    const friend = f.requester_user_id === userId ? f.addressee : f.requester;
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
  return data;
};

export const getOutgoingRequests = async (userId: string) => {
  const { data, error } = await supabase
    .from('friendships')
    .select('*, addressee:addressee_user_id(id, username)')
    .eq('requester_user_id', userId)
    .eq('status', 'pending');

  if (error) throw new Error(`Failed to fetch outgoing requests: ${error.message}`);
  return data;
};
