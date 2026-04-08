import { supabase } from '../config/supabase';

export const updateLastSeen = async (userId: string) => {
  const { error } = await supabase
    .from('users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Failed to update last seen:', error);
  }
};

export const getOnlineStatus = (lastSeenAt: string | null) => {
  if (!lastSeenAt) return false;
  const lastSeenDate = new Date(lastSeenAt);
  const now = new Date();
  const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
  return diffInMinutes < 5; // Online if active in the last 5 minutes
};
