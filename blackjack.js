const readline = require("readline");
const { randomInt } = require("crypto");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ─────────────────────────────────────────────
// Game Rules
// - Single fresh 52-card deck per hand
// - Blackjack pays 3:2
// - Dealer stands on all 17s, including soft 17
// - Insurance costs half the original bet and pays 2:1 profit
// - Double down is available on the player's first two cards
// - AI mode automatically bets and plays each hand
// ─────────────────────────────────────────────
const STARTING_BALANCE = 500;
const MIN_BET = 5;

const AI_BET_PERCENT = 0.05;
const AI_ACTION_DELAY = 4000;
const AI_AUTO_CONTINUE_DELAY = 4000;

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
  "A",
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
];

const session = {
  balance: STARTING_BALANCE,
  handNumber: 1,
  wins: 0,
  losses: 0,
  pushes: 0,
  blackjacks: 0,
  mode: "manual",
};

// ─────────────────────────────────────────────
// CLI Helpers
// ─────────────────────────────────────────────
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function clearScreen() {
  process.stdout.write("\x1Bc");
}

function isExitInput(input) {
  return ["q", "quit", "e", "exit"].includes(input.toLowerCase());
}

function parseBet(input) {
  if (!/^\d+(\.\d{1,2})?$/.test(input.trim())) {
    return null;
  }

  const amount = Number(input);

  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function money(amount) {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function signedMoney(amount) {
  if (amount > 0) {
    return `+${money(amount)}`;
  }

  if (amount < 0) {
    return `-${money(Math.abs(amount))}`;
  }

  return money(0);
}

function cardText(card) {
  return `[${card.rank}${card.suit}]`;
}

function handText(hand) {
  return hand.map(cardText).join(" ");
}

function modeText() {
  return session.mode === "ai" ? "AI AUTO-PLAY" : "MANUAL PLAY";
}

// ─────────────────────────────────────────────
// Deck and Hand Logic
// ─────────────────────────────────────────────
function createShuffledDeck() {
  const deck = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInt(0, index + 1);

    [deck[index], deck[randomIndex]] = [
      deck[randomIndex],
      deck[index],
    ];
  }

  return deck;
}

function drawCard(round) {
  const card = round.deck.pop();

  if (!card) {
    throw new Error("The deck is empty.");
  }

  return card;
}

function handValue(hand) {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    if (card.rank === "A") {
      total += 11;
      aces += 1;
    } else if (["J", "Q", "K"].includes(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return {
    total,
    soft: aces > 0,
    blackjack: hand.length === 2 && total === 21,
    bust: total > 21,
  };
}

function isTenValue(card) {
  return ["10", "J", "Q", "K"].includes(card.rank);
}

function dealerUpcardValue(round) {
  const rank = round.dealerHand[0].rank;

  if (rank === "A") {
    return 11;
  }

  if (isTenValue(round.dealerHand[0])) {
    return 10;
  }

  return Number(rank);
}

function createRound(originalBet) {
  const round = {
    deck: createShuffledDeck(),
    playerHand: [],
    dealerHand: [],
    originalBet,
    wager: originalBet,
    insurance: 0,
    insuranceMessage: "",
    dealerRevealed: false,
    settled: false,
    status: "Cards dealt. Choose your move.",
  };

  round.playerHand.push(drawCard(round));
  round.dealerHand.push(drawCard(round));
  round.playerHand.push(drawCard(round));
  round.dealerHand.push(drawCard(round));

  return round;
}

// ─────────────────────────────────────────────
// Screen Rendering
// ─────────────────────────────────────────────
function statsLine() {
  return (
    `Wins ${session.wins} | Losses ${session.losses} | ` +
    `Pushes ${session.pushes} | Blackjacks ${session.blackjacks}`
  );
}

function renderLobby(message = "Place a bet to start a hand.") {
  clearScreen();

  console.log("══════════════════════════════════════════════════");
  console.log("                 🃏 CLI BLACKJACK 🃏");
  console.log("══════════════════════════════════════════════════");
  console.log(
    ` Balance: ${money(session.balance)}     Hand: ${session.handNumber}`
  );
  console.log(` Mode: ${modeText()}`);
  console.log(` ${statsLine()}`);
  console.log("──────────────────────────────────────────────────");
  console.log(" Rules: Blackjack pays 3:2 | Dealer stands on 17");
  console.log("        Insurance pays 2:1 | Fresh deck each hand");
  console.log("──────────────────────────────────────────────────");
  console.log(` ${message}`);
  console.log(" Type EXIT to quit.");
  console.log("══════════════════════════════════════════════════");
}

function dealerDisplay(round) {
  if (round.dealerRevealed) {
    const fullValue = handValue(round.dealerHand);

    return (
      `${handText(round.dealerHand)}  Total: ${fullValue.total}` +
      `${fullValue.soft ? " (soft)" : ""}`
    );
  }

  const visibleHand = [round.dealerHand[0]];
  const visibleValue = handValue(visibleHand);

  return (
    `${cardText(round.dealerHand[0])} [??]  ` +
    `Visible Total: ${visibleValue.total}` +
    `${visibleValue.soft ? " (soft)" : ""}`
  );
}

function renderRound(round, message = round.status) {
  clearScreen();

  const playerValue = handValue(round.playerHand);

  console.log("══════════════════════════════════════════════════");
  console.log("                 🃏 CLI BLACKJACK 🃏");
  console.log("══════════════════════════════════════════════════");
  console.log(
    ` Hand: ${session.handNumber}     Available Cash: ${money(
      session.balance
    )}`
  );
  console.log(` Mode: ${modeText()}`);
  console.log(
    ` Wager: ${money(round.wager)}` +
      `${
        round.insurance > 0
          ? `     Insurance: ${money(round.insurance)}`
          : ""
      }`
  );
  console.log(` ${statsLine()}`);
  console.log("──────────────────────────────────────────────────");
  console.log(` Dealer: ${dealerDisplay(round)}`);
  console.log("");
  console.log(
    ` You:    ${handText(round.playerHand)}  Total: ${playerValue.total}` +
      `${playerValue.soft ? " (soft)" : ""}`
  );
  console.log("──────────────────────────────────────────────────");

  for (const line of String(message).split("\n")) {
    console.log(` ${line}`);
  }

  if (round.insuranceMessage) {
    console.log(` ${round.insuranceMessage}`);
  }

  console.log("══════════════════════════════════════════════════");
}

function renderGoodbye() {
  clearScreen();

  const net = session.balance - STARTING_BALANCE;

  console.log("══════════════════════════════════════════════════");
  console.log("                    GAME OVER");
  console.log("══════════════════════════════════════════════════");
  console.log(` Mode:          ${modeText()}`);
  console.log(` Final Balance: ${money(session.balance)}`);
  console.log(` Net Result:    ${signedMoney(net)}`);
  console.log(` ${statsLine()}`);
  console.log(" Thanks for playing Blackjack!");
  console.log("══════════════════════════════════════════════════");
}

// ─────────────────────────────────────────────
// Settlement Logic
//
// Main wager is removed from balance before cards are dealt.
// - Normal win: returns original stake plus equal profit.
// - Blackjack: returns original stake plus 3:2 profit.
// - Push: returns the original stake.
// - Loss: returns nothing.
//
// Insurance is removed when purchased.
// - Dealer Blackjack: returns insurance plus 2:1 profit.
// - No Dealer Blackjack: returns nothing.
// ─────────────────────────────────────────────
function settleRound(round, outcome, payout, message) {
  if (round.settled) {
    return;
  }

  round.settled = true;
  round.dealerRevealed = true;

  session.balance = Number((session.balance + payout).toFixed(2));

  if (outcome === "win") {
    session.wins += 1;
  } else if (outcome === "loss") {
    session.losses += 1;
  } else {
    session.pushes += 1;
  }

  round.status = message;

  renderRound(round);
}

// ─────────────────────────────────────────────
// Insurance and Natural Blackjack
// ─────────────────────────────────────────────
async function offerInsurance(round) {
  if (round.dealerHand[0].rank !== "A") {
    return;
  }

  const insuranceAmount = Number((round.originalBet / 2).toFixed(2));

  if (session.mode === "ai") {
    round.insuranceMessage = "🤖 AI declined insurance.";
    renderRound(round, "Dealer shows an Ace. AI evaluates insurance.");
    await wait(AI_ACTION_DELAY);
    return;
  }

  if (session.balance < insuranceAmount) {
    round.insuranceMessage =
      `Insurance unavailable: you need ${money(
        insuranceAmount
      )} additional cash.`;

    return;
  }

  while (true) {
    renderRound(
      round,
      `Dealer shows an Ace. Insurance costs ${money(insuranceAmount)}.`
    );

    const input = (
      await ask("\nTake insurance? (Y/N): ")
    ).toLowerCase();

    if (["y", "yes"].includes(input)) {
      round.insurance = insuranceAmount;

      session.balance = Number(
        (session.balance - insuranceAmount).toFixed(2)
      );

      round.insuranceMessage =
        `Insurance placed: ${money(insuranceAmount)}.`;

      return;
    }

    if (["n", "no"].includes(input)) {
      round.insuranceMessage = "Insurance declined.";
      return;
    }

    if (isExitInput(input)) {
      round.insuranceMessage = "Insurance declined.";
      return;
    }

    round.status = "⚠ Enter Y or N for insurance.";
  }
}

function resolveInsurance(round, dealerHasBlackjack) {
  if (round.insurance === 0) {
    return "";
  }

  if (dealerHasBlackjack) {
    const insuranceReturn = Number((round.insurance * 3).toFixed(2));

    session.balance = Number(
      (session.balance + insuranceReturn).toFixed(2)
    );

    return `Insurance wins and returns ${money(insuranceReturn)}.`;
  }

  return `Insurance loses: -${money(round.insurance)}.`;
}

async function resolveNaturals(round) {
  const player = handValue(round.playerHand);
  const dealer = handValue(round.dealerHand);

  const dealerCanPeek =
    round.dealerHand[0].rank === "A" ||
    isTenValue(round.dealerHand[0]);

  if (!dealerCanPeek && !player.blackjack) {
    return false;
  }

  if (dealer.blackjack) {
    const insuranceResult = resolveInsurance(round, true);

    if (player.blackjack) {
      settleRound(
        round,
        "push",
        round.wager,
        `🤝 Both you and the dealer have Blackjack. Push!` +
          `${insuranceResult ? `\n${insuranceResult}` : ""}`
      );
    } else {
      settleRound(
        round,
        "loss",
        0,
        `💀 Dealer has Blackjack. You lose the main wager.` +
          `${insuranceResult ? `\n${insuranceResult}` : ""}`
      );
    }

    return true;
  }

  const insuranceResult = resolveInsurance(round, false);

  if (insuranceResult) {
    round.insuranceMessage = insuranceResult;
  }

  if (player.blackjack) {
    session.blackjacks += 1;

    const blackjackReturn = Number((round.wager * 2.5).toFixed(2));

    settleRound(
      round,
      "win",
      blackjackReturn,
      `🎉 BLACKJACK! Your ${money(
        round.wager
      )} wager returns ${money(blackjackReturn)}.`
    );

    return true;
  }

  return false;
}

// ─────────────────────────────────────────────
// Dealer Turn
// ─────────────────────────────────────────────
async function dealerTurn(round) {
  round.dealerRevealed = true;

  renderRound(round, "Dealer reveals the hidden card.");
  await wait(AI_ACTION_DELAY);

  while (handValue(round.dealerHand).total < 17) {
    const card = drawCard(round);

    round.dealerHand.push(card);

    renderRound(round, `Dealer draws ${cardText(card)}.`);
    await wait(AI_ACTION_DELAY);
  }

  const player = handValue(round.playerHand);
  const dealer = handValue(round.dealerHand);

  if (dealer.bust) {
    settleRound(
      round,
      "win",
      round.wager * 2,
      `🏆 Dealer busts with ${dealer.total}. ` +
        `You win ${money(round.wager)} profit!`
    );

    return;
  }

  if (player.total > dealer.total) {
    settleRound(
      round,
      "win",
      round.wager * 2,
      `🏆 You win ${player.total} to ${dealer.total}. ` +
        `Profit: ${money(round.wager)}.`
    );
  } else if (player.total < dealer.total) {
    settleRound(
      round,
      "loss",
      0,
      `💀 Dealer wins ${dealer.total} to ${player.total}. ` +
        `You lose ${money(round.wager)}.`
    );
  } else {
    settleRound(
      round,
      "push",
      round.wager,
      `🤝 Push at ${player.total}. Your wager is returned.`
    );
  }
}

// ─────────────────────────────────────────────
// Shared Player Actions
// ─────────────────────────────────────────────
async function hit(round, actor = "You") {
  const card = drawCard(round);

  round.playerHand.push(card);

  const player = handValue(round.playerHand);

  if (player.bust) {
    settleRound(
      round,
      "loss",
      0,
      `💥 ${actor} drew ${cardText(card)} and busted with ${player.total}. ` +
        `You lose ${money(round.wager)}.`
    );

    return true;
  }

  round.status =
    `${actor} drew ${cardText(card)}. Your total is ${player.total}.`;

  return false;
}

async function doubleDown(round, actor = "You") {
  session.balance = Number(
    (session.balance - round.originalBet).toFixed(2)
  );

  round.wager += round.originalBet;

  const card = drawCard(round);

  round.playerHand.push(card);

  const player = handValue(round.playerHand);

  if (player.bust) {
    settleRound(
      round,
      "loss",
      0,
      `💥 ${actor} doubled down, drew ${cardText(card)}, ` +
        `and busted with ${player.total}. ` +
        `You lose ${money(round.wager)}.`
    );

    return;
  }

  round.status =
    `${actor} doubled down and drew ${cardText(card)}. Dealer now plays.`;

  renderRound(round);
  await wait(AI_ACTION_DELAY);

  await dealerTurn(round);
}

// ─────────────────────────────────────────────
// AI Player Logic
//
// Las Vegas Basic Strategy for single deck,
// dealer stands on all 17s. Mathematically
// optimal play without split support.
// ─────────────────────────────────────────────
function chooseAIAction(round, canDouble) {
  const player = handValue(round.playerHand);
  const dealer = dealerUpcardValue(round);
  const total = player.total;

  // Soft hands (Ace counted as 11)
  if (player.soft) {
    if (total >= 19) {
      // Soft 20, Soft 21: Always stand
      return "stand";
    }

    if (total === 18) {
      // Soft 18 (A7): Stand vs 2-8, Double vs 3-6, Hit vs 9+
      if (canDouble && dealer >= 3 && dealer <= 6) {
        return "double";
      }
      return dealer <= 8 ? "stand" : "hit";
    }

    if (total === 17) {
      // Soft 17 (A6): Double vs 3-6, Hit vs all others
      return canDouble && dealer >= 3 && dealer <= 6
        ? "double"
        : "hit";
    }

    if (total === 16) {
      // Soft 16 (A5): Double vs 4-6, Hit vs all others
      return canDouble && dealer >= 4 && dealer <= 6
        ? "double"
        : "hit";
    }

    if (total === 15) {
      // Soft 15 (A4): Double vs 4-6, Hit vs all others
      return canDouble && dealer >= 4 && dealer <= 6
        ? "double"
        : "hit";
    }

    if (total === 14) {
      // Soft 14 (A3): Double vs 5-6, Hit vs all others
      return canDouble && dealer >= 5 && dealer <= 6
        ? "double"
        : "hit";
    }

    // Soft 13 and below: Double vs 5-6, Hit vs all others
    return canDouble && dealer >= 5 && dealer <= 6
      ? "double"
      : "hit";
  }

  // Hard hands (no Ace or Ace counted as 1)
  if (total >= 17) {
    // 17 or higher: Always stand
    return "stand";
  }

  if (total === 16) {
    // 16: Stand vs 2-6, Hit vs 7-A
    return dealer >= 2 && dealer <= 6 ? "stand" : "hit";
  }

  if (total === 15) {
    // 15: Stand vs 2-6, Hit vs 7-A
    return dealer >= 2 && dealer <= 6 ? "stand" : "hit";
  }

  if (total === 14) {
    // 14: Stand vs 2-6, Hit vs 7-A
    return dealer >= 2 && dealer <= 6 ? "stand" : "hit";
  }

  if (total === 13) {
    // 13: Stand vs 2-6, Hit vs 7-A
    return dealer >= 2 && dealer <= 6 ? "stand" : "hit";
  }

  if (total === 12) {
    // 12: Stand vs 4-6, Hit vs 2-3 and 7-A
    return dealer >= 4 && dealer <= 6 ? "stand" : "hit";
  }

  if (total === 11) {
    // 11: Double vs 2-10, Hit vs Ace
    return canDouble && dealer !== 11 ? "double" : "hit";
  }

  if (total === 10) {
    // 10: Double vs 2-9, Hit vs 10 or Ace
    return canDouble && dealer >= 2 && dealer <= 9
      ? "double"
      : "hit";
  }

  if (total === 9) {
    // 9: Double vs 3-6, Hit vs all others
    return canDouble && dealer >= 3 && dealer <= 6
      ? "double"
      : "hit";
  }

  // 8 or less: Always hit
  return "hit";
}

async function aiTurn(round) {
  let firstDecision = true;

  while (!round.settled) {
    const canDouble =
      firstDecision && session.balance >= round.originalBet;

    const action = chooseAIAction(round, canDouble);

    const actionLabel =
      action === "double" ? "DOUBLE DOWN" : action.toUpperCase();

    renderRound(round, `🤖 AI decision: ${actionLabel}.`);
    await wait(AI_ACTION_DELAY);

    if (action === "hit") {
      const busted = await hit(round, "AI");

      if (busted) {
        return;
      }

      firstDecision = false;

      renderRound(round, round.status);
      await wait(AI_ACTION_DELAY);

      continue;
    }

    if (action === "double") {
      await doubleDown(round, "AI");
      return;
    }

    await dealerTurn(round);
    return;
  }
}

// ─────────────────────────────────────────────
// Manual Player Turn
// ─────────────────────────────────────────────
async function manualPlayerTurn(round) {
  let firstDecision = true;

  while (!round.settled) {
    const canDouble =
      firstDecision && session.balance >= round.originalBet;

    const options = canDouble
      ? "[H] Hit  [S] Stand  [D] Double Down  [Q] Quit"
      : "[H] Hit  [S] Stand  [Q] Quit";

    renderRound(round, `Your turn. ${options}`);

    const choice = (
      await ask("\nChoose an action: ")
    ).toLowerCase();

    if (["h", "hit"].includes(choice)) {
      const busted = await hit(round);

      if (busted) {
        return;
      }

      firstDecision = false;
      continue;
    }

    if (["s", "stand"].includes(choice)) {
      await dealerTurn(round);
      return;
    }

    if (["d", "double", "double down"].includes(choice)) {
      if (!firstDecision) {
        round.status =
          "⚠ Double down is only available before you hit.";

        continue;
      }

      if (!canDouble) {
        round.status =
          `⚠ You need ${money(
            round.originalBet
          )} additional cash to double down.`;

        continue;
      }

      await doubleDown(round);
      return;
    }

    if (isExitInput(choice)) {
      const confirm = (
        await ask(
          `Quit now? Your active wager of ${money(
            round.wager
          )} is forfeited. (Y/N): `
        )
      ).toLowerCase();

      if (["y", "yes"].includes(confirm)) {
        session.losses += 1;

        renderGoodbye();
        rl.close();

        return;
      }

      round.status = "Game continues. Choose your action.";
      continue;
    }

    round.status = "⚠ Invalid action. Choose H, S, D, or Q.";
  }
}

async function playerTurn(round) {
  if (session.mode === "ai") {
    await aiTurn(round);
    return;
  }

  await manualPlayerTurn(round);
}

// ─────────────────────────────────────────────
// Mode and Betting
// ─────────────────────────────────────────────
async function chooseMode() {
  while (true) {
    renderLobby(
      "Choose a mode: [1] Manual Play  [2] AI Auto-Play"
    );

    const input = (
      await ask("\nSelect mode (1/2 or EXIT): ")
    ).toLowerCase();

    if (["1", "m", "manual"].includes(input)) {
      session.mode = "manual";
      return true;
    }

    if (["2", "a", "ai", "auto"].includes(input)) {
      session.mode = "ai";
      return true;
    }

    if (isExitInput(input)) {
      return false;
    }
  }
}

function getAIBet() {
  const percentageBet = Math.floor(
    session.balance * AI_BET_PERCENT
  );

  const wager = Math.max(MIN_BET, percentageBet);

  return Number(Math.min(session.balance, wager).toFixed(2));
}

async function getBet() {
  if (session.mode === "ai") {
    const bet = getAIBet();

    renderLobby(
      `🤖 AI places a ${money(bet)} wager ` +
        `(${Math.round(AI_BET_PERCENT * 100)}% bankroll strategy).`
    );

    await wait(AI_ACTION_DELAY);

    return bet;
  }

  let message = `Minimum bet is ${money(MIN_BET)}.`;

  while (true) {
    renderLobby(message);

    const input = await ask("\nEnter your bet amount: ");

    if (isExitInput(input)) {
      return null;
    }

    const bet = parseBet(input);

    if (
      bet === null ||
      bet < MIN_BET ||
      bet > session.balance
    ) {
      message =
        `⚠ Enter a bet from ${money(MIN_BET)} ` +
        `to ${money(session.balance)}.`;

      continue;
    }

    return Number(bet.toFixed(2));
  }
}

// ─────────────────────────────────────────────
// Game Flow
// ─────────────────────────────────────────────
async function playHand(bet) {
  session.balance = Number(
    (session.balance - bet).toFixed(2)
  );

  const round = createRound(bet);

  await offerInsurance(round);

  const completedByNatural = await resolveNaturals(round);

  if (!completedByNatural) {
    await playerTurn(round);
  }

  return round.settled;
}

async function askPlayAgain() {
  if (session.mode === "ai") {
    renderLobby("🤖 AI is preparing the next hand...");
    await wait(AI_AUTO_CONTINUE_DELAY);

    session.handNumber += 1;

    return true;
  }

  while (true) {
    const input = (
      await ask("\nPlay another hand? (Y/N): ")
    ).toLowerCase();

    if (["y", "yes"].includes(input)) {
      session.handNumber += 1;
      return true;
    }

    if (["n", "no"].includes(input) || isExitInput(input)) {
      return false;
    }

    console.log("Please enter Y or N.");
  }
}

async function startGame() {
  const modeSelected = await chooseMode();

  if (!modeSelected) {
    renderGoodbye();
    rl.close();

    return;
  }

  while (session.balance >= MIN_BET) {
    const bet = await getBet();

    if (bet === null) {
      renderGoodbye();
      rl.close();

      return;
    }

    const finishedNormally = await playHand(bet);

    if (!finishedNormally) {
      return;
    }

    if (session.balance < MIN_BET) {
      renderLobby(
        `💸 You do not have enough cash for the ${money(
          MIN_BET
        )} minimum bet.`
      );

      if (session.mode === "manual") {
        await ask("\nPress Enter to finish...");
      } else {
        await wait(AI_AUTO_CONTINUE_DELAY);
      }

      break;
    }

    const continueGame = await askPlayAgain();

    if (!continueGame) {
      break;
    }
  }

  renderGoodbye();
  rl.close();
}

// ─────────────────────────────────────────────
// Start Game
// ─────────────────────────────────────────────
startGame().catch((error) => {
  clearScreen();
  console.error("An unexpected error occurred:", error.message);
  rl.close();
});