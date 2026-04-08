import { supabase } from '../config/supabase';

export type NotificationType = 
  | 'friend_request_received' 
  | 'friend_request_accepted' 
  | 'request_joined' 
  | 'match_started' 
  | 'deposit_successful' 
  | 'withdrawal_status_changed' 
  | 'report_submitted' 
  | 'system';

export const createNotification = async (
  userId: string, 
  type: NotificationType, 
  title: string, 
  message: string, 
  data: any = {}
) => {
  const { error } = await supabase
    .from('notifications')
    .insert([{
      user_id: userId,
      type,
      title,
      message,
      data
    }]);

  if (error) {
    console.error('Failed to create notification:', error);
  }
};

export const getNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch notifications');
  return data;
};

export const getUnreadCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw new Error('Failed to fetch unread count');
  return count || 0;
};

export const markAsRead = async (userId: string, notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw new Error('Failed to mark notification as read');
  return { success: true };
};

export const markAllAsRead = async (userId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw new Error('Failed to mark all notifications as read');
  return { success: true };
};
