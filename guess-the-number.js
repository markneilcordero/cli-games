const readline = require("readline");
const { randomInt } = require("crypto");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ─────────────────────────────────────────────
// Game Settings
// ─────────────────────────────────────────────
const DIFFICULTIES = {
  "1": { name: "Easy", min: 1, max: 50, attempts: 15 },
  "2": { name: "Medium", min: 1, max: 100, attempts: 10 },
  "3": { name: "Hard", min: 1, max: 500, attempts: 7 },
};

const MAX_CUSTOM_RANGE_SIZE = 1_000_000;
const MAX_CUSTOM_ATTEMPTS = 100;

const stats = {
  completedRounds: 0,
  wins: 0,
  losses: 0,
  totalGuesses: 0,
  bestWin: null,
};

let roundNumber = 1;

// ─────────────────────────────────────────────
// CLI Helpers
// ─────────────────────────────────────────────
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function clearScreen() {
  process.stdout.write("\x1Bc");
}

function isExitInput(input) {
  return ["e", "exit", "q", "quit"].includes(input.toLowerCase());
}

function parseInteger(input) {
  if (!/^-?\d+$/.test(input.trim())) {
    return null;
  }

  const value = Number(input);

  return Number.isSafeInteger(value) ? value : null;
}

function generateRandomNumber(min, max) {
  return randomInt(min, max + 1);
}

function formatGuessHistory(guesses) {
  return guesses.length ? guesses.join(", ") : "None yet";
}

function statsText() {
  const best = stats.bestWin === null ? "—" : `${stats.bestWin} guess(es)`;

  return (
    `Completed: ${stats.completedRounds}   Wins: ${stats.wins}   ` +
    `Losses: ${stats.losses}   Best win: ${best}`
  );
}

// ─────────────────────────────────────────────
// Screens
// ─────────────────────────────────────────────
function renderWelcome(status = "Choose a difficulty to begin.") {
  clearScreen();

  console.log("════════════════════════════════════════════════════");
  console.log("             🎮 GUESS THE NUMBER 🎮");
  console.log("════════════════════════════════════════════════════");
  console.log(` ${statsText()}`);
  console.log("────────────────────────────────────────────────────");
  console.log(" The computer chooses a secret whole number.");
  console.log(" Each valid new guess uses one attempt.");
  console.log(" Enter E or EXIT at any prompt to quit.");
  console.log("────────────────────────────────────────────────────");
  console.log(" 1. Easy       Range: 1 - 50       Attempts: 15");
  console.log(" 2. Medium     Range: 1 - 100      Attempts: 10");
  console.log(" 3. Hard       Range: 1 - 500      Attempts: 7");
  console.log(" 4. Custom Range");
  console.log("────────────────────────────────────────────────────");
  console.log(` ${status}`);
  console.log("════════════════════════════════════════════════════");
}

function renderCustomSetup(status = "Set your custom game. Enter B to go back.") {
  clearScreen();

  console.log("════════════════════════════════════════════════════");
  console.log("              ⚙️ CUSTOM DIFFICULTY");
  console.log("════════════════════════════════════════════════════");
  console.log(" Create a range of up to 1,000,000 possible numbers.");
  console.log(` Choose from 1 to ${MAX_CUSTOM_ATTEMPTS} attempts.`);
  console.log(" Enter B to return, or E / EXIT to quit.");
  console.log("────────────────────────────────────────────────────");
  console.log(` ${status}`);
  console.log("════════════════════════════════════════════════════");
}

function renderRound(game, status = "Enter your guess.") {
  clearScreen();

  console.log("════════════════════════════════════════════════════");
  console.log("             🎮 GUESS THE NUMBER 🎮");
  console.log("════════════════════════════════════════════════════");
  console.log(
    ` Round: ${roundNumber}       Difficulty: ${game.name}       Attempts left: ${game.remainingAttempts}/${game.maxAttempts}`
  );
  console.log(` Original range: ${game.min} to ${game.max}`);
  console.log(
    ` Possible range: ${game.lowestPossible} to ${game.highestPossible}`
  );
  console.log("────────────────────────────────────────────────────");
  console.log(` Guesses: ${formatGuessHistory(game.guesses)}`);
  console.log("────────────────────────────────────────────────────");
  console.log(` ${status}`);
  console.log("════════════════════════════════════════════════════");
}

