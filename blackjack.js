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
// ─────────────────────────────────────────────
const STARTING_BALANCE = 500;
const MIN_BET = 5;

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

async function offerInsurance(round) {
  if (round.dealerHand[0].rank !== "A") {
    return;
  }

  const insuranceAmount = Number((round.originalBet / 2).toFixed(2));

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
  await wait(500);

  while (handValue(round.dealerHand).total < 17) {
    const card = drawCard(round);

    round.dealerHand.push(card);

    renderRound(round, `Dealer draws ${cardText(card)}.`);
    await wait(500);
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
// Player Turn
// ─────────────────────────────────────────────
async function playerTurn(round) {
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
      const card = drawCard(round);

      round.playerHand.push(card);
      firstDecision = false;

      const player = handValue(round.playerHand);

      if (player.bust) {
        settleRound(
          round,
          "loss",
          0,
          `💥 You drew ${cardText(card)} and busted with ${player.total}. ` +
            `You lose ${money(round.wager)}.`
        );

        return;
      }

      round.status =
        `You drew ${cardText(card)}. Your total is ${player.total}.`;

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
          `💥 You doubled down, drew ${cardText(card)}, ` +
            `and busted with ${player.total}. ` +
            `You lose ${money(round.wager)}.`
        );

        return;
      }

      round.status =
        `You doubled down and drew ${cardText(card)}. Dealer now plays.`;

      await dealerTurn(round);

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

// ─────────────────────────────────────────────
// Game Flow
// ─────────────────────────────────────────────
async function getBet() {
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

      await ask("\nPress Enter to finish...");

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