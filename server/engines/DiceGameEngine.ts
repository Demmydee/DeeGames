import { 
  GameEngine, 
  GameState, 
  GameConfig, 
  MoveData, 
  GameStateUpdateResult, 
  EndConditionResult, 
  RankedParticipant,
  RoundResult
} from './types';
import { Match, MatchParticipant } from '../../src/types/multiplayer';

export class DiceGameEngine implements GameEngine {
  
  initializeState(
    match: Match,
    participants: MatchParticipant[],
    config: GameConfig
  ): GameState {
    const activePlayerIds = participants.map(p => p.user_id);
    const totalRounds = config.variant === 'sudden_drop' 
      ? activePlayerIds.length - 1 
      : (config.rounds || 5);

    return {
      variant: config.variant,
      status: 'active',
      currentRound: 1,
      totalRounds,
      activePlayerIds,
      participants: participants.map(p => ({
        userId: p.user_id,
        username: p.users?.username || 'Unknown',
        score: 0,
        status: 'active'
      })),
      rolls: {},
      history: [],
      config
    };
  }

  processMove(
    currentState: GameState,
    userId: string,
    moveData: MoveData
  ): GameStateUpdateResult {
    if (currentState.status !== 'active') {
      throw new Error('Game is not active');
    }

    if (!currentState.activePlayerIds.includes(userId)) {
      throw new Error('Player is not active in this game');
    }

    const newState = JSON.parse(JSON.stringify(currentState)) as GameState;
    const events: any[] = [];

    if (moveData.type === 'roll') {
      if (newState.rolls[userId] !== undefined && newState.rolls[userId] !== null) {
        throw new Error('Player has already rolled this round');
      }

      // Generate roll server-side
      const roll = this.generateRoll(newState.config.diceCount);
      newState.rolls[userId] = roll;
      events.push({ type: 'player_rolled', payload: { userId, roll } });

      // Check if all active players have rolled
      const allRolled = newState.activePlayerIds.every(id => newState.rolls[id] !== undefined && newState.rolls[id] !== null);
      
      if (allRolled) {
        this.resolveRound(newState, events);
      }
    } else if (moveData.type === 'tie_reroll') {
      if (!newState.tieBreaker || !newState.tieBreaker.playerIds.includes(userId)) {
        throw new Error('Player is not in a tie-breaker');
      }

      if (newState.tieBreaker.rolls[userId] !== undefined && newState.tieBreaker.rolls[userId] !== null) {
        throw new Error('Player has already re-rolled');
      }

      const roll = this.generateRoll(newState.config.diceCount);
      newState.tieBreaker.rolls[userId] = roll;
      events.push({ type: 'player_tie_rolled', payload: { userId, roll } });

      const allReRolled = newState.tieBreaker.playerIds.every(id => newState.tieBreaker!.rolls[id] !== undefined && newState.tieBreaker!.rolls[id] !== null);
      
      if (allReRolled) {
        this.resolveTieBreaker(newState, events);
      }
    } else if (moveData.type === 'sudden_death_roll') {
      // Similar to tie_reroll but for Marathon end ties
      if (!newState.tieBreaker || !newState.tieBreaker.playerIds.includes(userId)) {
        throw new Error('Player is not in sudden death');
      }

      const roll = this.generateRoll(newState.config.diceCount);
      newState.tieBreaker.rolls[userId] = roll;
      events.push({ type: 'player_sudden_death_rolled', payload: { userId, roll } });

      const allRolled = newState.tieBreaker.playerIds.every(id => newState.tieBreaker!.rolls[id] !== undefined && newState.tieBreaker!.rolls[id] !== null);
      
      if (allRolled) {
        this.resolveSuddenDeath(newState, events);
      }
    }

    return { newState, events };
  }