function renderRoundResult(game, won, usedAttempts) {
  clearScreen();

  console.log("════════════════════════════════════════════════════");
  console.log("             🎮 GUESS THE NUMBER 🎮");
  console.log("════════════════════════════════════════════════════");

  if (won) {
    console.log(` 🎉 Correct! The secret number was ${game.secretNumber}.`);
    console.log(` You won in ${usedAttempts} guess(es).`);
  } else {
    console.log(" ❌ You are out of attempts.");
    console.log(` The secret number was ${game.secretNumber}.`);
  }

  console.log("────────────────────────────────────────────────────");
  console.log(` Difficulty: ${game.name}`);
  console.log(` Your guesses: ${formatGuessHistory(game.guesses)}`);
  console.log(` ${statsText()}`);
  console.log("════════════════════════════════════════════════════");
}

function renderExitScreen() {
  clearScreen();

  console.log("════════════════════════════════════════════════════");
  console.log("                  👋 GAME OVER");
  console.log("════════════════════════════════════════════════════");
  console.log(` ${statsText()}`);
  console.log(" Thanks for playing Guess the Number!");
  console.log("════════════════════════════════════════════════════");
}

// ─────────────────────────────────────────────
// Difficulty Setup
// ─────────────────────────────────────────────
async function chooseDifficulty() {
  let status = "Choose a difficulty to begin.";

  while (true) {
    renderWelcome(status);

    const input = (await ask("\nEnter your choice (1-4): ")).toLowerCase();

    if (isExitInput(input)) {
      return { exit: true };
    }

    if (DIFFICULTIES[input]) {
      return {
        exit: false,
        settings: { ...DIFFICULTIES[input] },
      };
    }

    if (input === "4") {
      const customSettings = await createCustomDifficulty();

      if (customSettings.exit) {
        return customSettings;
      }

      if (!customSettings.back) {
        return customSettings;
      }

      status = "Returned from custom settings. Choose a difficulty.";
      continue;
    }

    status = "⚠ Invalid choice. Enter 1, 2, 3, or 4.";
  }
}

async function createCustomDifficulty() {
  while (true) {
    renderCustomSetup();

    const minimumInput = await ask("\nEnter minimum number: ");

    if (isExitInput(minimumInput)) {
      return { exit: true };
    }

    if (minimumInput.toLowerCase() === "b") {
      return { back: true };
    }

    const min = parseInteger(minimumInput);

    if (min === null) {
      renderCustomSetup("⚠ Minimum must be a whole number.");
      await ask("\nPress Enter to try again...");
      continue;
    }

    renderCustomSetup(`Minimum selected: ${min}`);

    const maximumInput = await ask("\nEnter maximum number: ");

    if (isExitInput(maximumInput)) {
      return { exit: true };
    }

    if (maximumInput.toLowerCase() === "b") {
      return { back: true };
    }

    const max = parseInteger(maximumInput);

    if (max === null || max <= min) {
      renderCustomSetup(
        "⚠ Maximum must be a whole number greater than the minimum."
      );
      await ask("\nPress Enter to try again...");
      continue;
    }

    if (max - min + 1 > MAX_CUSTOM_RANGE_SIZE) {
      renderCustomSetup(
        "⚠ Custom range is too large. Maximum size is 1,000,000 numbers."
      );
      await ask("\nPress Enter to try again...");
      continue;
    }

    renderCustomSetup(`Range selected: ${min} to ${max}`);

    const attemptsInput = await ask(
      `\nEnter maximum attempts (1-${MAX_CUSTOM_ATTEMPTS}): `
    );

    if (isExitInput(attemptsInput)) {
      return { exit: true };
    }

    if (attemptsInput.toLowerCase() === "b") {
      return { back: true };
    }

    const attempts = parseInteger(attemptsInput);

    if (
      attempts === null ||
      attempts < 1 ||
      attempts > MAX_CUSTOM_ATTEMPTS
    ) {
      renderCustomSetup(
        `⚠ Attempts must be a whole number from 1 to ${MAX_CUSTOM_ATTEMPTS}.`
      );
      await ask("\nPress Enter to try again...");
      continue;
    }

    return {
      exit: false,
      settings: {
        name: "Custom",
        min,
        max,
        attempts,
      },
    };
  }
}

