const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const RANK_VALUE = Object.fromEntries(
  RANKS.map((rank, index) => [rank, index + 2])
);

const STARTING_CHIPS = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;
const BET_SIZE = 20;
const MAX_RAISES_PER_STREET = 3;

// Increase these values to make AI Watch Mode even slower.
const AI_THINK_DELAY = 2000;  // Time before each AI action
const AI_ACTION_DELAY = 1800; // Time to display each AI action
const AI_STREET_DELAY = 3000; // Pause before dealing the next street
const AI_HAND_DELAY = 4500;   // Pause before starting the next hand

const game = {
  mode: "manual",
  playerBank: STARTING_CHIPS,
  opponentBank: STARTING_CHIPS,
  pot: 0,
  deck: [],
  handNumber: 0,
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function clearScreen() {
  process.stdout.write("\x1Bc");
}

function isWatchMode() {
  return game.mode === "ai";
}

function seatName(seat) {
  if (seat === "player") {
    return isWatchMode() ? "Your AI" : "You";
  }

  return "Opponent AI";
}

function actionVerb(seat, humanVerb, automatedVerb) {
  return seat === "player" && !isWatchMode()
    ? humanVerb
    : automatedVerb;
}

function otherSeat(seat) {
  return seat === "player" ? "opponent" : "player";
}

function getBank(seat) {
  return seat === "player" ? game.playerBank : game.opponentBank;
}

function addChips(seat, amount) {
  if (seat === "player") {
    game.playerBank += amount;
  } else {
    game.opponentBank += amount;
  }
}

function removeChips(seat, amount) {
  if (seat === "player") {
    game.playerBank -= amount;
  } else {
    game.opponentBank -= amount;
  }
}

function cardText(card) {
  return `[${card.rank}${card.suit}]`;
}

function cardsText(cards) {
  return cards.length ? cards.map(cardText).join(" ") : "(none)";
}

function hiddenCards(cards) {
  return cards.map(() => "[??]").join(" ");
}

// ─────────────────────────────────────────────
// Table Display
// ─────────────────────────────────────────────
function renderTable({
  street,
  playerHand,
  opponentHand,
  communityCards,
  dealer,
  status = "",
  revealOpponent = false,
}) {
  clearScreen();

  console.log("══════════════════════════════════════════════════════");
  console.log("             🎲 CLI TEXAS HOLD'EM POKER");
  console.log("══════════════════════════════════════════════════════");
  console.log(
    ` Hand: ${game.handNumber}     Street: ${street}     Mode: ${
      isWatchMode() ? "AI WATCH" : "MANUAL"
    }`
  );
  console.log(` Dealer Button: ${seatName(dealer)}`);
  console.log("──────────────────────────────────────────────────────");
  console.log(
    ` Opponent AI: ${
      revealOpponent
        ? cardsText(opponentHand)
        : hiddenCards(opponentHand)
    }`
  );
  console.log("");
  console.log(` Board:       ${cardsText(communityCards)}`);
  console.log("");
  console.log(` ${seatName("player")}: ${cardsText(playerHand)}`);
  console.log("──────────────────────────────────────────────────────");
  console.log(
    ` Pot: ${game.pot}     ${seatName("player")}: ${game.playerBank}     ` +
      `Opponent AI: ${game.opponentBank}`
  );
  console.log("══════════════════════════════════════════════════════");

  if (status) {
    console.log(`\n${status}`);
  }
}

// ─────────────────────────────────────────────
// Deck Logic
// ─────────────────────────────────────────────
function createShuffledDeck() {
  const deck = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));

    [deck[index], deck[swapIndex]] = [
      deck[swapIndex],
      deck[index],
    ];
  }

  return deck;
}

function drawCard() {
  const card = game.deck.pop();

  if (!card) {
    throw new Error("The deck is empty.");
  }

  return card;
}

function burnCard() {
  drawCard();
}

// ─────────────────────────────────────────────
// Poker Hand Evaluation
// ─────────────────────────────────────────────
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

