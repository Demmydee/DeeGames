import { supabase } from '../config/supabase';

export const getOrCreateChatRoom = async (contextType: 'room' | 'match', contextId: string) => {
  const { data: existing, error: findError } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('context_type', contextType)
    .eq('context_id', contextId)
    .maybeSingle();

  if (findError) {
    console.error('getOrCreateChatRoom Find Error:', JSON.stringify(findError));
    throw new Error(`Failed to find chat room: ${findError.message}`);
  }
  if (existing) return existing;

  const { data: created, error: createError } = await supabase
    .from('chat_rooms')
    .insert([{ context_type: contextType, context_id: contextId }])
    .select()
    .single();

  if (createError) {
    console.error('getOrCreateChatRoom Create Error:', JSON.stringify(createError));
    throw new Error(`Failed to create chat room: ${createError.message}`);
  }
  return created;
};

export const getChatMessages = async (chatRoomId: string, limit = 50) => {
  // Try to join first as it is more efficient
  let { data: messages, error } = await supabase
    .from('chat_messages')
    .select('*, users(username)')
    .eq('chat_room_id', chatRoomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // If join fails due to schema/relationship issues, fallback to manual fetch
  if (error && error.message.includes('relationship')) {
    console.warn('Chat join failed, falling back to manual mapping:', error.message);
    const { data: rawMessages, error: rawError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_room_id', chatRoomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (rawError) throw new Error(`Failed to fetch raw chat messages: ${rawError.message}`);

    if (rawMessages && rawMessages.length > 0) {
      const userIds = [...new Set(rawMessages.map(m => m.sender_user_id))];
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, username')
        .in('id', userIds);

      if (!userError && users) {
        const userMap = Object.fromEntries(users.map(u => [u.id, u]));
        messages = rawMessages.map(m => ({
          ...m,
          users: userMap[m.sender_user_id] || null
        }));
      } else {
        messages = rawMessages;
      }
    } else {
      messages = [];
    }
  } else if (error) {
    console.error('getChatMessages Error:', JSON.stringify(error));
    throw new Error(`Failed to fetch chat messages: ${error.message}`);
  }

  return (messages || []).reverse();
};

export const sendMessage = async (chatRoomId: string, userId: string, content: string, messageType = 'text', metadata = {}) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{
      chat_room_id: chatRoomId,
      sender_user_id: userId,
      content,
      message_type: messageType,
      metadata
    }])
    .select('*, users(username)')
    .single();

  if (error) throw new Error(`Failed to send message: ${error.message}`);
  return data;
};
