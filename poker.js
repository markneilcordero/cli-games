const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

const RANK_VALUE = Object.fromEntries(
  RANKS.map((rank, index) => [rank, index + 2])
);

const STARTING_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const MIN_RAISE = 20;
const MAX_RAISES_PER_STREET = 3;

let playerBank = STARTING_CHIPS;
let aiBank = STARTING_CHIPS;
let pot = 0;
let deck = [];
let handNumber = 0;

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim().toLowerCase()));
  });
}

// Clears previous terminal output before drawing a new game screen.
function clearScreen() {
  console.clear();
  process.stdout.write("\x1B[2J\x1B[0f");
}

function otherPlayer(player) {
  return player === "player" ? "ai" : "player";
}

function playerName(player) {
  return player === "player" ? "You" : "AI";
}

function formatCard(card) {
  return `[${card.rank}${card.suit}]`;
}

function formatCards(cards) {
  return cards.length ? cards.map(formatCard).join(" ") : "(none)";
}

function hiddenCards(cards) {
  return cards.map(() => "[??]").join(" ");
}

function renderTable({
  phase,
  playerHand,
  aiHand,
  communityCards,
  button,
  status = "",
  revealAi = false,
}) {
  clearScreen();

  console.log("══════════════════════════════════════════════");
  console.log("       🎲 CLI TEXAS HOLD'EM POKER");
  console.log("══════════════════════════════════════════════");
  console.log(
    ` Hand: ${handNumber}          Dealer: ${
      button === "player" ? "You" : "AI"
    }`
  );
  console.log(` Street: ${phase}`);
  console.log("──────────────────────────────────────────────");
  console.log(
    ` AI:    ${revealAi ? formatCards(aiHand) : hiddenCards(aiHand)}`
  );
  console.log("");
  console.log(` Board: ${formatCards(communityCards)}`);
  console.log("");
  console.log(` You:   ${formatCards(playerHand)}`);
  console.log("──────────────────────────────────────────────");
  console.log(` Pot: ${pot} chips     You: ${playerBank}     AI: ${aiBank}`);
  console.log("══════════════════════════════════════════════");

  if (status) {
    console.log(`\n${status}`);
  }
}

function createShuffledDeck() {
  const newDeck = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      newDeck.push({ suit, rank });
    }
  }

  for (let index = newDeck.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    [newDeck[index], newDeck[randomIndex]] = [
      newDeck[randomIndex],
      newDeck[index],
    ];
  }

  return newDeck;
}

function drawCard() {
  const card = deck.pop();

  if (!card) {
    throw new Error("Deck is empty.");
  }

  return card;
}

function burnCard() {
  drawCard();
}

function chooseFive(cards) {
  const hands = [];

  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            hands.push([
              cards[a],
              cards[b],
              cards[c],
              cards[d],
              cards[e],
            ]);
          }
        }
      }
    }
  }

  return hands;
}

function getStraightHigh(values) {
  const uniqueValues = [...new Set(values)].sort((a, b) => b - a);

  // Ace can play low in A-2-3-4-5.
  if (uniqueValues.includes(14)) {
    uniqueValues.push(1);
  }

  for (let index = 0; index <= uniqueValues.length - 5; index += 1) {
    if (uniqueValues[index] - uniqueValues[index + 4] === 4) {
      return uniqueValues[index];
    }
  }

  return 0;
}

function evaluateFive(cards) {
  const values = cards
    .map((card) => RANK_VALUE[card.rank])
    .sort((a, b) => b - a);

  const counts = new Map();

  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  const groups = [...counts.entries()].sort((first, second) => {
    if (second[1] !== first[1]) {
      return second[1] - first[1];
    }

    return second[0] - first[0];
  });

  const isFlush = cards.every((card) => card.suit === cards[0].suit);
  const straightHigh = getStraightHigh(values);

  if (isFlush && straightHigh) {
    return {
      category: 8,
      name: straightHigh === 14 ? "Royal Flush" : "Straight Flush",
      tiebreak: [straightHigh],
    };
  }

  if (groups[0][1] === 4) {
    return {
      category: 7,
      name: "Four of a Kind",
      tiebreak: [groups[0][0], groups[1][0]],
    };
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return {
      category: 6,
      name: "Full House",
      tiebreak: [groups[0][0], groups[1][0]],
    };
  }

  if (isFlush) {
    return {
      category: 5,
      name: "Flush",
      tiebreak: values,
    };
  }

  if (straightHigh) {
    return {
      category: 4,
      name: "Straight",
      tiebreak: [straightHigh],
    };
  }

  if (groups[0][1] === 3) {
    return {
      category: 3,
      name: "Three of a Kind",
      tiebreak: [
        groups[0][0],
        ...groups
          .slice(1)
          .map(([value]) => value)
          .sort((a, b) => b - a),
      ],
    };
  }

  if (groups[0][1] === 2 && groups[1][1] === 2) {
    return {
      category: 2,
      name: "Two Pair",
      tiebreak: [groups[0][0], groups[1][0], groups[2][0]],
    };
  }

  if (groups[0][1] === 2) {
    return {
      category: 1,
      name: "One Pair",
      tiebreak: [
        groups[0][0],
        ...groups
          .slice(1)
          .map(([value]) => value)
          .sort((a, b) => b - a),
      ],
    };
  }

  return {
    category: 0,
    name: "High Card",
    tiebreak: values,
  };
}