  handlePlayerDefeat(
    currentState: GameState,
    userId: string,
    reason: 'left' | 'disconnected'
  ): GameStateUpdateResult {
    const newState = JSON.parse(JSON.stringify(currentState)) as GameState;
    const events: any[] = [];

    const participant = newState.participants.find(p => p.userId === userId);
    if (!participant || participant.status !== 'active') {
      return { newState, events };
    }

    participant.status = reason === 'left' ? 'left' : 'disconnected';
    participant.defeatReason = reason;
    
    // Remove from active players
    newState.activePlayerIds = newState.activePlayerIds.filter(id => id !== userId);

    // Assign rank
    const currentRank = this.getNextAvailableLowestRank(newState);
    participant.rank = currentRank;

    events.push({ type: 'player_defeated', payload: { userId, reason, rank: currentRank } });

    // If only one player remains, they win
    if (newState.activePlayerIds.length <= 1) {
      this.finalizeGame(newState, events);
    } else {
      // Check if we were waiting for this player to roll
      const allOthersRolled = newState.activePlayerIds.every(id => newState.rolls[id] !== undefined && newState.rolls[id] !== null);
      if (allOthersRolled && Object.keys(newState.rolls).length > 0) {
        this.resolveRound(newState, events);
      }
      
      // Check tie-breaker
      if (newState.tieBreaker && newState.tieBreaker.playerIds.includes(userId)) {
        newState.tieBreaker.playerIds = newState.tieBreaker.playerIds.filter(id => id !== userId);
        if (newState.tieBreaker.playerIds.length <= 1) {
          this.resolveTieBreaker(newState, events);
        }
      }
    }

    return { newState, events };
  }

  detectEndCondition(currentState: GameState): EndConditionResult | null {
    if (currentState.status !== 'completed') return null;

    const winner = currentState.participants.find(p => p.rank === 1);
    return {
      winnerId: winner ? winner.userId : null,
      rankings: this.getRankings(currentState)
    };
  }

  getRankings(currentState: GameState): RankedParticipant[] {
    return [...currentState.participants].sort((a, b) => (a.rank || 99) - (b.rank || 99));
  }

  private generateRoll(diceCount: number): number {
    let total = 0;
    for (let i = 0; i < diceCount; i++) {
      total += Math.floor(Math.random() * 6) + 1;
    }
    return total;
  }

  private resolveRound(state: GameState, events: any[]) {
    if (state.variant === 'sudden_drop') {
      this.resolveSuddenDropRound(state, events);
    } else {
      this.resolveMarathonRound(state, events);
    }
  }

  private resolveSuddenDropRound(state: GameState, events: any[]) {
    const rolls = state.activePlayerIds.map(id => ({ id, roll: state.rolls[id]! }));
    const minRoll = Math.min(...rolls.map(r => r.roll));
    const lowestRollers = rolls.filter(r => r.roll === minRoll);

    if (lowestRollers.length > 1) {
      // Tie for lowest
      state.tieBreaker = {
        playerIds: lowestRollers.map(r => r.id),
        rolls: {}
      };
      events.push({ type: 'round_tie', payload: { playerIds: state.tieBreaker.playerIds } });
    } else {
      // Single lowest roller eliminated
      const eliminatedId = lowestRollers[0].id;
      this.eliminatePlayer(state, eliminatedId, events);
      
      // Advance round if not finished
      if (state.activePlayerIds.length > 1) {
        state.currentRound++;
        state.rolls = {};
        events.push({ type: 'round_started', payload: { round: state.currentRound } });
      } else {
        this.finalizeGame(state, events);
      }
    }
  }

  private resolveTieBreaker(state: GameState, events: any[]) {
    if (!state.tieBreaker) return;

    const rolls = state.tieBreaker.playerIds.map(id => ({ id, roll: state.tieBreaker!.rolls[id]! }));
    
    if (rolls.length === 0) {
        state.tieBreaker = undefined;
        return;
    }

    const minRoll = Math.min(...rolls.map(r => r.roll));
    const lowestRollers = rolls.filter(r => r.roll === minRoll);

    if (lowestRollers.length > 1 && state.tieBreaker.playerIds.length > 1) {
      // Still tied
      state.tieBreaker.rolls = {};
      events.push({ type: 'tie_still_active', payload: { playerIds: lowestRollers.map(r => r.id) } });
    } else {
      // Tie broken
      const eliminatedId = lowestRollers[0].id;
      state.tieBreaker = undefined;
      this.eliminatePlayer(state, eliminatedId, events);

      if (state.activePlayerIds.length > 1) {
        state.currentRound++;
        state.rolls = {};
        events.push({ type: 'round_started', payload: { round: state.currentRound } });
      } else {
        this.finalizeGame(state, events);
      }
    }
  }

