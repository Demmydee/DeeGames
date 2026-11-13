import crypto from 'crypto';
import { DiceGameEngine } from '../engines/DiceGameEngine';
import { LudoEngine } from '../engines/LudoEngine';
import { WhotEngine } from '../engines/WhotEngine';
import { GameEngine, GameState, MoveData } from '../engines/types';
import { Match, MatchParticipant } from '../../src/types/multiplayer';

export const BOT_USER_ID = 'bot-opponent-1';
export const BOT_USERNAME = 'DeeBot (AI)';

export type DemoGameType = 'dice' | 'ludo' | 'whot';

interface DemoMatchRecord {
  id: string;
  gameType: DemoGameType;
  variant: string;
  humanUserId: string;
  humanUsername: string;
  state: GameState;
  createdAt: string;
  updatedAt: number;
  finishedAt: string | null;
  winnerUserId: string | null;
  botScheduled: boolean;
  matchSnapshot: Match;
}

const diceEngine = new DiceGameEngine();
const ludoEngine = new LudoEngine();
const whotEngine = new WhotEngine();

const demoMatches = new Map<string, DemoMatchRecord>();

// Clean up abandoned demo matches older than 2 hours
setInterval(() => {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, rec] of demoMatches.entries()) {
    if (rec.updatedAt < cutoff) {
      demoMatches.delete(id);
    }
  }
}, 15 * 60 * 1000);

function getEngine(gameType: DemoGameType): GameEngine {
  if (gameType === 'ludo') return ludoEngine;
  if (gameType === 'whot') return whotEngine;
  return diceEngine;
}

function normalizeGameType(raw: string): DemoGameType {
  const norm = (raw || '').trim().toLowerCase();
  if (norm.includes('chess')) {
    throw new Error('Chess is coming soon and is currently unavailable.');
  }
  if (norm.includes('ludo')) return 'ludo';
  if (norm.includes('whot')) return 'whot';
  if (norm.includes('dice')) return 'dice';
  throw new Error('Unsupported demo game type. Available games: Whot, Ludo, Dice.');
}

function resolveVariant(gameType: DemoGameType, variant?: string): string {
  const v = (variant || '').trim().toLowerCase();
  if (gameType === 'dice') {
    return v === 'marathon' ? 'marathon' : 'sudden_drop';
  }
  if (gameType === 'whot') {
    return v === 'scored' ? 'scored' : 'classic';
  }
  return 'classic';
}

function buildMatchParticipants(matchId: string, humanId: string, humanUsername: string, nowIso: string): MatchParticipant[] {
  return [
    {
      id: `demo-part-${humanId}`,
      match_id: matchId,
      user_id: humanId,
      status: 'active',
      joined_at: nowIso,
      left_at: null,
      users: { username: humanUsername }
    },
    {
      id: `demo-part-${BOT_USER_ID}`,
      match_id: matchId,
      user_id: BOT_USER_ID,
      status: 'active',
      joined_at: nowIso,
      left_at: null,
      users: { username: BOT_USERNAME }
    }
  ];
}

function formatDisplayGameName(gameType: DemoGameType): string {
  if (gameType === 'ludo') return 'Ludo';
  if (gameType === 'whot') return 'Whot';
  return 'Dice';
}

