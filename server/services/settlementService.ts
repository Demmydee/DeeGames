import { supabase } from '../config/supabase';
import { RankedParticipant } from '../engines/types';
import { Match } from '../../src/types/multiplayer';

export interface SettlementResult {
  matchId: string;
  payMode: string;
  totalPoolKobo: number;
  houseCutKobo: number;
  netPoolKobo: number;
  payouts: ParticipantPayout[];
  status: 'settled' | 'failed' | 'refunded';
}

export interface ParticipantPayout {
  userId: string;
  rank: number;
  wagerKobo: number;
  payoutKobo: number;
  isWinner: boolean;
  weight?: number;
  defeatReason?: string;
}

export class SettlementService {
  private static HOUSE_CUT_PERCENTAGE = 0.10;

  static async settleMatch(match: Match, rankings: RankedParticipant[]): Promise<SettlementResult> {
    const { pay_mode, amount: wagerAmount } = match.game_request!;
    const wagerKobo = Math.round(wagerAmount * 100); // Convert to kobo
    const totalPlayers = rankings.length;
    const totalPoolKobo = wagerKobo * totalPlayers;

    if (pay_mode === 'free' || wagerKobo === 0) {
      return this.handleFreeSettlement(match, rankings);
    }

    const houseCutKobo = Math.floor(totalPoolKobo * this.HOUSE_CUT_PERCENTAGE);
    const netPoolKobo = totalPoolKobo - houseCutKobo;

    let payouts: ParticipantPayout[] = [];

    if (pay_mode === 'knockout') {
      payouts = this.calculateKnockoutPayouts(rankings, wagerKobo, netPoolKobo);
    } else if (pay_mode === 'split') {
      payouts = this.calculateSplitPayouts(rankings, wagerKobo, netPoolKobo);
    }

    // Integrity Assertion
    const sumPayouts = payouts.reduce((sum, p) => sum + p.payoutKobo, 0);
    if (houseCutKobo + sumPayouts !== totalPoolKobo) {
      console.error(`Settlement Integrity Failure for match ${match.id}: House(${houseCutKobo}) + Payouts(${sumPayouts}) != Total(${totalPoolKobo})`);
      // Adjust remainder to rank 1 if it's a small rounding error, otherwise fail
      const diff = totalPoolKobo - (houseCutKobo + sumPayouts);
      if (Math.abs(diff) < 100) { // If less than 1 naira diff, adjust rank 1
        const rank1 = payouts.find(p => p.rank === 1);
        if (rank1) rank1.payoutKobo += diff;
      } else {
        throw new Error('Settlement integrity check failed: significant discrepancy detected');
      }
    }

    try {
      await this.executeAtomicSettlement(match, rankings, payouts, totalPoolKobo, houseCutKobo, netPoolKobo);
      return {
        matchId: match.id,
        payMode: pay_mode,
        totalPoolKobo,
        houseCutKobo,
        netPoolKobo,
        payouts,
        status: 'settled'
      };
    } catch (error: any) {
      console.error(`Settlement Execution Failure for match ${match.id}:`, error);
      await this.recordFailedSettlement(match.id, error.message);
      throw error;
    }
  }

  static async refundMatch(match: Match, rankings: RankedParticipant[]): Promise<SettlementResult> {
    const wagerKobo = Math.round(match.game_request!.amount * 100);
    
    try {
      const { data, error } = await supabase.rpc('refund_match_wagers_atomic', {
        p_match_id: match.id,
        p_wager_kobo: wagerKobo
      });

      if (error) throw error;

      return {
        matchId: match.id,
        payMode: match.game_request!.pay_mode,
        totalPoolKobo: wagerKobo * rankings.length,
        houseCutKobo: 0,
        netPoolKobo: wagerKobo * rankings.length,
        payouts: rankings.map(r => ({
          userId: r.userId,
          rank: r.rank || 0,
          wagerKobo,
          payoutKobo: wagerKobo,
          isWinner: false
        })),
        status: 'refunded'
      };
    } catch (error: any) {
      console.error(`Refund Failure for match ${match.id}:`, error);
      throw error;
    }
  }

