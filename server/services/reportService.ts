import { supabase } from '../config/supabase';
import { createNotification } from './notificationService';

export const submitReport = async (reporterId: string, reportedId: string, matchId: string | null, reason: string, description: string) => {
  if (reporterId === reportedId) {
    throw new Error('You cannot report yourself');
  }

  const { data, error } = await supabase
    .from('player_reports')
    .insert([{
      reporter_user_id: reporterId,
      reported_user_id: reportedId,
      match_id: matchId,
      reason,
      description,
      status: 'submitted'
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to submit report: ${error.message}`);

  // Notify the reporter that their report has been received
  await createNotification(
    reporterId,
    'report_submitted',
    'Report Submitted',
    'Your report has been received and will be reviewed by our team.',
    { report_id: data.id }
  );

  return data;
};

export const getMyReports = async (userId: string) => {
  const { data, error } = await supabase
    .from('player_reports')
    .select('*, reported:reported_user_id(username)')
    .eq('reporter_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch reports: ${error.message}`);
  return data;
};