export class DemoBotService {
  static createMatch(user: { id: string; username: string }, rawGameType: string, rawVariant?: string): Match {
    const gameType = normalizeGameType(rawGameType);
    const variant = resolveVariant(gameType, rawVariant);
    const matchId = `demo-${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();

    const participants = buildMatchParticipants(matchId, user.id, user.username || 'Guest', nowIso);

    const matchSnapshot: Match & { is_demo?: boolean } = {
      id: matchId,
      game_request_id: matchId,
      room_category_id: 'demo-room',
      game_type_id: `demo-${gameType}`,
      started_by_user_id: user.id,
      status: 'in_progress',
      started_at: nowIso,
      finished_at: null,
      winner_user_id: null,
      is_demo: true,
      game_type: {
        id: `demo-${gameType}`,
        name: formatDisplayGameName(gameType),
        description: 'Instant Demo Room vs DeeBot AI',
        min_players: 2,
        max_players: 2,
        is_active: true
      },
      room: {
        id: 'demo-room',
        name: 'Instant Demo',
        description: 'Practice vs DeeBot AI',
        min_wager: 0,
        max_wager: 0,
        is_free: true,
        icon_name: 'gamepad',
        sort_order: 0,
        is_active: true
      },
      started_by: { username: user.username || 'Guest' },
      participants,
      game_request: {
        id: matchId,
        room_category_id: 'demo-room',
        game_type_id: `demo-${gameType}`,
        requester_user_id: user.id,
        category: 'duel',
        pay_mode: 'free',
        amount: 0,
        required_players: 2,
        game_variant: variant,
        status: 'started',
        created_at: nowIso
      }
    };

    const engine = getEngine(gameType);
    const config =
      gameType === 'dice'
        ? { variant, diceCount: 1, rounds: 5 }
        : { variant };

    const state = engine.initializeState(matchSnapshot, participants, config);

    const record: DemoMatchRecord = {
      id: matchId,
      gameType,
      variant,
      humanUserId: user.id,
      humanUsername: user.username || 'Guest',
      state,
      createdAt: nowIso,
      updatedAt: Date.now(),
      finishedAt: null,
      winnerUserId: null,
      botScheduled: false,
      matchSnapshot
    };

    demoMatches.set(matchId, record);
    this.scheduleBotTurnIfNeeded(matchId);

    return this.getMatch(matchId, user.id);
  }

  static restartMatch(matchId: string, user: { id: string; username: string }): Match {
    const existing = demoMatches.get(matchId);
    if (!existing) {
      throw new Error('Demo match not found');
    }
    if (existing.humanUserId !== user.id) {
      throw new Error('Unauthorized access to demo match');
    }

    const nowIso = new Date().toISOString();
    const participants = buildMatchParticipants(matchId, user.id, existing.humanUsername, nowIso);
    const engine = getEngine(existing.gameType);
    const config =
      existing.gameType === 'dice'
        ? { variant: existing.variant, diceCount: 1, rounds: 5 }
        : { variant: existing.variant };

    existing.state = engine.initializeState(existing.matchSnapshot, participants, config);
    existing.updatedAt = Date.now();
    existing.finishedAt = null;
    existing.winnerUserId = null;
    existing.botScheduled = false;
    existing.matchSnapshot.status = 'in_progress';
    existing.matchSnapshot.started_at = nowIso;
    existing.matchSnapshot.finished_at = null;
    existing.matchSnapshot.winner_user_id = null;
    existing.matchSnapshot.participants = participants;

    this.scheduleBotTurnIfNeeded(matchId);
    return this.getMatch(matchId, user.id);
  }

  private static getOwnedRecord(matchId: string, userId: string): DemoMatchRecord {
    const rec = demoMatches.get(matchId);
    if (!rec) {
      throw new Error('Demo match not found');
    }
    if (rec.humanUserId !== userId) {
      throw new Error('Unauthorized access to demo match');
    }
    return rec;
  }

  static getMatch(matchId: string, userId: string): Match & { is_demo?: boolean } {
    const rec = this.getOwnedRecord(matchId, userId);
    rec.updatedAt = Date.now();
    const isCompleted = rec.state.status === 'completed';

    return {
      ...rec.matchSnapshot,
      status: isCompleted ? 'finished' : rec.matchSnapshot.status,
      finished_at: rec.finishedAt,
      winner_user_id: rec.winnerUserId
    };
  }

  static getGameState(matchId: string, userId: string) {
    const rec = this.getOwnedRecord(matchId, userId);
    rec.updatedAt = Date.now();
    const engine = getEngine(rec.gameType);
    const state = engine.scrubState ? engine.scrubState(rec.state, userId) : JSON.parse(JSON.stringify(rec.state));

    return {
      id: rec.id,
      match_id: rec.id,
      game_type: rec.gameType,
      game_variant: rec.variant,
      state,
      status: rec.state.status
    };
  }

  static processHumanMove(matchId: string, userId: string, moveData: MoveData) {
    const rec = this.getOwnedRecord(matchId, userId);
    rec.updatedAt = Date.now();

    const engine = getEngine(rec.gameType);
    const { newState, events } = engine.processMove(rec.state, userId, moveData);
    rec.state = newState;

    if (newState.status === 'completed') {
      this.markCompleted(rec);
    } else {
      this.scheduleBotTurnIfNeeded(matchId);
    }

    return {
      state: this.getGameState(matchId, userId),
      events
    };
  }

  static getResult(matchId: string, userId: string) {
    const rec = this.getOwnedRecord(matchId, userId);
    const engine = getEngine(rec.gameType);
    const rankings = engine.getRankings(rec.state).map((r) => ({
      ...r,
      wagerKobo: 0,
      payoutKobo: 0,
      isWinner: r.rank === 1
    }));

    return {
      match_id: rec.id,
      is_demo: true,
      game_type: rec.gameType,
      game_variant: rec.variant,
      pay_mode: 'free',
      settled_at: rec.finishedAt || new Date().toISOString(),
      is_draw: false,
      rankings,
      history: rec.state.history || []
    };
  }

  static leaveMatch(matchId: string, userId: string) {
    const rec = this.getOwnedRecord(matchId, userId);
    if (rec.state.status === 'active') {
      const engine = getEngine(rec.gameType);
      const { newState } = engine.handlePlayerDefeat(rec.state, userId, 'left');
      rec.state = newState;
      this.markCompleted(rec);
    }
    demoMatches.delete(matchId);
    return { success: true };
  }

  private static markCompleted(rec: DemoMatchRecord) {
    rec.finishedAt = rec.finishedAt || new Date().toISOString();
    rec.matchSnapshot.status = 'finished';
    rec.matchSnapshot.finished_at = rec.finishedAt;
    const winner = rec.state.participants?.find((p: any) => p.rank === 1);
    rec.winnerUserId = winner?.userId || null;
    rec.matchSnapshot.winner_user_id = rec.winnerUserId;
  }

  private static isBotTurn(rec: DemoMatchRecord): boolean {
    if (rec.state.status !== 'active') return false;
    if (rec.gameType === 'whot' && Array.isArray(rec.state.generalMarketPending) && rec.state.generalMarketPending.includes(BOT_USER_ID)) {
      return true;
    }
    return rec.state.currentTurnPlayerId === BOT_USER_ID;
  }

  private static scheduleBotTurnIfNeeded(matchId: string) {
    const rec = demoMatches.get(matchId);
    if (!rec || rec.botScheduled || !this.isBotTurn(rec)) return;

    rec.botScheduled = true;
    const delayMs = rec.gameType === 'ludo' && rec.state.waitingForTokenMove ? 650 : 750;

    setTimeout(() => {
      const current = demoMatches.get(matchId);
      if (!current) return;
      current.botScheduled = false;

      if (!this.isBotTurn(current)) return;

      try {
        const move = this.chooseBotMove(current);
        if (!move) return;

        const engine = getEngine(current.gameType);
        const { newState } = engine.processMove(current.state, BOT_USER_ID, move);
        current.state = newState;
        current.updatedAt = Date.now();

        if (newState.status === 'completed') {
          this.markCompleted(current);
        } else {
          // If it's still the bot's turn (e.g. Ludo rolled die -> move token, rolled 6, captured, or Whot Hold On 8), chain the next move
          this.scheduleBotTurnIfNeeded(matchId);
        }
      } catch (err) {
        console.error(`DemoBotService move error in ${matchId}:`, err);
      }
    }, delayMs);
  }

  private static chooseBotMove(rec: DemoMatchRecord): MoveData | null {
    const state = rec.state;

    if (rec.gameType === 'dice') {
      if (state.tieBreaker && state.tieBreaker.playerIds?.includes(BOT_USER_ID)) {
        return {
          type: state.variant === 'sudden_drop' ? 'tie_reroll' : 'sudden_death_roll'
        };
      }
      return { type: 'roll' };
    }

    if (rec.gameType === 'ludo') {
      if (!state.waitingForTokenMove) {
        return { type: 'roll_die' };
      }

      const botParticipant = state.participants.find((p: any) => p.userId === BOT_USER_ID);
      if (!botParticipant || !state.dieValue) return { type: 'skip_turn' };

      const roll: number = state.dieValue;
      const tokens: number[] = botParticipant.tokens || [];
      const validIndices = tokens
        .map((pos, idx) => {
          if (pos === -1) return roll === 6 ? idx : -1;
          if (pos >= 56) return -1;
          return pos + roll <= 56 ? idx : -1;
        })
        .filter((idx) => idx !== -1);

      if (validIndices.length === 0) {
        return { type: 'skip_turn' };
      }

      const starts: Record<string, number> = { red: 0, green: 13, yellow: 26, blue: 39 };
      const safeSquares = [0, 8, 13, 21, 26, 34, 39, 47];
      const botStart = starts[botParticipant.color] ?? 26;
      const humanParticipant = state.participants.find((p: any) => p.userId !== BOT_USER_ID);
      const humanStart = starts[humanParticipant?.color] ?? 0;

      // Score candidate token moves: goal > capture opponent > leave home base > home path > furthest progress
      let bestIdx = validIndices[0];
      let bestScore = -999;

      for (const idx of validIndices) {
        const pos = tokens[idx];
        const newPos = pos === -1 ? 0 : pos + roll;
        let score = newPos;

        if (newPos === 56) score += 500;
        if (pos === -1) score += 120;
        if (newPos >= 51 && pos < 51) score += 150;

        if (newPos >= 0 && newPos <= 50 && humanParticipant) {
          const realBotPos = (botStart + newPos) % 52;
          const isSafe = safeSquares.includes(realBotPos) && !(realBotPos === botStart && newPos === 0);
          if (!isSafe) {
            const canCapture = (humanParticipant.tokens || []).some((hPos: number) => {
              if (hPos < 0 || hPos > 50) return false;
              return (humanStart + hPos) % 52 === realBotPos;
            });
            if (canCapture) score += 400;
          }
          if (safeSquares.includes(realBotPos)) score += 40;
        }

        if (score > bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      }

      return { type: 'move_token', tokenIndex: bestIdx };
    }

    if (rec.gameType === 'whot') {
      const hand: Array<{ id: string; suit: string; value: number }> = state.hands?.[BOT_USER_ID] || [];

      // General Market response
      if (Array.isArray(state.generalMarketPending) && state.generalMarketPending.includes(BOT_USER_ID)) {
        const counter = hand.find((c) => c.value === 14);
        if (counter) {
          return { type: 'play_card', cardId: counter.id };
        }
        return { type: 'pick_card' };
      }

      const topCard = state.discardPile[state.discardPile.length - 1];
      const playable = hand.filter((card) => {
        // Whot 20 cannot be played as the last card
        if (card.value === 20 && hand.length === 1) return false;
        if (card.value === 20) return true;

        if (state.pendingPenalty) {
          if (state.pendingPenalty.type === 'pick2') return card.value === 2;
          if (state.pendingPenalty.type === 'pick3') return card.value === 3;
          if (state.pendingPenalty.type === 'suspension') return card.value === 8;
        }

        if (state.calledSuit) {
          return card.suit === state.calledSuit || card.value === topCard.value;
        }

        return card.suit === topCard.suit || card.value === topCard.value;
      });

      if (playable.length === 0) {
        return { type: 'pick_card' };
      }

      // Prefer non-Whot cards first so bot keeps wildcards as backup, or special action cards when helpful
      const sorted = [...playable].sort((a, b) => {
        if (a.value === 20 && b.value !== 20) return 1;
        if (a.value !== 20 && b.value === 20) return -1;
        return b.value - a.value;
      });

      const chosen = sorted[0];
      if (chosen.value === 20 || chosen.value === 1) {
        // Pick the suit the bot holds the most of (excluding the played card)
        const remaining = hand.filter((c) => c.id !== chosen.id && c.suit !== 'whot');
        const counts: Record<string, number> = {};
        for (const c of remaining) {
          counts[c.suit] = (counts[c.suit] || 0) + 1;
        }
        const suits = ['circle', 'triangle', 'cross', 'square', 'star'];
        suits.sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
        return {
          type: 'play_card',
          cardId: chosen.id,
          calledSuit: suits[0] || 'circle'
        };
      }

      return { type: 'play_card', cardId: chosen.id };
    }

    return null;
  }
}
