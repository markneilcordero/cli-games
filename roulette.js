const readline = require("readline");
const { randomInt } = require("crypto");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ─────────────────────────────────────────────
// Game Settings: European Roulette (0 to 36)
// ─────────────────────────────────────────────
const STARTING_BALANCE = 1000;
const MIN_BET = 10;

const NUMBERS = Array.from({ length: 37 }, (_, index) => index);

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

const BLACK_NUMBERS = new Set([
  2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
]);

let balance = STARTING_BALANCE;
let bets = [];
let roundNumber = 1;
let lastMessage = "Place one or more bets, then spin the wheel.";

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

function formatMoney(amount) {
  return `$${amount.toLocaleString("en-US")}`;
}

function parseWholeNumber(input) {
  if (!/^\d+$/.test(input.trim())) {
    return null;
  }

  return Number(input);
}

function getColor(number) {
  if (number === 0) {
    return "green";
  }

  return RED_NUMBERS.has(number) ? "red" : "black";
}

function getBetDescription(bet) {
  switch (bet.type) {
    case "number":
      return `Number ${bet.value}`;

    case "color":
      return bet.value[0].toUpperCase() + bet.value.slice(1);

    case "oddEven":
      return bet.value[0].toUpperCase() + bet.value.slice(1);

    case "lowHigh":
      return bet.value === "low" ? "Low (1-18)" : "High (19-36)";

    default:
      return "Unknown Bet";
  }
}

function pendingBetTotal() {
  return bets.reduce((total, bet) => total + bet.amount, 0);
}

function renderScreen(extraLines = []) {
  clearScreen();

  console.log("══════════════════════════════════════════════════");
  console.log("            🎰 CLI EUROPEAN ROULETTE 🎰");
  console.log("══════════════════════════════════════════════════");
  console.log(
    ` Round: ${roundNumber}                  Balance: ${formatMoney(balance)}`,
  );
  console.log(" Wheel: Single zero (0-36)          Minimum bet: $10");
  console.log("──────────────────────────────────────────────────");

  if (bets.length === 0) {
    console.log(" Current bets: No bets placed.");
  } else {
    console.log(
      ` Current bets: ${bets.length}    Total on table: ${formatMoney(
        pendingBetTotal(),
      )}`,
    );

    bets.forEach((bet, index) => {
      console.log(
        `  ${index + 1}. ${getBetDescription(bet).padEnd(18)} ${formatMoney(
          bet.amount,
        ).padStart(8)}   pays ${bet.profitOdds}:1`,
      );
    });
  }

  console.log("──────────────────────────────────────────────────");
  console.log(` ${lastMessage}`);

  for (const line of extraLines) {
    console.log(line);
  }

  console.log("──────────────────────────────────────────────────");
  console.log(" 1. Single Number (0-36)        Profit payout: 35:1");
  console.log(" 2. Color (Red / Black)         Profit payout:  1:1");
  console.log(" 3. Odd / Even                  Profit payout:  1:1");
  console.log(" 4. Low / High                  Profit payout:  1:1");
  console.log(" 5. Spin the wheel");
  console.log(" 6. Clear current bets and refund them");
  console.log(" 7. Exit game");
  console.log("══════════════════════════════════════════════════");
}

async function pause(message = "Press Enter to continue...") {
  await ask(`\n${message}`);
}

// ─────────────────────────────────────────────
// Bet Placement
// A winning return includes the original stake,
// because the bet is removed from balance when placed.
// ─────────────────────────────────────────────
async function askForAmount(bet) {
  if (balance < MIN_BET) {
    lastMessage =
      "You do not have enough available balance to place another bet.";
    return;
  }

  renderScreen([
    ` New bet: ${getBetDescription(bet)} (profit payout ${bet.profitOdds}:1)`,
  ]);

  const amountInput = await ask(
    `\nEnter bet amount (${formatMoney(MIN_BET)} - ${formatMoney(
      balance,
    )}) or C to cancel: `,
  );

  if (amountInput.toLowerCase() === "c") {
    lastMessage = "Bet cancelled.";
    return;
  }

  const amount = parseWholeNumber(amountInput);

  if (amount === null || amount < MIN_BET || amount > balance) {
    lastMessage = `Invalid amount. Enter a whole amount from ${formatMoney(
      MIN_BET,
    )} to ${formatMoney(balance)}.`;
    return;
  }

  bets.push({ ...bet, amount });
  balance -= amount;

  lastMessage = `Bet placed: ${formatMoney(amount)} on ${getBetDescription(
    bet,
  )}.`;
}

