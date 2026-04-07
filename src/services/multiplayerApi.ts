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
