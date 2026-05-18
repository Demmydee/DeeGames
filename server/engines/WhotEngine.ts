import { 
  GameEngine, 
  GameState, 
  GameConfig, 
  MoveData, 
  GameStateUpdateResult, 
  EndConditionResult, 
  RankedParticipant 
} from './types';
import { Match, MatchParticipant } from '../../src/types/multiplayer';
import crypto from 'crypto';

type Suit = 'circle' | 'triangle' | 'cross' | 'square' | 'star';
type CardValue = 1 | 2 | 3 | 4 | 5 | 7 | 8 | 14 | 20;

interface Card {
  id: string;
  suit: Suit | 'whot';
  value: CardValue;
}

export class WhotEngine implements GameEngine {
  private static readonly SUITS: Suit[] = ['circle', 'triangle', 'cross', 'square', 'star'];
  private static readonly VALUES: CardValue[] = [1, 2, 3, 4, 5, 7, 8, 14];

  initializeState(
    match: Match,
    participants: MatchParticipant[],
    config: GameConfig
  ): GameState {
    const deck = this.createDeck();
    this.shuffleDeck(deck);

    const hands: Record<string, Card[]> = {};
    const whotParticipants = participants.map(p => {
      const hand = deck.splice(0, 5);
      hands[p.user_id] = hand;
      return {
        userId: p.user_id,
        username: p.users?.username || 'Unknown',
        status: 'active' as const,
        score: 0,
        handCount: 5
      };
    });

    // Initial discard pile
    let topCard = deck.pop()!;
    while (topCard.value === 20) {
      deck.unshift(topCard);
      this.shuffleDeck(deck);
      topCard = deck.pop()!;
    }

    const activePlayerIds = whotParticipants.map(p => p.userId);

    return {
      variant: config.variant || 'classic',
      status: 'active',
      activePlayerIds,
      participants: whotParticipants as any,
      currentTurnPlayerId: activePlayerIds[0],
      turnStartedAt: Date.now(),
      turnTimeLimitSeconds: 15,
      deck,
      discardPile: [topCard],
      hands,
      calledSuit: null,
      pendingPenalty: null, // { type: 'pick2' | 'pick3' | 'suspension', amount: number }
      generalMarketPending: null, // string[] - players who need to pick/counter
      lastEvent: null,
      history: [],
      config
    };
  }

  processMove(
    currentState: GameState,
    userId: string,
    moveData: MoveData
  ): GameStateUpdateResult {
    if (currentState.status !== 'active') throw new Error('Game is not active');
    if (currentState.currentTurnPlayerId !== userId && currentState.generalMarketPending?.indexOf(userId) === -1) {
       throw new Error("Not your turn");
    }

    const newState = JSON.parse(JSON.stringify(currentState)) as GameState;
    const events: any[] = [];
    
    // Handle General Market resolution if active
    if (newState.generalMarketPending) {
      return this.handleGeneralMarketResponse(newState, userId, moveData);
    }

    if (moveData.type === 'pick_card') {
      return this.handlePickCard(newState, userId);
    }

    if (moveData.type === 'play_card') {
      return this.handlePlayCard(newState, userId, moveData);
    }
    
    if (moveData.type === 'auto_pick') {
       return this.handlePickCard(newState, userId, true);
    }

    return { newState, events };
  }

  private handlePickCard(state: GameState, userId: string, isAuto = false): GameStateUpdateResult {
    const events: any[] = [];
    
    // If there is a pending penalty (Pick 2/3), apply it
    if (state.pendingPenalty && (state.pendingPenalty.type === 'pick2' || state.pendingPenalty.type === 'pick3')) {
      const amount = state.pendingPenalty.amount;
      for (let i = 0; i < amount; i++) {
        this.drawCardToHand(state, userId);
      }
      state.pendingPenalty = null;
      state.lastEvent = {
        type: 'penalty_applied',
        player: userId,
        amount,
        announcement: `Pick ${amount}!`
      };
    } else {
      // Normal pick
      this.drawCardToHand(state, userId);
      state.lastEvent = {
        type: 'pick_card',
        player: userId,
        isAuto
      };
    }

    this.advanceTurn(state);
    return { newState: state, events };
  }

  private handlePlayCard(state: GameState, userId: string, moveData: MoveData): GameStateUpdateResult {
    const events: any[] = [];
    const cardId = moveData.cardId;
    const hand = state.hands[userId] as Card[];
    const cardIndex = hand.findIndex(c => c.id === cardId);
    
    if (cardIndex === -1) throw new Error("Card not in hand");
    const card = hand[cardIndex];

    if (!this.isValidPlay(card, state)) {
      throw new Error("Invalid play");
    }

    // "Whot 20 cannot end game" rule
    if (card.value === 20 && hand.length === 1) {
       throw new Error("Whot 20 cannot be your last card");
    }

    // Remove from hand
    hand.splice(cardIndex, 1);
    state.discardPile.push(card);
    state.participants.find((p: any) => p.userId === userId).handCount = hand.length;

    // Apply special effects
    this.applySpecialEffect(card, state, moveData);

    // Check last card announcement
    if (hand.length === 1) {
      state.lastEvent = {
        ...state.lastEvent,
        announcement: (state.lastEvent?.announcement ? state.lastEvent.announcement + " " : "") + "Last Card!"
      };
    }

    // Check win condition
    if (hand.length === 0) {
      return this.handleWin(state, userId);
    }

    // Advance turn if not suspended or waiting for stack
    if (!state.generalMarketPending && (!state.pendingPenalty || state.pendingPenalty.type !== 'suspension')) {
       // If Pick 2/3 was played, the next player must either stack or pick.
       // The turn *is* advanced to them.
       this.advanceTurn(state);
    }

    return { newState: state, events };
  }