function straightHigh(values) {
  const valuesToCheck = [...new Set(values)].sort((a, b) => b - a);

  if (valuesToCheck.includes(14)) {
    valuesToCheck.push(1);
  }

  for (
    let index = 0;
    index <= valuesToCheck.length - 5;
    index += 1
  ) {
    if (valuesToCheck[index] - valuesToCheck[index + 4] === 4) {
      return valuesToCheck[index];
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

  const groups = [...counts.entries()].sort((a, b) => {
    return b[1] - a[1] || b[0] - a[0];
  });

  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straight = straightHigh(values);

  if (flush && straight) {
    return {
      category: 8,
      name: straight === 14 ? "Royal Flush" : "Straight Flush",
      tiebreak: [straight],
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

  if (flush) {
    return {
      category: 5,
      name: "Flush",
      tiebreak: values,
    };
  }

  if (straight) {
    return {
      category: 4,
      name: "Straight",
      tiebreak: [straight],
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

function compareHands(first, second) {
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
  const candidateHands = chooseFive(cards);
  let best = evaluateFive(candidateHands[0]);

  for (const hand of candidateHands.slice(1)) {
    const result = evaluateFive(hand);

    if (compareHands(result, best) > 0) {
      best = result;
    }
  }

  return best;
}

// ─────────────────────────────────────────────
// Chip and Betting Logic
// ─────────────────────────────────────────────
function commitChips(seat, requestedAmount, streetPaid, handState) {
  const availableBank = getBank(seat);
  const availableLimit =
    handState.wagerLimit - handState.committed[seat];

  const paid = Math.max(
    0,
    Math.min(requestedAmount, availableBank, availableLimit)
  );

  removeChips(seat, paid);

  streetPaid[seat] += paid;
  handState.committed[seat] += paid;
  game.pot += paid;

  return paid;
}

function riskRemaining(seat, handState) {
  return Math.min(
    getBank(seat),
    handState.wagerLimit - handState.committed[seat]
  );
}

// ─────────────────────────────────────────────
// AI Decision Logic - Strategic Poker Play
// ─────────────────────────────────────────────

// Evaluate preflop hand strength (0-10 scale)
function preFlopStrength(cards) {
  const first = RANK_VALUE[cards[0].rank];
  const second = RANK_VALUE[cards[1].rank];

  const high = Math.max(first, second);
  const low = Math.min(first, second);

  const pair = first === second;
  const suited = cards[0].suit === cards[1].suit;
  const connected = Math.abs(first - second) <= 1;
  const gapped = Math.abs(first - second) === 2;

  // Pocket pairs: premium to marginal
  if (pair) {
    if (high >= 12) return 9;  // AA, KK, QQ
    if (high >= 9) return 8;   // TT, JJ
    if (high >= 7) return 6;   // 77-99
    return 4;                  // 22-66
  }

  // Big broadway cards
  if (high === 14) {
    if (low >= 12) return 9;   // AK
    if (low >= 10) return 8;   // AQ, AJ
    if (low >= 9) return 7;    // AT
    if (suited) return 6;      // A9s, A8s, etc
    return 3;                  // AX unsuited lower
  }

  if (high === 13) {
    if (low >= 12) return 8;   // KQ
    if (low >= 11) return 7;   // KJ
    if (low >= 10) return 6;   // KT
    if (suited && low >= 9) return 5;
    return 2;
  }

  // Suited connectors and gapped cards
  if (suited && connected && high >= 10) return 6;
  if (suited && connected && high >= 8) return 5;
  if (suited && gapped && high >= 10) return 4;
  if (suited && high >= 12) return 5;
  if (suited && high >= 10) return 4;
  if (suited) return 2;

  // Unsuited connectors
  if (connected && high >= 11) return 4;
  if (connected && high >= 9) return 3;

  // High cards
  if (high >= 12 && low >= 10) return 5;
  if (high >= 11 && low >= 10) return 4;
  if (high >= 11) return 2;

  return 1;  // Junk hands, but not completely hopeless
}

// Calculate draw strength (flush draw, straight draw, etc)
function calculateDrawStrength(holeCards, communityCards) {
  if (communityCards.length < 3) return 0;

  const allCards = [...holeCards, ...communityCards];

  // Count suits for flush draw
  const suitCounts = { "♠": 0, "♥": 0, "♦": 0, "♣": 0 };
  for (const card of allCards) {
    suitCounts[card.suit]++;
  }

  let flushDrawStrength = 0;
  for (const count of Object.values(suitCounts)) {
    if (count === 4) flushDrawStrength = 1;  // Open-ended flush draw
  }

  // Count for straight draw
  const values = allCards
    .map(card => RANK_VALUE[card.rank])
    .sort((a, b) => b - a);

  let straightDrawStrength = 0;
  for (let i = 0; i < values.length - 3; i++) {
    const gap = values[i] - values[i + 3];
    if (gap === 3) {
      straightDrawStrength = Math.max(straightDrawStrength, 1);  // Open-ended
    }
    if (gap === 4) {
      straightDrawStrength = Math.max(straightDrawStrength, 0.5);  // Gutshot
    }
  }

  return flushDrawStrength + straightDrawStrength;
}

// Evaluate postflop hand strength
function postFlopStrength(holeCards, communityCards) {
  const best = evaluateBestHand([...holeCards, ...communityCards]);

  // Map hand categories to strength (0-10)
  const categoryStrength = {
    0: 1,  // High card
    1: 3,  // One pair
    2: 5,  // Two pair
    3: 6,  // Three of a kind
    4: 7,  // Straight
    5: 8,  // Flush
    6: 9,  // Full house
    7: 9.5, // Four of a kind
    8: 10  // Straight flush
  };

  let strength = categoryStrength[best.category] || 0;

  // Add draw strength
  const drawStrength = calculateDrawStrength(holeCards, communityCards);
  strength += drawStrength * 1.5;

  return Math.min(strength, 10);
}

// Decide AI action based on comprehensive poker strategy
function decideAiMove(
  holeCards,
  communityCards,
  amountToCall,
  canRaise,
  canBet
) {
  let strength;

  if (communityCards.length < 3) {
    // Preflop: use preflop strength evaluation
    strength = preFlopStrength(holeCards);
  } else {
    // Postflop: use postflop strength with draws
    strength = postFlopStrength(holeCards, communityCards);
  }

  // Aggressive play: raise with strong hands
  if (amountToCall > 0) {
    if (strength >= 8.5 && canRaise) {
      return "raise";  // Premium hands
    }

    if (strength >= 6.5 && canRaise && amountToCall <= BIG_BLIND * 2) {
      return "raise";  // Good hands, especially with small bet
    }

    if (strength >= 5 || (strength >= 3 && amountToCall <= BIG_BLIND)) {
      return "call";  // Marginal calls
    }

    if (strength >= 3.5) {
      return "call";  // Medium strength
    }

    if (strength >= 2.5 && amountToCall === BIG_BLIND) {
      return "call";  // Defend against big blind
    }

    return "fold";  // Weak hands fold
  }

  // Position play: bet/check logic
  if (strength >= 7 && canBet) {
    return "bet";  // Strong hands bet for value
  }

  if (strength >= 5 && canBet && communityCards.length <= 4) {
    return "bet";  // Semi-bluff with decent equity
  }

  if (strength >= 3.5 && canBet && communityCards.length === 3) {
    // Aggressive on flop with medium strength
    return Math.random() > 0.3 ? "bet" : "check";
  }

  return "check";  // Check with weak hands
}

// ─────────────────────────────────────────────
// Human Input
// ─────────────────────────────────────────────
async function getHumanAction(amountToCall, canRaise, canBet) {
  while (true) {
    if (amountToCall > 0) {
      const raiseOption = canRaise ? ", (r)aise" : "";

      const answer = await ask(
        `\nYour move: (c)all ${amountToCall}${raiseOption}, (f)old > `
      );

      if (["c", "call"].includes(answer)) {
        return "call";
      }

      if (canRaise && ["r", "raise"].includes(answer)) {
        return "raise";
      }

      if (["f", "fold"].includes(answer)) {
        return "fold";
      }
    } else {
      const betOption = canBet ? ", (b)et" : "";

      const answer = await ask(
        `\nYour move: (k)check${betOption}, (f)old > `
      );

      if (["k", "check"].includes(answer)) {
        return "check";
      }

      if (canBet && ["b", "bet"].includes(answer)) {
        return "bet";
      }

      if (["f", "fold"].includes(answer)) {
        return "fold";
      }
    }

    console.log("Invalid choice. Use the letters shown in the menu.");
  }
}

async function watchDelay(milliseconds) {
  if (isWatchMode()) {
    await wait(milliseconds);
  }
}

// ─────────────────────────────────────────────
// Betting Round
// ─────────────────────────────────────────────
async function bettingRound({
  street,
  playerHand,
  opponentHand,
  communityCards,
  dealer,
  handState,
  startingPaid = { player: 0, opponent: 0 },
  startingStatus = "",
}) {
  const streetPaid = startingPaid;

  let currentBet = Math.max(
    streetPaid.player,
    streetPaid.opponent
  );

  let actor =
    street === "Pre-Flop"
      ? dealer
      : otherSeat(dealer);

  let raises = 0;

  let acted = {
    player: false,
    opponent: false,
  };

  let status = startingStatus;

  while (true) {
    const amountToCall = currentBet - streetPaid[actor];

    const actorRisk = riskRemaining(actor, handState);
    const opponentRisk = riskRemaining(otherSeat(actor), handState);

    const extraRaise = Math.min(
      BET_SIZE,
      Math.max(0, actorRisk - amountToCall),
      opponentRisk
    );

    const canRaise =
      amountToCall > 0 &&
      raises < MAX_RAISES_PER_STREET &&
      extraRaise > 0;

    const canBet =
      amountToCall === 0 &&
      raises < MAX_RAISES_PER_STREET &&
      Math.min(actorRisk, opponentRisk, BET_SIZE) > 0;

    renderTable({
      street,
      playerHand,
      opponentHand,
      communityCards,
      dealer,
      status,
    });

    if (amountToCall === 0 && actorRisk === 0) {
      return { folded: false };
    }

    let action;

    if (actor === "player" && !isWatchMode()) {
      action = await getHumanAction(
        amountToCall,
        canRaise,
        canBet
      );
    } else {
      status = `${seatName(actor)} is thinking...`;

      renderTable({
        street,
        playerHand,
        opponentHand,
        communityCards,
        dealer,
        status,
      });

      await wait(AI_THINK_DELAY);

      const actingHand =
        actor === "player"
          ? playerHand
          : opponentHand;

      action = decideAiMove(
        actingHand,
        communityCards,
        amountToCall,
        canRaise,
        canBet
      );
    }

    if (action === "fold") {
      const winner = otherSeat(actor);
      const wonPot = game.pot;

      addChips(winner, wonPot);
      game.pot = 0;

      status =
        `${seatName(actor)} folds. ${seatName(winner)} ` +
        `${actionVerb(winner, "win", "wins")} ${wonPot} chips!`;

      renderTable({
        street,
        playerHand,
        opponentHand,
        communityCards,
        dealer,
        status,
      });

      await watchDelay(AI_ACTION_DELAY);

      return { folded: true };
    }

    if (action === "check") {
      acted[actor] = true;

      status =
        `${seatName(actor)} ` +
        `${actionVerb(actor, "check", "checks")}.`;
    }

    if (action === "call") {
      const paid = commitChips(
        actor,
        amountToCall,
        streetPaid,
        handState
      );

      acted[actor] = true;

      status =
        `${seatName(actor)} ` +
        `${actionVerb(actor, "call", "calls")} ${paid} chips.`;
    }

    if (action === "bet") {
      const paid = commitChips(
        actor,
        Math.min(BET_SIZE, actorRisk, opponentRisk),
        streetPaid,
        handState
      );

      currentBet = streetPaid[actor];
      raises += 1;

      acted = {
        player: false,
        opponent: false,
      };

      acted[actor] = true;

      status =
        `${seatName(actor)} ` +
        `${actionVerb(actor, "bet", "bets")} ${paid} chips.`;
    }

    if (action === "raise") {
      const paid = commitChips(
        actor,
        amountToCall + extraRaise,
        streetPaid,
        handState
      );

      currentBet = streetPaid[actor];
      raises += 1;

      acted = {
        player: false,
        opponent: false,
      };

      acted[actor] = true;

      status =
        `${seatName(actor)} ` +
        `${actionVerb(actor, "raise", "raises")} ${paid} chips.`;
    }

    renderTable({
      street,
      playerHand,
      opponentHand,
      communityCards,
      dealer,
      status,
    });

    await watchDelay(AI_ACTION_DELAY);

    if (
      acted.player &&
      acted.opponent &&
      streetPaid.player === streetPaid.opponent
    ) {
      return { folded: false };
    }

    actor = otherSeat(actor);
  }
}

// ─────────────────────────────────────────────
// Showdown
// ─────────────────────────────────────────────
function awardShowdown({
  playerHand,
  opponentHand,
  communityCards,
  dealer,
}) {
  const playerResult = evaluateBestHand([
    ...playerHand,
    ...communityCards,
  ]);

  const opponentResult = evaluateBestHand([
    ...opponentHand,
    ...communityCards,
  ]);

  const comparison = compareHands(playerResult, opponentResult);

  let status;

  if (comparison > 0) {
    const wonPot = game.pot;

    addChips("player", wonPot);

    status =
      `🎉 ${seatName("player")} ` +
      `${actionVerb("player", "win", "wins")} ` +
      `${wonPot} chips with ${playerResult.name}!`;
  } else if (comparison < 0) {
    const wonPot = game.pot;

    addChips("opponent", wonPot);

    status =
      `💀 Opponent AI wins ${wonPot} chips ` +
      `with ${opponentResult.name}.`;
  } else {
    const playerShare =
      Math.floor(game.pot / 2) +
      (dealer === "player" && game.pot % 2 ? 1 : 0);

    const opponentShare = game.pot - playerShare;

    addChips("player", playerShare);
    addChips("opponent", opponentShare);

    status =
      `🤝 Tie: ${playerResult.name}. ${seatName("player")} ` +
      `receives ${playerShare}; Opponent AI receives ${opponentShare}.`;
  }

  game.pot = 0;

  renderTable({
    street: "Showdown",
    playerHand,
    opponentHand,
    communityCards,
    dealer,
    revealOpponent: true,
    status:
      `${status}\n\n` +
      `${seatName("player")} best hand: ${playerResult.name}\n` +
      `Opponent AI best hand: ${opponentResult.name}`,
  });
}

async function streetPause(message) {
  if (isWatchMode()) {
    console.log(`\n${message} Next street coming soon...`);
    await wait(AI_STREET_DELAY);
  } else {
    await ask(`\n${message} Press Enter to continue...`);
  }
}

// ─────────────────────────────────────────────
// Hand Flow
// ─────────────────────────────────────────────
async function playHand() {
  game.handNumber += 1;
  game.pot = 0;
  game.deck = createShuffledDeck();

  const dealer =
    game.handNumber % 2 === 1
      ? "player"
      : "opponent";

  const smallBlindSeat = dealer;
  const bigBlindSeat = otherSeat(dealer);

  const playerHand = [drawCard(), drawCard()];
  const opponentHand = [drawCard(), drawCard()];
  const communityCards = [];

  const handState = {
    wagerLimit: Math.min(game.playerBank, game.opponentBank),
    committed: {
      player: 0,
      opponent: 0,
    },
  };

  const blindPaid = {
    player: 0,
    opponent: 0,
  };

  const smallBlindPaid = commitChips(
    smallBlindSeat,
    SMALL_BLIND,
    blindPaid,
    handState
  );

  const bigBlindPaid = commitChips(
    bigBlindSeat,
    BIG_BLIND,
    blindPaid,
    handState
  );

  let result = await bettingRound({
    street: "Pre-Flop",
    playerHand,
    opponentHand,
    communityCards,
    dealer,
    handState,
    startingPaid: blindPaid,
    startingStatus:
      `${seatName(smallBlindSeat)} ` +
      `${actionVerb(smallBlindSeat, "post", "posts")} ` +
      `small blind (${smallBlindPaid}). ` +
      `${seatName(bigBlindSeat)} ` +
      `${actionVerb(bigBlindSeat, "post", "posts")} ` +
      `big blind (${bigBlindPaid}).`,
  });

  if (result.folded) {
    return;
  }

  await streetPause("Pre-flop betting finished.");

  burnCard();
  communityCards.push(drawCard(), drawCard(), drawCard());

  result = await bettingRound({
    street: "Flop",
    playerHand,
    opponentHand,
    communityCards,
    dealer,
    handState,
  });

  if (result.folded) {
    return;
  }

  await streetPause("Flop betting finished.");

  burnCard();
  communityCards.push(drawCard());

  result = await bettingRound({
    street: "Turn",
    playerHand,
    opponentHand,
    communityCards,
    dealer,
    handState,
  });

  if (result.folded) {
    return;
  }

  await streetPause("Turn betting finished.");

  burnCard();
  communityCards.push(drawCard());

  result = await bettingRound({
    street: "River",
    playerHand,
    opponentHand,
    communityCards,
    dealer,
    handState,
  });

  if (result.folded) {
    return;
  }

  await streetPause("River betting finished.");

  awardShowdown({
    playerHand,
    opponentHand,
    communityCards,
    dealer,
  });
}

// ─────────────────────────────────────────────
// Mode Selection and Game Loop
// ─────────────────────────────────────────────
async function chooseMode() {
  while (true) {
    clearScreen();

    console.log("══════════════════════════════════════════════════════");
    console.log("             🎲 CLI TEXAS HOLD'EM POKER");
    console.log("══════════════════════════════════════════════════════");
    console.log(" [1] Manual Play    - You select each action");
    console.log(" [2] AI Watch Mode  - AI plays your cards slowly");
    console.log("══════════════════════════════════════════════════════");

    const answer = await ask("\nSelect mode (1/2): ");

    if (["1", "m", "manual"].includes(answer)) {
      game.mode = "manual";
      return;
    }

    if (["2", "a", "ai", "watch"].includes(answer)) {
      game.mode = "ai";
      return;
    }
  }
}

async function playPoker() {
  while (game.playerBank > 0 && game.opponentBank > 0) {
    await playHand();

    if (game.playerBank <= 0 || game.opponentBank <= 0) {
      break;
    }

    if (isWatchMode()) {
      console.log(
        `\nNext hand starts in ${AI_HAND_DELAY / 1000} seconds. ` +
          "Press Ctrl+C to stop watching."
      );

      await wait(AI_HAND_DELAY);
    } else {
      const answer = await ask("\nPlay another hand? (Y/N): ");

      if (!["y", "yes"].includes(answer)) {
        clearScreen();
        console.log("🎲 Thanks for playing CLI Texas Hold'em Poker!");
        rl.close();
        return;
      }
    }
  }

  clearScreen();

  if (game.playerBank <= 0) {
    console.log(
      isWatchMode()
        ? "💀 Your AI is out of chips. Opponent AI wins the game!"
        : "💀 You are out of chips. Opponent AI wins the game!"
    );
  } else {
    console.log(
      isWatchMode()
        ? "🏆 Opponent AI is out of chips. Your AI wins the game!"
        : "🏆 Opponent AI is out of chips. You win the game!"
    );
  }

  rl.close();
}

async function startGame() {
  await chooseMode();

  clearScreen();

  console.log(
    `🎲 Starting Poker — ${
      isWatchMode() ? "AI Watch Mode" : "Manual Play"
    }`
  );

  if (isWatchMode()) {
    console.log("Your AI will now play for you.");
    console.log("The game pauses after decisions so you can watch.");
    console.log("Press Ctrl+C at any time to stop.");

    await wait(AI_STREET_DELAY);
  } else {
    console.log("Use: check, bet, call, raise, or fold.");

    await ask("\nPress Enter to begin...");
  }

  await playPoker();
}

// ─────────────────────────────────────────────
// Start Game
// ─────────────────────────────────────────────
startGame().catch((error) => {
  clearScreen();
  console.error("An unexpected error occurred:", error.message);
  rl.close();
});