  private eliminatePlayer(state: GameState, userId: string, events: any[]) {
    const participant = state.participants.find(p => p.userId === userId);
    if (participant) {
      participant.status = 'eliminated';
      participant.defeatReason = 'eliminated';
      participant.eliminatedRound = state.currentRound;
      
      const rank = this.getNextAvailableLowestRank(state);
      participant.rank = rank;
      
      state.activePlayerIds = state.activePlayerIds.filter(id => id !== userId);
      events.push({ type: 'player_eliminated', payload: { userId, rank } });
    }
  }

  private resolveMarathonRound(state: GameState, events: any[]) {
    // Add rolls to cumulative scores
    state.activePlayerIds.forEach(id => {
      const participant = state.participants.find(p => p.userId === id);
      if (participant) {
        participant.score += state.rolls[id]!;
      }
    });

    state.history.push({
      round: state.currentRound,
      rolls: { ...state.rolls } as Record<string, number>
    });

    if (state.currentRound < state.totalRounds) {
      state.currentRound++;
      state.rolls = {};
      events.push({ type: 'round_started', payload: { round: state.currentRound } });
    } else {
      // Check for ties at the end of Marathon
      this.checkMarathonEndTies(state, events);
    }
  }

  private checkMarathonEndTies(state: GameState, events: any[]) {
    const sortedParticipants = [...state.participants]
      .filter(p => p.status === 'active')
      .sort((a, b) => b.score - a.score);

    const maxScore = sortedParticipants[0].score;
    const topScorers = sortedParticipants.filter(p => p.score === maxScore);

    if (topScorers.length > 1) {
      // Tie for 1st place
      state.tieBreaker = {
        playerIds: topScorers.map(p => p.userId),
        rolls: {}
      };
      events.push({ type: 'sudden_death_started', payload: { playerIds: state.tieBreaker.playerIds } });
    } else {
      this.finalizeGame(state, events);
    }
  }

  private resolveSuddenDeath(state: GameState, events: any[]) {
    if (!state.tieBreaker) return;

    const rolls = state.tieBreaker.playerIds.map(id => ({ id, roll: state.tieBreaker!.rolls[id]! }));
    const maxRoll = Math.max(...rolls.map(r => r.roll));
    const winners = rolls.filter(r => r.roll === maxRoll);

    if (winners.length > 1) {
      // Still tied in sudden death
      state.tieBreaker.rolls = {};
      events.push({ type: 'sudden_death_still_active', payload: { playerIds: winners.map(r => r.id) } });
    } else {
      // Sudden death winner found
      const winnerId = winners[0].id;
      // Adjust score slightly to break tie for ranking logic
      const winner = state.participants.find(p => p.userId === winnerId);
      if (winner) winner.score += 0.1; 
      
      state.tieBreaker = undefined;
      this.finalizeGame(state, events);
    }
  }

  private finalizeGame(state: GameState, events: any[]) {
    state.status = 'completed';
    
    // Rank remaining active players
    const activeParticipants = state.participants
      .filter(p => p.status === 'active')
      .sort((a, b) => b.score - a.score);

    activeParticipants.forEach((p, index) => {
      p.rank = index + 1;
    });

    // Ensure all participants have a rank
    const unranked = state.participants.filter(p => !p.rank);
    // Sort unranked by status/score/time if needed, but they should already have ranks from defeat
    
    events.push({ type: 'game_completed', payload: { rankings: this.getRankings(state) } });
  }

  private getNextAvailableLowestRank(state: GameState): number {
    const totalPlayers = state.participants.length;
    const rankedCount = state.participants.filter(p => !!p.rank).length;
    return totalPlayers - rankedCount;
  }
}