function compareEvaluations(first, second) {
  if (first.category !== second.category) {
    return first.category > second.category ? 1 : -1;
  }

  for (let index = 0; index < first.tiebreak.length; index += 1) {
    if (first.tiebreak[index] !== second.tiebreak[index]) {
      return first.tiebreak[index] > second.tiebreak[index] ? 1 : -1;
    }
  }

  return 0;
}

function evaluateBestHand(cards) {
  const possibleHands = chooseFive(cards);

  if (!possibleHands.length) {
    throw new Error("At least five cards are required to evaluate a hand.");
  }

  let bestHand = evaluateFive(possibleHands[0]);

  for (const hand of possibleHands.slice(1)) {
    const evaluation = evaluateFive(hand);

    if (compareEvaluations(evaluation, bestHand) > 0) {
      bestHand = evaluation;
    }
  }

  return bestHand;
}

function commitChips(player, amount, streetContributions, handState) {
  const bank = player === "player" ? playerBank : aiBank;

  const remainingHandLimit =
    handState.wagerLimit - handState.committed[player];

  const paid = Math.max(0, Math.min(amount, bank, remainingHandLimit));

  if (player === "player") {
    playerBank -= paid;
  } else {
    aiBank -= paid;
  }

  streetContributions[player] += paid;
  handState.committed[player] += paid;
  pot += paid;

  return paid;
}

function remainingRisk(player, handState) {
  const bank = player === "player" ? playerBank : aiBank;

  return Math.min(bank, handState.wagerLimit - handState.committed[player]);
}

function postBlind(player, amount, contributions, handState) {
  return commitChips(player, amount, contributions, handState);
}

function preFlopStrength(cards) {
  const first = RANK_VALUE[cards[0].rank];
  const second = RANK_VALUE[cards[1].rank];

  const high = Math.max(first, second);
  const low = Math.min(first, second);

  const pair = first === second;
  const suited = cards[0].suit === cards[1].suit;
  const connected = Math.abs(first - second) <= 1;

  if (pair && high >= 10) return 4;
  if (pair) return 3;
  if (high === 14 && low >= 10) return 3;
  if (high >= 12 && low >= 10) return 2;
  if (suited && connected && high >= 10) return 2;
  if (high >= 11 || suited) return 1;

  return 0;
}

function decideAiMove(aiHand, communityCards, amountToCall, canRaise, canBet) {
  const strength =
    communityCards.length < 3
      ? preFlopStrength(aiHand)
      : evaluateBestHand([...aiHand, ...communityCards]).category;

  if (amountToCall > 0) {
    if (strength >= 3 && canRaise) {
      return "raise";
    }

    if (strength >= 1 || amountToCall <= BIG_BLIND) {
      return "call";
    }

    return "fold";
  }

  if (strength >= 2 && canBet) {
    return "bet";
  }

  return "check";
}

async function getPlayerAction(amountToCall, canRaise, canBet) {
  while (true) {
    let answer;

    if (amountToCall > 0) {
      const raiseOption = canRaise ? ", (r)aise" : "";

      answer = await ask(
        `\nYour move: (c)all ${amountToCall}${raiseOption}, (f)old > `
      );

      if (["c", "call", "1"].includes(answer)) {
        return "call";
      }

      if (canRaise && ["r", "raise", "2"].includes(answer)) {
        return "raise";
      }

      if (["f", "fold", "3"].includes(answer)) {
        return "fold";
      }
    } else {
      const betOption = canBet ? ", (b)et" : "";

      answer = await ask(`\nYour move: (k)check${betOption}, (f)old > `);

      if (["k", "check", "1"].includes(answer)) {
        return "check";
      }

      if (canBet && ["b", "bet", "2"].includes(answer)) {
        return "bet";
      }

      if (["f", "fold", "3"].includes(answer)) {
        return "fold";
      }
    }

    console.log("Invalid choice. Use the letters shown in the menu.");
  }
}