// ─────────────────────────────────────────────
// Round Logic
// ─────────────────────────────────────────────
function createRound(settings) {
  return {
    ...settings,
    secretNumber: generateRandomNumber(settings.min, settings.max),
    remainingAttempts: settings.attempts,
    maxAttempts: settings.attempts,
    lowestPossible: settings.min,
    highestPossible: settings.max,
    guesses: [],
  };
}

function recordCompletedRound(won, guessesUsed) {
  stats.completedRounds += 1;
  stats.totalGuesses += guessesUsed;

  if (won) {
    stats.wins += 1;

    stats.bestWin =
      stats.bestWin === null
        ? guessesUsed
        : Math.min(stats.bestWin, guessesUsed);
  } else {
    stats.losses += 1;
  }
}

async function playRound(settings) {
  const game = createRound(settings);

  let status =
    `I picked a number from ${game.min} to ${game.max}. ` +
    "Make your first guess!";

  while (game.remainingAttempts > 0) {
    renderRound(game, status);

    const input = await ask("\nEnter your guess, or E to exit: ");

    if (isExitInput(input)) {
      return { exit: true };
    }

    const guess = parseInteger(input);

    if (guess === null || guess < game.min || guess > game.max) {
      status =
        `⚠ Enter a whole number from ${game.min} to ${game.max}. ` +
        "No attempt used.";
      continue;
    }

    if (game.guesses.includes(guess)) {
      status = `⚠ You already guessed ${guess}. No attempt used.`;
      continue;
    }

    game.guesses.push(guess);
    game.remainingAttempts -= 1;

    if (guess === game.secretNumber) {
      const usedAttempts = game.guesses.length;

      recordCompletedRound(true, usedAttempts);
      renderRoundResult(game, true, usedAttempts);

      return { exit: false };
    }

    if (guess < game.secretNumber) {
      game.lowestPossible = Math.max(game.lowestPossible, guess + 1);
      status = `📢 ${guess} is too low. Try a higher number.`;
    } else {
      game.highestPossible = Math.min(game.highestPossible, guess - 1);
      status = `📢 ${guess} is too high. Try a lower number.`;
    }
  }

  recordCompletedRound(false, game.guesses.length);
  renderRoundResult(game, false, game.guesses.length);

  return { exit: false };
}

async function askReplay() {
  while (true) {
    const answer = (
      await ask("\nPlay another round? (Y/N): ")
    ).toLowerCase();

    if (["y", "yes"].includes(answer)) {
      roundNumber += 1;
      return true;
    }

    if (["n", "no"].includes(answer) || isExitInput(answer)) {
      return false;
    }

    console.log("Please enter Y or N.");
  }
}

// ─────────────────────────────────────────────
// Main Game Loop
// ─────────────────────────────────────────────
async function startGame() {
  while (true) {
    const selection = await chooseDifficulty();

    if (selection.exit) {
      renderExitScreen();
      rl.close();
      return;
    }

    const result = await playRound(selection.settings);

    if (result.exit) {
      renderExitScreen();
      rl.close();
      return;
    }

    const playAgain = await askReplay();

    if (!playAgain) {
      renderExitScreen();
      rl.close();
      return;
    }
  }
}

startGame().catch((error) => {
  clearScreen();
  console.error("An unexpected error occurred:", error.message);
  rl.close();
});