export interface RoomCategory {
  id: string;
  name: string;
  description: string;
  min_wager: number;
  max_wager: number | null;
  is_free: boolean;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
}

export interface GameType {
  id: string;
  name: string;
  description: string;
  min_players: number;
  max_players: number;
  is_active: boolean;
}

export type GameRequestStatus = 'awaiting_opponents' | 'ready_to_start' | 'started' | 'cancelled' | 'expired';

export interface GameRequest {
  id: string;
  room_category_id: string;
  game_type_id: string;
  requester_user_id: string;
  category: 'duel' | 'arena';
  pay_mode: 'knockout' | 'split';
  amount: number;
  required_players: number;
  status: GameRequestStatus;
  created_at: string;
  game_type?: GameType;
  room?: RoomCategory;
  requester?: { username: string };
  participants?: GameRequestParticipant[];
}

export interface GameRequestParticipant {
  id: string;
  game_request_id: string;
  user_id: string;
  role: 'requester' | 'player';
  status: 'joined' | 'left' | 'locked_in';
  joined_at: string;
  users?: { username: string };
}

export type MatchStatus = 'waiting' | 'in_progress' | 'finished' | 'cancelled';

export interface Match {
  id: string;
  game_request_id: string;
  room_category_id: string;
  game_type_id: string;
  started_by_user_id: string;
  status: MatchStatus;
  started_at: string;
  finished_at: string | null;
  winner_user_id: string | null;
  game_type?: GameType;
  room?: RoomCategory;
  started_by?: { username: string };
  participants?: MatchParticipant[];
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  user_id: string;
  status: 'active' | 'left' | 'defeated' | 'winner' | 'eliminated';
  joined_at: string;
  left_at: string | null;
  users?: { username: string };
}

export interface DashboardStatus {
  active: boolean;
  type: 'request' | 'match' | null;
  id: string | null;
  details: any;
}
