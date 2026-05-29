const readline = require("readline");
const { randomInt } = require("crypto");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ─────────────────────────────────────────────
// Game Settings
// ─────────────────────────────────────────────
const CHOICES = {
  rock: {
    name: "Rock",
    icon: "✊",
    beats: "scissors",
  },
  paper: {
    name: "Paper",
    icon: "✋",
    beats: "rock",
  },
  scissors: {
    name: "Scissors",
    icon: "✌️",
    beats: "paper",
  },
};

const INPUT_MAP = {
  r: "rock",
  rock: "rock",
  p: "paper",
  paper: "paper",
  s: "scissors",
  scissors: "scissors",
};

const TARGET_SCORE = 3;

const state = {
  matchNumber: 1,
  roundNumber: 0,
  playerScore: 0,
  computerScore: 0,
  ties: 0,
  history: [],
  lastPlayerChoice: null,
  lastComputerChoice: null,
  lastResult: "",
  status: "First to 3 wins the match. Choose your move.",
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
  return ["e", "exit", "q", "quit"].includes(input.toLowerCase());
}

function formatChoice(choice) {
  if (!choice) {
    return "—";
  }

  return `${CHOICES[choice].icon} ${CHOICES[choice].name}`;
}

function resetMatch() {
  state.roundNumber = 0;
  state.playerScore = 0;
  state.computerScore = 0;
  state.ties = 0;
  state.history = [];
  state.lastPlayerChoice = null;
  state.lastComputerChoice = null;
  state.lastResult = "";
  state.status = "First to 3 wins the match. Choose your move.";
}

// ─────────────────────────────────────────────
// Screen Rendering
// ─────────────────────────────────────────────
function renderGame(extraStatus = "") {
  clearScreen();

  console.log("══════════════════════════════════════════════════════");
  console.log("            ✊  ROCK PAPER SCISSORS  ✋");
  console.log("══════════════════════════════════════════════════════");
  console.log(
    ` Match: ${state.matchNumber}       First to: ${TARGET_SCORE}       Rounds: ${state.roundNumber}`
  );
  console.log("──────────────────────────────────────────────────────");
  console.log(
    ` Score:  You ${state.playerScore}   |   Computer ${state.computerScore}   |   Ties ${state.ties}`
  );
  console.log("──────────────────────────────────────────────────────");

  if (state.lastResult) {
    console.log(` You chose:      ${formatChoice(state.lastPlayerChoice)}`);
    console.log(` Computer chose: ${formatChoice(state.lastComputerChoice)}`);
    console.log(` Result:         ${state.lastResult}`);
    console.log("──────────────────────────────────────────────────────");
  }

  console.log(` ${extraStatus || state.status}`);
  console.log("──────────────────────────────────────────────────────");
  console.log(" Moves:  (R) Rock ✊    (P) Paper ✋    (S) Scissors ✌️");
  console.log(" Type E or EXIT to quit.");
  console.log("══════════════════════════════════════════════════════");

  if (state.history.length > 0) {
    console.log("\n Recent Rounds:");

    for (const round of state.history.slice(-5).reverse()) {
      console.log(
        `  #${round.round}: ${formatChoice(round.player)} vs ${formatChoice(
          round.computer
        )} — ${round.summary}`
      );
    }
  }
}

function renderThinking(playerChoice, animation) {
  clearScreen();

  console.log("══════════════════════════════════════════════════════");
  console.log("            ✊  ROCK PAPER SCISSORS  ✋");
  console.log("══════════════════════════════════════════════════════");
  console.log(` You chose: ${formatChoice(playerChoice)}`);
  console.log("──────────────────────────────────────────────────────");
  console.log(` Computer is choosing${animation}`);
  console.log("══════════════════════════════════════════════════════");
}

function renderMatchResult(winner) {
  renderGame();

  console.log("\n══════════════════════════════════════════════════════");

  if (winner === "player") {
    console.log(" 🏆 YOU WIN THE MATCH!");
  } else {
    console.log(" 🤖 COMPUTER WINS THE MATCH!");
  }

  console.log(
    ` Final Score: You ${state.playerScore} - ${state.computerScore} Computer`
  );
  console.log("══════════════════════════════════════════════════════");
}

function renderExitScreen() {
  clearScreen();

  console.log("══════════════════════════════════════════════════════");
  console.log("                    👋 GAME OVER");
  console.log("══════════════════════════════════════════════════════");
  console.log(` Last match number: ${state.matchNumber}`);
  console.log(
    ` Last match score: You ${state.playerScore} - ${state.computerScore} Computer`
  );
  console.log(` Rounds played in last match: ${state.roundNumber}`);
  console.log(" Thanks for playing Rock Paper Scissors!");
  console.log("══════════════════════════════════════════════════════");
}

