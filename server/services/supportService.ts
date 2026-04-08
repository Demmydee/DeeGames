import { supabase } from '../config/supabase';

export const submitSupportTicket = async (userId: string | null, subject: string, message: string) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert([{
      user_id: userId,
      subject,
      message,
      status: 'open'
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to submit support ticket: ${error.message}`);
  return data;
};

export const getMyTickets = async (userId: string) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch support tickets: ${error.message}`);
  return data;
};