  private applySpecialEffect(card: Card, state: GameState, moveData: MoveData) {
    state.calledSuit = null; // Clear previous called suit
    
    let announcement = "";

    switch (card.value) {
      case 1: // Check Here
        state.calledSuit = moveData.calledSuit;
        announcement = `Check Here! I need ${this.capitalize(moveData.calledSuit)}!`;
        break;
      case 2: // Pick 2
        if (state.pendingPenalty?.type === 'pick2') {
          state.pendingPenalty.amount += 2;
        } else {
          state.pendingPenalty = { type: 'pick2', amount: 2 };
        }
        announcement = "Pick Two!";
        break;
      case 3: // Pick 3
        if (state.pendingPenalty?.type === 'pick3') {
          state.pendingPenalty.amount += 3;
        } else {
          state.pendingPenalty = { type: 'pick3', amount: 3 };
        }
        announcement = "Pick Three!";
        break;
      case 8: // Hold On
        // In simple version, just skip next. In stacking version, add to suspension count.
        if (state.pendingPenalty?.type === 'suspension') {
           state.pendingPenalty.amount += 1;
        } else {
           state.pendingPenalty = { type: 'suspension', amount: 1 };
        }
        announcement = "Hold On!";
        break;
      case 14: // General Market
        state.generalMarketPending = state.activePlayerIds.filter(id => id !== state.currentTurnPlayerId);
        announcement = "General Market!";
        break;
      case 20: // Whot
        state.calledSuit = moveData.calledSuit;
        announcement = `I need ${this.capitalize(moveData.calledSuit)}!`;
        break;
    }

    state.lastEvent = {
       type: 'play_card',
       player: state.currentTurnPlayerId,
       card,
       announcement
    };
  }

  private handleGeneralMarketResponse(state: GameState, userId: string, moveData: MoveData): GameStateUpdateResult {
     const index = state.generalMarketPending!.indexOf(userId);
     if (index === -1) throw new Error("Not requested for general market");

     if (moveData.type === 'play_card') {
        const cardId = moveData.cardId;
        const hand = state.hands[userId] as Card[];
        const card = hand.find(c => c.id === cardId);
        if (card?.value === 14) {
           // Countered
           hand.splice(hand.indexOf(card), 1);
           state.discardPile.push(card);
           state.participants.find((p: any) => p.userId === userId).handCount = hand.length;
           state.generalMarketPending!.splice(index, 1);
        } else {
           throw new Error("Can only play 14 to counter General Market");
        }
     } else if (moveData.type === 'pick_card' || moveData.type === 'auto_pick') {
        this.drawCardToHand(state, userId);
        state.generalMarketPending!.splice(index, 1);
     }

     if (state.generalMarketPending!.length === 0) {
        state.generalMarketPending = null;
        this.advanceTurn(state);
     }

     return { newState: state, events: [] };
  }

  private handleWin(state: GameState, userId: string): GameStateUpdateResult {
    const variant = state.variant;
    const winner = state.participants.find((p: any) => p.userId === userId);
    
    if (variant === 'classic') {
       // Classic Whot: winner finishes, others continue until only 1 left
       winner.status = 'active';
       winner.rank = state.participants.filter((p: any) => p.rank).length + 1;
       state.activePlayerIds = state.activePlayerIds.filter(id => id !== userId);
       
       if (state.activePlayerIds.length <= 1) {
          if (state.activePlayerIds.length === 1) {
             const last = state.participants.find((p: any) => p.userId === state.activePlayerIds[0]);
             last!.rank = state.participants.length;
             last!.status = 'defeated';
          }
          state.status = 'completed';
       } else {
          this.advanceTurn(state);
       }
    } else {
       // Scored Whot: game ends immediately when first player finishes
       winner.rank = 1;
       state.status = 'completed';
       
       // Rank others by hand score
       const others = state.participants.filter((p: any) => p.userId !== userId);
       const scoredOthers = others.map((p: any) => ({
          userId: p.userId,
          score: this.calculateHandScore(state.hands[p.userId])
       })).sort((a, b) => a.score - b.score);

       scoredOthers.forEach((s, idx) => {
          const p = state.participants.find((p: any) => p.userId === s.userId);
          p.rank = idx + 2;
          p.tallyScore = s.score;
       });
       
       // Handle ties for Scored (simplified for now: user asked for picking cards, but usually we just rank them)
       // TO-DO: Implement tie-breaker draw if requested strictly as automated.
    }

    state.lastEvent = {
       type: 'game_won',
       player: userId,
       announcement: `${winner.username} wins!`
    };

    return { newState: state, events: [] };
  }