// ─────────────────────────────────────────────
// Game Logic
// ─────────────────────────────────────────────
function getComputerChoice() {
  const choices = Object.keys(CHOICES);

  return choices[randomInt(0, choices.length)];
}

function determineWinner(playerChoice, computerChoice) {
  if (playerChoice === computerChoice) {
    return "tie";
  }

  return CHOICES[playerChoice].beats === computerChoice
    ? "player"
    : "computer";
}

function recordRound(playerChoice, computerChoice, winner) {
  state.roundNumber += 1;
  state.lastPlayerChoice = playerChoice;
  state.lastComputerChoice = computerChoice;

  let summary;

  if (winner === "player") {
    state.playerScore += 1;
    state.lastResult = "🎉 You win this round!";
    summary = "You win";
  } else if (winner === "computer") {
    state.computerScore += 1;
    state.lastResult = "😈 Computer wins this round!";
    summary = "Computer wins";
  } else {
    state.ties += 1;
    state.lastResult = "🤝 It is a tie!";
    summary = "Tie";
  }

  state.history.push({
    round: state.roundNumber,
    player: playerChoice,
    computer: computerChoice,
    summary,
  });
}

async function getPlayerChoice() {
  while (true) {
    renderGame();

    const input = (
      await ask("\nChoose Rock, Paper, or Scissors: ")
    ).toLowerCase();

    if (isExitInput(input)) {
      return null;
    }

    if (INPUT_MAP[input]) {
      return INPUT_MAP[input];
    }

    state.status =
      "⚠ Invalid choice. Enter R, P, S, Rock, Paper, or Scissors.";
  }
}

async function playRound() {
  const playerChoice = await getPlayerChoice();

  if (playerChoice === null) {
    return { exit: true };
  }

  renderThinking(playerChoice, ".");
  await wait(350);

  renderThinking(playerChoice, "..");
  await wait(350);

  renderThinking(playerChoice, "...");
  await wait(350);

  const computerChoice = getComputerChoice();
  const winner = determineWinner(playerChoice, computerChoice);

  recordRound(playerChoice, computerChoice, winner);

  state.status = "Choose your next move.";

  renderGame();

  return { exit: false };
}

async function waitForNextRound() {
  while (true) {
    const answer = (
      await ask("\nPlay next round? (Y/N): ")
    ).toLowerCase();

    if (["y", "yes"].includes(answer)) {
      return true;
    }

    if (["n", "no"].includes(answer) || isExitInput(answer)) {
      return false;
    }

    renderGame("⚠ Invalid choice. Enter Y or N.");
  }
}

async function askNewMatch() {
  while (true) {
    const answer = (
      await ask("\nPlay a new match? (Y/N): ")
    ).toLowerCase();

    if (["y", "yes"].includes(answer)) {
      state.matchNumber += 1;
      resetMatch();
      return true;
    }

    if (["n", "no"].includes(answer) || isExitInput(answer)) {
      return false;
    }

    renderMatchResult(
      state.playerScore >= TARGET_SCORE ? "player" : "computer"
    );

    console.log("\n⚠ Please enter Y or N.");
  }
}

async function playMatch() {
  while (
    state.playerScore < TARGET_SCORE &&
    state.computerScore < TARGET_SCORE
  ) {
    const result = await playRound();

    if (result.exit) {
      return {
        exit: true,
        finished: false,
      };
    }

    if (
      state.playerScore >= TARGET_SCORE ||
      state.computerScore >= TARGET_SCORE
    ) {
      break;
    }

    const nextRound = await waitForNextRound();

    if (!nextRound) {
      return {
        exit: true,
        finished: false,
      };
    }
  }

  const winner =
    state.playerScore >= TARGET_SCORE ? "player" : "computer";

  renderMatchResult(winner);

  return {
    exit: false,
    finished: true,
  };
}

async function startGame() {
  resetMatch();

  while (true) {
    const result = await playMatch();

    if (result.exit) {
      renderExitScreen();
      rl.close();
      return;
    }

    const newMatch = await askNewMatch();

    if (!newMatch) {
      renderExitScreen();
      rl.close();
      return;
    }
  }
}

// ─────────────────────────────────────────────
// Start Game
// ─────────────────────────────────────────────
startGame().catch((error) => {
  clearScreen();
  console.error("An unexpected error occurred:", error.message);
  rl.close();
});