async function placeNumberBet() {
  renderScreen();

  const input = await ask("\nChoose a number from 0 to 36, or C to cancel: ");

  if (input.toLowerCase() === "c") {
    lastMessage = "Bet cancelled.";
    return;
  }

  const number = parseWholeNumber(input);

  if (number === null || !NUMBERS.includes(number)) {
    lastMessage = "Invalid number. Choose a whole number from 0 to 36.";
    return;
  }

  await askForAmount({
    type: "number",
    value: number,
    profitOdds: 35,
  });
}

async function placeColorBet() {
  renderScreen();

  const color = (
    await ask("\nChoose Red or Black, or C to cancel: ")
  ).toLowerCase();

  if (color === "c") {
    lastMessage = "Bet cancelled.";
    return;
  }

  if (!["red", "black"].includes(color)) {
    lastMessage = 'Invalid color. Enter "red" or "black".';
    return;
  }

  await askForAmount({
    type: "color",
    value: color,
    profitOdds: 1,
  });
}

async function placeOddEvenBet() {
  renderScreen();

  const choice = (
    await ask("\nChoose Odd or Even, or C to cancel: ")
  ).toLowerCase();

  if (choice === "c") {
    lastMessage = "Bet cancelled.";
    return;
  }

  if (!["odd", "even"].includes(choice)) {
    lastMessage = 'Invalid choice. Enter "odd" or "even".';
    return;
  }

  await askForAmount({
    type: "oddEven",
    value: choice,
    profitOdds: 1,
  });
}

async function placeLowHighBet() {
  renderScreen();

  const choice = (
    await ask("\nChoose Low (1-18) or High (19-36), or C to cancel: ")
  ).toLowerCase();

  if (choice === "c") {
    lastMessage = "Bet cancelled.";
    return;
  }

  if (!["low", "high"].includes(choice)) {
    lastMessage = 'Invalid choice. Enter "low" or "high".';
    return;
  }

  await askForAmount({
    type: "lowHigh",
    value: choice,
    profitOdds: 1,
  });
}

// ─────────────────────────────────────────────
// Roulette Results
// ─────────────────────────────────────────────
function isWinningBet(bet, winningNumber, winningColor) {
  switch (bet.type) {
    case "number":
      return bet.value === winningNumber;

    case "color":
      return bet.value === winningColor;

    case "oddEven":
      // In roulette, 0 is neither odd nor even.
      if (winningNumber === 0) {
        return false;
      }

      return bet.value === "odd"
        ? winningNumber % 2 !== 0
        : winningNumber % 2 === 0;

    case "lowHigh":
      // In roulette, 0 is neither low nor high.
      return bet.value === "low"
        ? winningNumber >= 1 && winningNumber <= 18
        : winningNumber >= 19 && winningNumber <= 36;

    default:
      return false;
  }
}