  private calculateHandScore(hand: Card[]): number {
    return hand.reduce((sum, card) => {
      if (card.suit === 'star') return sum + (card.value * 2);
      return sum + card.value;
    }, 0);
  }

  private isValidPlay(card: Card, state: GameState): boolean {
    const topCard = state.discardPile[state.discardPile.length - 1];
    
    // Whot 20 is always playable
    if (card.value === 20) return true;

    // If there's a pending penalty, can only play to stack
    if (state.pendingPenalty) {
       if (state.pendingPenalty.type === 'pick2') return card.value === 2;
       if (state.pendingPenalty.type === 'pick3') return card.value === 3;
       if (state.pendingPenalty.type === 'suspension') return card.value === 8;
    }

    // If called suit is active
    if (state.calledSuit) {
       return card.suit === state.calledSuit || card.value === topCard.value;
    }

    // Normal play
    return card.suit === topCard.suit || card.value === topCard.value;
  }

  private drawCardToHand(state: GameState, userId: string): Card {
    if (state.deck.length === 0) {
      this.reshuffleDiscard(state);
    }
    const card = state.deck.pop()!;
    state.hands[userId].push(card);
    state.participants.find((p: any) => p.userId === userId).handCount = state.hands[userId].length;
    return card;
  }

  private reshuffleDiscard(state: GameState) {
    const topCard = state.discardPile.pop()!;
    const newDeck = [...state.discardPile];
    state.discardPile = [topCard];
    this.shuffleDeck(newDeck);
    state.deck = newDeck;
  }

  private advanceTurn(state: GameState) {
    if (state.status !== 'active') return;

    // Handle suspension
    if (state.pendingPenalty?.type === 'suspension') {
       const amount = state.pendingPenalty.amount;
       for (let i = 0; i < amount; i++) {
          this.moveTurnPointer(state);
       }
       state.pendingPenalty = null;
    }
    
    this.moveTurnPointer(state);
    state.turnStartedAt = Date.now();
  }

  private moveTurnPointer(state: GameState) {
    const currentIndex = state.activePlayerIds.indexOf(state.currentTurnPlayerId!);
    state.currentTurnPlayerId = state.activePlayerIds[(currentIndex + 1) % state.activePlayerIds.length];
  }

  private capitalize(s: string): string {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private createDeck(): Card[] {
    const deck: Card[] = [];
    WhotEngine.SUITS.forEach(suit => {
      WhotEngine.VALUES.forEach(value => {
        deck.push({ id: `${suit}_${value}`, suit, value });
      });
    });
    for (let i = 1; i <= 4; i++) {
      deck.push({ id: `whot_20_${i}`, suit: 'whot', value: 20 });
    }
    return deck;
  }

  private shuffleDeck(deck: Card[]) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  handlePlayerDefeat(
    currentState: GameState,
    userId: string,
    reason: 'left' | 'disconnected' | 'time_forfeit'
  ): GameStateUpdateResult {
     const newState = JSON.parse(JSON.stringify(currentState)) as GameState;
     const p = newState.participants.find((p: any) => p.userId === userId);
     if (!p || p.status !== 'active') return { newState, events: [] };

     p.status = reason === 'left' ? 'left' : 'disconnected';
     p.defeatReason = reason;

     if (reason === 'left') {
        // Remove from rotation and put cards back if needed (or just delete them)
        newState.activePlayerIds = newState.activePlayerIds.filter(id => id !== userId);
        delete newState.hands[userId];
        
        if (newState.currentTurnPlayerId === userId) {
           this.advanceTurn(newState);
        }
     }
     
     if (newState.activePlayerIds.length <= 1) {
        this.handleWin(newState, newState.activePlayerIds[0]);
     }

     return { newState, events: [] };
  }

  detectEndCondition(currentState: GameState): EndConditionResult | null {
    if (currentState.status !== 'completed') return null;
    const winner = currentState.participants.find((p: any) => p.rank === 1);
    return {
      isOver: true,
      winnerId: winner?.userId || null,
      rankings: this.getRankings(currentState)
    };
  }

  getRankings(currentState: GameState): RankedParticipant[] {
    return [...currentState.participants].sort((a: any, b: any) => (a.rank || 99) - (b.rank || 99));
  }

  scrubState(state: GameState, userId: string): GameState {
    const scrubbed = JSON.parse(JSON.stringify(state));
    
    // Privacy: Only show requesting user's hand
    scrubbed.privateHand = scrubbed.hands[userId] || [];
    delete scrubbed.hands; // Remove all hands from the state
    delete scrubbed.deck;  // Remove deck from the state

    return scrubbed;
  }
}