async function pause(message) {
  await ask(`\n${message} Press Enter to continue...`);
}

async function bettingRound({
  phase,
  playerHand,
  aiHand,
  communityCards,
  button,
  handState,
  openingContributions = null,
  openingStatus = "",
}) {
  const contributions = openingContributions || { player: 0, ai: 0 };

  let currentBet = Math.max(contributions.player, contributions.ai);
  let actor = phase === "Pre-Flop" ? button : otherPlayer(button);
  let raises = 0;
  let acted = { player: false, ai: false };
  let status = openingStatus;

  while (true) {
    const amountToCall = currentBet - contributions[actor];
    const actorRemaining = remainingRisk(actor, handState);
    const opponentRemaining = remainingRisk(otherPlayer(actor), handState);

    const raiseExtra = Math.min(
      MIN_RAISE,
      Math.max(0, actorRemaining - amountToCall),
      opponentRemaining
    );

    const canRaise =
      amountToCall > 0 &&
      raises < MAX_RAISES_PER_STREET &&
      raiseExtra > 0;

    const canBet =
      amountToCall === 0 &&
      raises < MAX_RAISES_PER_STREET &&
      Math.min(actorRemaining, opponentRemaining, MIN_RAISE) > 0;

    renderTable({
      phase,
      playerHand,
      aiHand,
      communityCards,
      button,
      status,
    });

    if (amountToCall === 0 && actorRemaining === 0) {
      return { folded: false };
    }

    let action;

    if (actor === "player") {
      action = await getPlayerAction(amountToCall, canRaise, canBet);
    } else {
      action = decideAiMove(
        aiHand,
        communityCards,
        amountToCall,
        canRaise,
        canBet
      );
    }

    if (action === "fold") {
      const winner = otherPlayer(actor);
      const winningPot = pot;

      if (winner === "player") {
        playerBank += pot;
      } else {
        aiBank += pot;
      }

      pot = 0;

      status = `${playerName(actor)} folded. ${playerName(winner)} ${
        winner === "player" ? "win" : "wins"
      } ${winningPot} chips!`;

      renderTable({
        phase,
        playerHand,
        aiHand,
        communityCards,
        button,
        status,
      });

      return { folded: true };
    }

    if (action === "check") {
      acted[actor] = true;

      status = `${playerName(actor)} ${
        actor === "player" ? "check" : "checks"
      }.`;

      if (
        acted.player &&
        acted.ai &&
        contributions.player === contributions.ai
      ) {
        renderTable({
          phase,
          playerHand,
          aiHand,
          communityCards,
          button,
          status,
        });

        return { folded: false };
      }
    }

    if (action === "call") {
      const paid = commitChips(actor, amountToCall, contributions, handState);

      acted[actor] = true;

      status = `${playerName(actor)} ${
        actor === "player" ? "call" : "calls"
      } ${paid} chips.`;

      if (contributions.player === contributions.ai) {
        renderTable({
          phase,
          playerHand,
          aiHand,
          communityCards,
          button,
          status,
        });

        return { folded: false };
      }
    }

    if (action === "bet") {
      const amount = Math.min(
        MIN_RAISE,
        actorRemaining,
        opponentRemaining
      );

      const paid = commitChips(actor, amount, contributions, handState);

      currentBet = contributions[actor];
      raises += 1;

      acted = { player: false, ai: false };
      acted[actor] = true;

      status = `${playerName(actor)} ${
        actor === "player" ? "bet" : "bets"
      } ${paid} chips.`;
    }

    if (action === "raise") {
      const paid = commitChips(
        actor,
        amountToCall + raiseExtra,
        contributions,
        handState
      );

      currentBet = contributions[actor];
      raises += 1;

      acted = { player: false, ai: false };
      acted[actor] = true;

      status = `${playerName(actor)} ${
        actor === "player" ? "raise" : "raises"
      } ${paid} chips.`;
    }

    actor = otherPlayer(actor);
  }
}