async function spinWheel() {
  if (bets.length === 0) {
    lastMessage = "Place at least one bet before spinning the wheel.";
    return true;
  }

  renderScreen();

  const confirmation = (
    await ask("\nSpin with the current bets? (Y/N) > ")
  ).toLowerCase();

  if (!["y", "yes"].includes(confirmation)) {
    lastMessage = "Spin cancelled. Your current bets remain on the table.";
    return true;
  }

  renderScreen(["", " 🎡 Spinning the wheel..."]);
  await wait(600);

  renderScreen(["", " 🎡 Spinning the wheel... ⚪"]);
  await wait(600);

  renderScreen(["", " 🎡 Spinning the wheel... ⚪ ⚪"]);
  await wait(600);

  // crypto.randomInt gives a random result from 0 through 36.
  const winningNumber = randomInt(0, 37);
  const winningColor = getColor(winningNumber);

  const results = [];
  let totalReturn = 0;

  const totalBetAmount = pendingBetTotal();
  for (const bet of bets) {
    if (isWinningBet(bet, winningNumber, winningColor)) {
      // Original stake is returned, plus the winnings.
      const returnedAmount = bet.amount * (bet.profitOdds + 1);
      const profit = bet.amount * bet.profitOdds;

      totalReturn += returnedAmount;

      results.push(
        ` ✅ ${getBetDescription(bet)}: returned ${formatMoney(
          returnedAmount,
        )} (${formatMoney(profit)} profit)`,
      );
    } else {
      results.push(
        ` ❌ ${getBetDescription(bet)}: lost ${formatMoney(bet.amount)}`,
      );
    }
  }

  balance += totalReturn;

  const netResult = totalReturn - totalBetAmount;

  let roundSummary;

  if (netResult > 0) {
    roundSummary = ` Round profit: +${formatMoney(netResult)}`;
  } else if (netResult < 0) {
    roundSummary = ` Round loss: -${formatMoney(Math.abs(netResult))}`;
  } else {
    roundSummary = " Round result: Break even";
  }
  bets = [];

  lastMessage = `Result: ${winningNumber} (${winningColor.toUpperCase()})`;

  renderScreen([
    "",
    ` 🎉 The ball landed on ${winningNumber} (${winningColor.toUpperCase()})!`,
    "",
    ...results,
    "",
    ` Total bet:           ${formatMoney(totalBetAmount)}`,
    ` Returned to balance: ${formatMoney(totalReturn)}`,
    roundSummary,
    ` New balance:         ${formatMoney(balance)}`,
  ]);

  roundNumber += 1;

  if (balance < MIN_BET) {
    console.log(
      `\nYou have less than the ${formatMoney(MIN_BET)} minimum bet.`,
    );
    console.log(`Game over! Final balance: ${formatMoney(balance)}.`);
    rl.close();
    return false;
  }

  await pause();

  lastMessage = "New round: place your bets, then spin the wheel.";
  return true;
}

function clearBets() {
  if (bets.length === 0) {
    lastMessage = "There are no current bets to clear.";
    return;
  }

  const refunded = pendingBetTotal();

  balance += refunded;
  bets = [];

  lastMessage = `Current bets cleared. Refunded ${formatMoney(refunded)}.`;
}

function exitGame() {
  if (bets.length > 0) {
    const refunded = pendingBetTotal();

    balance += refunded;
    bets = [];

    lastMessage = `Unspun bets refunded: ${formatMoney(refunded)}.`;
  }

  clearScreen();

  console.log("══════════════════════════════════════════════════");
  console.log("                 🏁 GAME OVER 🏁");
  console.log("══════════════════════════════════════════════════");
  console.log(` Final balance: ${formatMoney(balance)}`);
  console.log(" Thank you for playing CLI European Roulette!");
  console.log("══════════════════════════════════════════════════");

  rl.close();
}

// ─────────────────────────────────────────────
// Main Game Loop
// ─────────────────────────────────────────────
async function playRoulette() {
  renderScreen();

  await pause("Press Enter to start...");

  let playing = true;

  while (playing) {
    renderScreen();

    const input = (await ask("\nChoose an option (1-7): ")).toLowerCase();

    switch (input) {
      case "1":
        await placeNumberBet();
        break;

      case "2":
        await placeColorBet();
        break;

      case "3":
        await placeOddEvenBet();
        break;

      case "4":
        await placeLowHighBet();
        break;

      case "5":
      case "spin":
        playing = await spinWheel();
        break;

      case "6":
      case "clear":
        clearBets();
        break;

      case "7":
      case "exit":
        exitGame();
        playing = false;
        break;

      default:
        lastMessage = "Invalid option. Choose 1 to 7.";
        break;
    }
  }
}

playRoulette().catch((error) => {
  clearScreen();
  console.error("An unexpected error occurred:", error.message);
  rl.close();
});