  private static handleFreeSettlement(match: Match, rankings: RankedParticipant[]): SettlementResult {
    return {
      matchId: match.id,
      payMode: 'free',
      totalPoolKobo: 0,
      houseCutKobo: 0,
      netPoolKobo: 0,
      payouts: rankings.map(r => ({
        userId: r.userId,
        rank: r.rank || 0,
        wagerKobo: 0,
        payoutKobo: 0,
        isWinner: r.rank === 1
      })),
      status: 'settled'
    };
  }

  private static calculateKnockoutPayouts(rankings: RankedParticipant[], wagerKobo: number, netPoolKobo: number): ParticipantPayout[] {
    return rankings.map(r => ({
      userId: r.userId,
      rank: r.rank || 0,
      wagerKobo,
      payoutKobo: r.rank === 1 ? netPoolKobo : 0,
      isWinner: r.rank === 1,
      defeatReason: r.defeatReason
    }));
  }

  private static calculateSplitPayouts(rankings: RankedParticipant[], wagerKobo: number, netPoolKobo: number): ParticipantPayout[] {
    const totalPlayers = rankings.length;
    const winnersCount = Math.ceil(totalPlayers / 2);
    
    // Descending triangular weights
    // Rank 1: winnersCount, Rank 2: winnersCount - 1, ... Rank winnersCount: 1
    const weights: Record<number, number> = {};
    let totalWeight = 0;
    for (let i = 1; i <= winnersCount; i++) {
      const weight = winnersCount - i + 1;
      weights[i] = weight;
      totalWeight += weight;
    }

    const payouts = rankings.map(r => {
      const rank = r.rank || 0;
      const isWinner = rank <= winnersCount && r.status === 'active'; // Only active players can win? 
      // Actually, if someone is eliminated but still in top half, do they win?
      // Usually "Split" implies top half of those who finished.
      // But Sudden Drop eliminates. Marathon ranks all.
      // Let's stick to rank.
      
      const weight = weights[rank] || 0;
      let payoutKobo = 0;
      if (weight > 0) {
        payoutKobo = Math.floor((weight / totalWeight) * netPoolKobo);
      }

      return {
        userId: r.userId,
        rank,
        wagerKobo,
        payoutKobo,
        isWinner: payoutKobo > 0,
        weight: weight > 0 ? weight : undefined,
        defeatReason: r.defeatReason
      };
    });

    // Remainder handling to Rank 1
    const sumPayouts = payouts.reduce((sum, p) => sum + p.payoutKobo, 0);
    const remainder = netPoolKobo - sumPayouts;
    const rank1 = payouts.find(p => p.rank === 1);
    if (rank1) {
      rank1.payoutKobo += remainder;
    }

    return payouts;
  }

  private static async executeAtomicSettlement(
    match: Match, 
    rankings: RankedParticipant[], 
    payouts: ParticipantPayout[],
    totalPoolKobo: number,
    houseCutKobo: number,
    netPoolKobo: number
  ) {
    // We'll use a complex RPC to ensure atomicity
    const { error } = await supabase.rpc('settle_match_atomic', {
      p_match_id: match.id,
      p_pay_mode: match.game_request!.pay_mode,
      p_total_pool_kobo: totalPoolKobo,
      p_house_cut_kobo: houseCutKobo,
      p_net_pool_kobo: netPoolKobo,
      p_winners_count: payouts.filter(p => p.isWinner).length,
      p_losers_count: payouts.filter(p => !p.isWinner).length,
      p_rankings: rankings,
      p_payouts: payouts
    });

    if (error) throw error;
  }

  private static async recordFailedSettlement(matchId: string, reason: string) {
    await supabase.from('match_results').insert([{
      match_id: matchId,
      pay_mode: 'unknown',
      settlement_status: 'failed',
      failure_reason: reason
    }]);
  }
}