function awardShowdown({
  playerHand,
  aiHand,
  communityCards,
  button,
}) {
  const playerResult = evaluateBestHand([...playerHand, ...communityCards]);
  const aiResult = evaluateBestHand([...aiHand, ...communityCards]);

  const comparison = compareEvaluations(playerResult, aiResult);

  let status;

  if (comparison > 0) {
    status = `🎉 You win ${pot} chips with ${playerResult.name}!`;
    playerBank += pot;
  } else if (comparison < 0) {
    status = `💀 AI wins ${pot} chips with ${aiResult.name}.`;
    aiBank += pot;
  } else {
    const playerShare =
      Math.floor(pot / 2) + (button === "player" && pot % 2 ? 1 : 0);

    const aiShare = pot - playerShare;

    playerBank += playerShare;
    aiBank += aiShare;

    status =
      `🤝 Tie: ${playerResult.name}. ` +
      `You receive ${playerShare}; AI receives ${aiShare}.`;
  }

  pot = 0;

  renderTable({
    phase: "Showdown",
    playerHand,
    aiHand,
    communityCards,
    button,
    revealAi: true,
    status:
      `${status}\n\n` +
      `Your best hand: ${playerResult.name}\n` +
      `AI best hand:   ${aiResult.name}`,
  });
}

async function playHand() {
  handNumber += 1;
  pot = 0;
  deck = createShuffledDeck();

  const button = handNumber % 2 === 1 ? "player" : "ai";
  const smallBlindPlayer = button;
  const bigBlindPlayer = otherPlayer(button);

  const playerHand = [drawCard(), drawCard()];
  const aiHand = [drawCard(), drawCard()];
  const communityCards = [];

  // In heads-up poker, only the smaller bankroll can be won in one hand.
  const handState = {
    wagerLimit: Math.min(playerBank, aiBank),
    committed: {
      player: 0,
      ai: 0,
    },
  };

  const blindContributions = {
    player: 0,
    ai: 0,
  };

  const smallBlindPaid = postBlind(
    smallBlindPlayer,
    SMALL_BLIND,
    blindContributions,
    handState
  );

  const bigBlindPaid = postBlind(
    bigBlindPlayer,
    BIG_BLIND,
    blindContributions,
    handState
  );

  let outcome = await bettingRound({
    phase: "Pre-Flop",
    playerHand,
    aiHand,
    communityCards,
    button,
    handState,
    openingContributions: blindContributions,
    openingStatus:
      `${playerName(smallBlindPlayer)} ${
        smallBlindPlayer === "player" ? "post" : "posts"
      } small blind (${smallBlindPaid}). ` +
      `${playerName(bigBlindPlayer)} ${
        bigBlindPlayer === "player" ? "post" : "posts"
      } big blind (${bigBlindPaid}).`,
  });

  if (outcome.folded) {
    return;
  }

  await pause("Pre-flop betting finished.");

  burnCard();
  communityCards.push(drawCard(), drawCard(), drawCard());

  outcome = await bettingRound({
    phase: "Flop",
    playerHand,
    aiHand,
    communityCards,
    button,
    handState,
  });

  if (outcome.folded) {
    return;
  }

  await pause("Flop betting finished.");

  burnCard();
  communityCards.push(drawCard());

  outcome = await bettingRound({
    phase: "Turn",
    playerHand,
    aiHand,
    communityCards,
    button,
    handState,
  });

  if (outcome.folded) {
    return;
  }

  await pause("Turn betting finished.");

  burnCard();
  communityCards.push(drawCard());

  outcome = await bettingRound({
    phase: "River",
    playerHand,
    aiHand,
    communityCards,
    button,
    handState,
  });

  if (outcome.folded) {
    return;
  }

  await pause("River betting finished.");

  awardShowdown({
    playerHand,
    aiHand,
    communityCards,
    button,
  });
}

async function playPoker() {
  while (playerBank > 0 && aiBank > 0) {
    await playHand();

    if (playerBank <= 0 || aiBank <= 0) {
      break;
    }

    const answer = await ask("\nPlay another hand? (Y/N) > ");

    if (!["y", "yes"].includes(answer)) {
      clearScreen();
      console.log("🎲 Thanks for playing CLI Texas Hold'em Poker!");
      rl.close();
      return;
    }
  }

  clearScreen();

  if (playerBank <= 0) {
    console.log("💀 You are out of chips. AI wins the game!");
  } else {
    console.log("🏆 AI is out of chips. You win the game!");
  }

  rl.close();
}

clearScreen();

console.log("🎲 Welcome to CLI Texas Hold'em Poker!");
console.log("Each street is redrawn on a clean screen to keep the game readable.");
console.log("Use: check, bet, call, raise, or fold.");

ask("\nPress Enter to start...").then(() => {
  playPoker().catch((error) => {
    clearScreen();
    console.error("An unexpected error occurred:", error.message);
    rl.close();
  });
});