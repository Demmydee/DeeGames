import apiClient from '../api/client';
import { RoomCategory, GameType, GameRequest, Match, DashboardStatus } from '../types/multiplayer';

const API_BASE = '/api';

export const lobbyApi = {
  getRooms: async (): Promise<RoomCategory[]> => {
    const response = await apiClient.get(`${API_BASE}/lobby/rooms`);
    return response.data;
  },
  getRoomById: async (id: string): Promise<RoomCategory> => {
    const response = await apiClient.get(`${API_BASE}/lobby/rooms/${id}`);
    return response.data;
  },
  getRoomOccupancy: async (id: string): Promise<number> => {
    const response = await apiClient.get(`${API_BASE}/lobby/rooms/${id}/occupancy`);
    return response.data.occupancy;
  },
  getRoomGames: async (id: string): Promise<{ requests: GameRequest[], matches: Match[] }> => {
    const response = await apiClient.get(`${API_BASE}/lobby/rooms/${id}/games`);
    return response.data;
  },
  getGameTypes: async (): Promise<GameType[]> => {
    const response = await apiClient.get(`${API_BASE}/lobby/game-types`);
    return response.data;
  },
  updatePresence: async (id: string): Promise<void> => {
    await apiClient.post(`${API_BASE}/lobby/rooms/${id}/presence`);
  }
};

export const gameRequestApi = {
  create: async (data: Partial<GameRequest>): Promise<GameRequest> => {
    const response = await apiClient.post(`${API_BASE}/game-requests`, data);
    return response.data;
  },
  getById: async (id: string): Promise<GameRequest> => {
    const response = await apiClient.get(`${API_BASE}/game-requests/${id}`);
    return response.data;
  },
  join: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`${API_BASE}/game-requests/${id}/join`);
    return response.data;
  },
  cancel: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`${API_BASE}/game-requests/${id}/cancel`);
    return response.data;
  },
  leave: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`${API_BASE}/game-requests/${id}/leave`);
    return response.data;
  },
  start: async (id: string): Promise<{ match_id: string }> => {
    const response = await apiClient.post(`${API_BASE}/game-requests/${id}/start`);
    return response.data;
  }
};

export const matchApi = {
  getById: async (id: string): Promise<Match> => {
    const response = await apiClient.get(`${API_BASE}/matches/${id}`);
    return response.data;
  },
  leave: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`${API_BASE}/matches/${id}/leave`);
    return response.data;
  },
  updatePresence: async (id: string): Promise<void> => {
    await apiClient.post(`${API_BASE}/matches/${id}/presence`);
  },
  getActive: async (): Promise<Match | null> => {
    const response = await apiClient.get(`${API_BASE}/matches/active`);
    return response.data;
  }
};

export const dashboardApi = {
  getStatus: async (): Promise<DashboardStatus> => {
    const response = await apiClient.get(`${API_BASE}/dashboard/status`);
    return response.data;
  }
};

export const chatApi = {
  getRoomMessages: async (roomId: string) => {
    const response = await apiClient.get(`${API_BASE}/chat/rooms/${roomId}/messages`);
    return response.data;
  },
  sendRoomMessage: async (roomId: string, content: string) => {
    const response = await apiClient.post(`${API_BASE}/chat/rooms/${roomId}/messages`, { content });
    return response.data;
  },
  getMatchMessages: async (matchId: string) => {
    const response = await apiClient.get(`${API_BASE}/chat/matches/${matchId}/messages`);
    return response.data;
  },
  sendMatchMessage: async (matchId: string, content: string) => {
    const response = await apiClient.post(`${API_BASE}/chat/matches/${matchId}/messages`, { content });
    return response.data;
  }
};

export const voiceApi = {
  getMatchSession: async (matchId: string) => {
    const response = await apiClient.get(`${API_BASE}/voice/matches/${matchId}/session`);
    return response.data;
  }
};

export const friendApi = {
  sendRequest: async (addresseeId: string) => {
    const response = await apiClient.post(`${API_BASE}/friends/request`, { addresseeId });
    return response.data;
  },
  acceptRequest: async (id: string) => {
    const response = await apiClient.post(`${API_BASE}/friends/${id}/accept`);
    return response.data;
  },
  rejectRequest: async (id: string) => {
    const response = await apiClient.post(`${API_BASE}/friends/${id}/reject`);
    return response.data;
  },
  removeFriend: async (id: string) => {
    const response = await apiClient.post(`${API_BASE}/friends/${id}/remove`);
    return response.data;
  },
  getFriends: async () => {
    const response = await apiClient.get(`${API_BASE}/friends`);
    return response.data;
  },
  getIncomingRequests: async () => {
    const response = await apiClient.get(`${API_BASE}/friends/requests/incoming`);
    return response.data;
  },
  getOutgoingRequests: async () => {
    const response = await apiClient.get(`${API_BASE}/friends/requests/outgoing`);
    return response.data;
  }
};

export const socialApi = {
  getRecentOpponents: async () => {
    const response = await apiClient.get(`${API_BASE}/social/recent-opponents`);
    return response.data;
  }
};

export const notificationApi = {
  getNotifications: async () => {
    const response = await apiClient.get(`${API_BASE}/notifications`);
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await apiClient.get(`${API_BASE}/notifications/unread-count`);
    return response.data;
  },
  markAsRead: async (id: string) => {
    const response = await apiClient.post(`${API_BASE}/notifications/${id}/read`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await apiClient.post(`${API_BASE}/notifications/read-all`);
    return response.data;
  }
};

export const reportApi = {
  submitReport: async (data: { reportedId: string, matchId?: string, reason: string, description?: string }) => {
    const response = await apiClient.post(`${API_BASE}/reports/player`, data);
    return response.data;
  },
  getMyReports: async () => {
    const response = await apiClient.get(`${API_BASE}/reports/my`);
    return response.data;
  }
};

export const supportApi = {
  submitTicket: async (data: { subject: string, message: string }) => {
    const response = await apiClient.post(`${API_BASE}/support`, data);
    return response.data;
  },
  getMyTickets: async () => {
    const response = await apiClient.get(`${API_BASE}/support/my`);
    return response.data;
  }
};

export const presenceApi = {
  ping: async () => {
    const response = await apiClient.post(`${API_BASE}/presence/ping`);
    return response.data;
  }
};
