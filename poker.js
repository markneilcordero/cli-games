const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 🃏 Card Deck Setup
const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
let deck = [];

// 🃏 Shuffle Deck Function
function shuffleDeck() {
  deck = [];
  for (let suit of suits) {
    for (let rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  deck.sort(() => Math.random() - 0.5);
}

// 🏆 Hand Ranking Logic
function getHandValue(cards) {
  const values = cards.map(card => ranks.indexOf(card.rank) + 2);
  values.sort((a, b) => b - a);
  return values[0]; // Simplified: Higher value wins
}

// 🃏 Advanced Hand Ranking System
function getHandRank(cards) {
    let values = cards.map(card => card.rank);
    let counts = {};
    
    values.forEach(val => counts[val] = (counts[val] || 0) + 1);
    let pairs = Object.values(counts).filter(c => c === 2).length;
    let threeOfKind = Object.values(counts).filter(c => c === 3).length;
    
    if (threeOfKind && pairs) return "Full House";
    if (threeOfKind) return "Three of a Kind";
    if (pairs === 2) return "Two Pair";
    if (pairs === 1) return "One Pair";
    return "High Card";
}

// 🎲 AI Decision Logic
function aiDecision(aiHand, communityCards, currentBet) {
    if (aiBank <= 0) {
        console.log("AI has no chips left and folds! 🤷");
        return { action: "Fold", amount: 0 };
    }
    
    let aiHandStrength = getHandValue([...aiHand, ...communityCards]);
  
    if (aiHandStrength >= 12) {
      console.log("AI plays aggressively! 🔥");
      return { action: "Raise", amount: Math.min(currentBet * 2, aiBank) };
    } else if (aiHandStrength >= 7) {
      console.log("AI Calls.");
      return { action: "Call", amount: Math.min(currentBet, aiBank) };
    } else {
      console.log("AI folds! 🤷");
      return { action: "Fold", amount: 0 };
    }
}

// 🎲 Betting System
let playerBank = 1000, aiBank = 1000, pot = 0, bet = 20;

// 🃏 Deal Cards
function dealCards() {
  return [deck.pop(), deck.pop()];
}

// 🔄 Reset Game for Next Round
function resetGame() {
    console.log("\n🔄 Starting new round...");

    // 🛑 Check if any player is out of money
    if (playerBank <= 0) {
        console.log("\n💀 You ran out of chips! AI wins the game.");
        return rl.close();
    } else if (aiBank <= 0) {
        console.log("\n🎉 AI is out of chips! You win the game!");
        return rl.close();
    }

    // 🔄 Reset the pot before the next round
    pot = 0;

    setTimeout(playPoker, 2000);
}

// 🎲 Betting Round Function with AI Logic
function bettingRound(playerHand, aiHand, communityCards, phase) {
    return new Promise(resolve => {
        console.log(`\n🃏 ${phase}: Community Cards: ${communityCards.map(c => `[${c.rank}${c.suit}]`).join(" ")}`);
        console.log(`Your Hand: [${playerHand[0].rank}${playerHand[0].suit}] [${playerHand[1].rank}${playerHand[1].suit}]`);
        console.log(`Current Pot: 💰 ${pot} chips`);
  
        if (phase === "Pre-Flop") console.log("AI is thinking...");
  
        setTimeout(() => {
            let aiMove = aiDecision(aiHand, communityCards, bet);
        
            if (aiMove.action === "Fold") {
                console.log("\nAI folded! 🎉 You win the round.");
                playerBank += pot;
                return resolve(false);
            }
  
            let aiBet = aiMove.amount;
            console.log(`AI ${aiMove.action}s with 💰 ${aiBet} chips`);
            aiBank -= aiBet;
            pot += aiBet;
  
            rl.question("\nYour move: (1) Call, (2) Raise, (3) Fold > ", (answer) => {
                if (answer === "3") {
                    console.log("\nYou folded! AI wins the round.");
                    aiBank += pot;
                    resetGame();
                    return resolve(false);
                } else {
                    let playerBet = answer === "2" ? Math.min(bet * 2, playerBank) : Math.min(bet, playerBank);
                    playerBank -= playerBet;
                    pot += playerBet;
                    console.log(`You bet 💰 ${playerBet} chips`);
                    resolve(true);
                }
            });
        }, 1000);
    });
}

// 🎮 Game Logic
async function playPoker() {
    shuffleDeck();
    
    console.log("\n🎲 Welcome to CLI Texas Hold'em Poker!");
    console.log(`\n💰 Player Bank: ${playerBank} chips | AI Bank: ${aiBank} chips`);
    
    let playerHand = dealCards();
    let aiHand = dealCards();
    let communityCards = [];
  
    // 🔄 Pre-Flop Betting
    let continueGame = await bettingRound(playerHand, aiHand, communityCards, "Pre-Flop");
    if (!continueGame) return;
  
    // 🔄 Flop
    communityCards.push(deck.pop(), deck.pop(), deck.pop());
    continueGame = await bettingRound(playerHand, aiHand, communityCards, "Flop");
    if (!continueGame) return;
  
    // 🔄 Turn
    communityCards.push(deck.pop());
    continueGame = await bettingRound(playerHand, aiHand, communityCards, "Turn");
    if (!continueGame) return;
  
    // 🔄 River
    communityCards.push(deck.pop());
    continueGame = await bettingRound(playerHand, aiHand, communityCards, "River");
    if (!continueGame) return;
  
    // 🏆 Showdown
    console.log("\n🏆 Showdown!");
    console.log(`AI's Hand: [${aiHand[0].rank}${aiHand[0].suit}] [${aiHand[1].rank}${aiHand[1].suit}]`);
    
    let playerBest = getHandValue([...playerHand, ...communityCards]);
    let aiBest = getHandValue([...aiHand, ...communityCards]);

    let playerHandRank = getHandRank([...playerHand, ...communityCards]);
    let aiHandRank = getHandRank([...aiHand, ...communityCards]);

    console.log(`\n🎴 Your Hand Rank: ${playerHandRank}`);
    console.log(`💀 AI Hand Rank: ${aiHandRank}`);
  
    if (playerBest > aiBest) {
        console.log("\n🎉 You win the pot! 🏆");
        playerBank += pot;
    } else {
        console.log("\n💀 AI wins this round!");
        aiBank += pot;
    }
  
    console.log(`\n💰 Player Bank: ${playerBank} chips | AI Bank: ${aiBank} chips`);
    rl.question("\nPlay again? (Y/N) > ", (answer) => {
        if (answer.toLowerCase() === "y") playPoker();
        else {
            console.log("\n🎲 Thanks for playing CLI Poker!");
            rl.close();
        }
    });
}

// 🎮 Start Game
playPoker();
