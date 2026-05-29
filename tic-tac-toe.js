const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ─────────────────────────────────────────────
// Game Settings
// ─────────────────────────────────────────────
const EMPTY = " ";
const X = "X";
const O = "O";
const AI_DELAY = 600;

const WIN_PATTERNS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const scores = {
  player: 0,
  ai: 0,
  playerOne: 0,
  playerTwo: 0,
  draws: 0,
};

let board = [];
let gameNumber = 1;
let gameMode = null; // "ai" or "pvp"
let humanSymbol = X;
let aiSymbol = O;
let currentSymbol = X;
let statusMessage = "";

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

function createBoard() {
  return Array(9).fill(EMPTY);
}

function displayedCell(index) {
  return board[index] === EMPTY ? String(index + 1) : board[index];
}

function opponentOf(symbol) {
  return symbol === X ? O : X;
}

// ─────────────────────────────────────────────
// Screen Rendering
// ─────────────────────────────────────────────
function scoreText() {
  if (gameMode === "ai") {
    return `You ${scores.player} - ${scores.ai} AI   |   Draws ${scores.draws}`;
  }

  if (gameMode === "pvp") {
    return (
      `Player X ${scores.playerOne} - ${scores.playerTwo} Player O` +
      `   |   Draws ${scores.draws}`
    );
  }

  return `Draws ${scores.draws}`;
}

function renderBoard(message = statusMessage) {
  clearScreen();

  console.log("══════════════════════════════════════");
  console.log("          ❌ TIC-TAC-TOE ⭕");
  console.log("══════════════════════════════════════");
  console.log(` Game ${gameNumber}   ${scoreText()}`);

  if (gameMode === "ai") {
    console.log(` You: ${humanSymbol}     AI: ${aiSymbol}`);
  } else {
    console.log(" Player 1: X     Player 2: O");
  }

  console.log("──────────────────────────────────────");
  console.log(
    `             ${displayedCell(0)} | ${displayedCell(1)} | ${displayedCell(2)}`
  );
  console.log("            ---+---+---");
  console.log(
    `             ${displayedCell(3)} | ${displayedCell(4)} | ${displayedCell(5)}`
  );
  console.log("            ---+---+---");
  console.log(
    `             ${displayedCell(6)} | ${displayedCell(7)} | ${displayedCell(8)}`
  );
  console.log("──────────────────────────────────────");

  for (const line of String(message).split("\n")) {
    console.log(` ${line}`);
  }

  console.log(" Type E or EXIT during a turn to quit.");
  console.log("══════════════════════════════════════");
}

function renderMenu(message = "Choose a game mode.") {
  clearScreen();

  console.log("══════════════════════════════════════");
  console.log("          ❌ TIC-TAC-TOE ⭕");
  console.log("══════════════════════════════════════");
  console.log(" 1. Player vs AI");
  console.log(" 2. Player vs Player");
  console.log(" 3. Exit Game");
  console.log("──────────────────────────────────────");
  console.log(` ${message}`);
  console.log("══════════════════════════════════════");
}

function renderExitScreen() {
  clearScreen();

  console.log("══════════════════════════════════════");
  console.log("              GAME OVER");
  console.log("══════════════════════════════════════");

  if (gameMode === "ai") {
    console.log(` Final Score: You ${scores.player} - ${scores.ai} AI`);
  } else if (gameMode === "pvp") {
    console.log(
      ` Final Score: Player X ${scores.playerOne} - ${scores.playerTwo} Player O`
    );
  }

  console.log(` Draws: ${scores.draws}`);
  console.log(" Thanks for playing Tic-Tac-Toe!");
  console.log("══════════════════════════════════════");
}

// ─────────────────────────────────────────────
// Board Rules
// ─────────────────────────────────────────────
function checkWinner(gameBoard, symbol) {
  return WIN_PATTERNS.some((pattern) =>
    pattern.every((index) => gameBoard[index] === symbol)
  );
}

function isDraw(gameBoard) {
  return gameBoard.every((cell) => cell !== EMPTY);
}

function availableMoves(gameBoard) {
  return gameBoard
    .map((cell, index) => (cell === EMPTY ? index : null))
    .filter((index) => index !== null);
}

// ─────────────────────────────────────────────
// Minimax AI
// Evaluates the simulated board passed into it.
// ─────────────────────────────────────────────
function minimax(gameBoard, activeSymbol, depth = 0) {
  if (checkWinner(gameBoard, aiSymbol)) {
    return { score: 10 - depth };
  }

  if (checkWinner(gameBoard, humanSymbol)) {
    return { score: depth - 10 };
  }

  const moves = availableMoves(gameBoard);

  if (moves.length === 0) {
    return { score: 0 };
  }

  const possibleMoves = moves.map((index) => {
    gameBoard[index] = activeSymbol;

    const evaluation = minimax(
      gameBoard,
      opponentOf(activeSymbol),
      depth + 1
    );

    gameBoard[index] = EMPTY;

    return {
      index,
      score: evaluation.score,
    };
  });

  if (activeSymbol === aiSymbol) {
    return possibleMoves.reduce((best, move) =>
      move.score > best.score ? move : best
    );
  }

  return possibleMoves.reduce((best, move) =>
    move.score < best.score ? move : best
  );
}

// ─────────────────────────────────────────────
// Setup Menus
// ─────────────────────────────────────────────
async function chooseGameMode() {
  let message = "Choose a game mode.";

  while (true) {
    renderMenu(message);

    const choice = (await ask("\nEnter choice (1-3): ")).toLowerCase();

    if (choice === "1") {
      gameMode = "ai";
      return true;
    }

    if (choice === "2") {
      gameMode = "pvp";
      return true;
    }

    if (choice === "3" || isExitInput(choice)) {
      return false;
    }

    message = "⚠ Invalid option. Enter 1, 2, or 3.";
  }
}

async function chooseHumanSymbol() {
  let message = "Choose whether you want to play first or second.";

  while (true) {
    clearScreen();

    console.log("══════════════════════════════════════");
    console.log("           CHOOSE YOUR SYMBOL");
    console.log("══════════════════════════════════════");
    console.log(" 1. X — You move first");
    console.log(" 2. O — AI moves first");
    console.log(" 3. Back to menu");
    console.log("──────────────────────────────────────");
    console.log(` ${message}`);
    console.log("══════════════════════════════════════");

    const choice = (await ask("\nEnter choice (1-3): ")).toLowerCase();

    if (choice === "1") {
      humanSymbol = X;
      aiSymbol = O;
      return "selected";
    }

    if (choice === "2") {
      humanSymbol = O;
      aiSymbol = X;
      return "selected";
    }

    if (choice === "3") {
      return "back";
    }

    if (isExitInput(choice)) {
      return "exit";
    }

    message = "⚠ Invalid option. Enter 1, 2, or 3.";
  }
}

// ─────────────────────────────────────────────
// Turn Logic
// ─────────────────────────────────────────────
async function getHumanMove(symbol, label) {
  while (true) {
    renderBoard(statusMessage);

    const input = await ask(
      `\n${label} (${symbol}) — choose position (1-9): `
    );

    if (isExitInput(input)) {
      return null;
    }

    if (!/^[1-9]$/.test(input)) {
      statusMessage = "⚠ Invalid move. Enter one number from 1 to 9.";
      continue;
    }

    const index = Number(input) - 1;

    if (board[index] !== EMPTY) {
      statusMessage =
        `⚠ Position ${input} is already occupied. Choose another.`;
      continue;
    }

    return index;
  }
}

async function makeAiMove() {
  renderBoard("🤖 AI is thinking...");
  await wait(AI_DELAY);

  const bestMove = minimax([...board], aiSymbol);

  if (bestMove.index === undefined) {
    return null;
  }

  board[bestMove.index] = aiSymbol;
  statusMessage =
    `🤖 AI placed ${aiSymbol} at position ${bestMove.index + 1}.`;

  return bestMove.index;
}

function finishRound(winner) {
  if (winner === "draw") {
    scores.draws += 1;
    statusMessage = "🤝 It is a draw!";
    return;
  }

  if (gameMode === "ai") {
    if (winner === humanSymbol) {
      scores.player += 1;
      statusMessage = `🎉 You win with ${humanSymbol}!`;
    } else {
      scores.ai += 1;
      statusMessage = `🤖 AI wins with ${aiSymbol}!`;
    }

    return;
  }

  if (winner === X) {
    scores.playerOne += 1;
    statusMessage = "🎉 Player 1 (X) wins!";
  } else {
    scores.playerTwo += 1;
    statusMessage = "🎉 Player 2 (O) wins!";
  }
}

async function playAgainstAi() {
  currentSymbol = X;

  statusMessage =
    humanSymbol === X
      ? "You move first. Choose an open position."
      : "AI moves first.";

  while (true) {
    if (currentSymbol === humanSymbol) {
      const move = await getHumanMove(humanSymbol, "Your turn");

      if (move === null) {
        return "exit";
      }

      board[move] = humanSymbol;
      statusMessage =
        `You placed ${humanSymbol} at position ${move + 1}.`;

      if (checkWinner(board, humanSymbol)) {
        finishRound(humanSymbol);
        renderBoard();
        return "finished";
      }
    } else {
      await makeAiMove();

      if (checkWinner(board, aiSymbol)) {
        finishRound(aiSymbol);
        renderBoard();
        return "finished";
      }
    }

    if (isDraw(board)) {
      finishRound("draw");
      renderBoard();
      return "finished";
    }

    currentSymbol = opponentOf(currentSymbol);
  }
}

async function playPlayerVsPlayer() {
  currentSymbol = X;
  statusMessage = "Player 1 begins. Choose an open position.";

  while (true) {
    const label = currentSymbol === X ? "Player 1" : "Player 2";
    const move = await getHumanMove(currentSymbol, label);

    if (move === null) {
      return "exit";
    }

    board[move] = currentSymbol;
    statusMessage =
      `${label} placed ${currentSymbol} at position ${move + 1}.`;

    if (checkWinner(board, currentSymbol)) {
      finishRound(currentSymbol);
      renderBoard();
      return "finished";
    }

    if (isDraw(board)) {
      finishRound("draw");
      renderBoard();
      return "finished";
    }

    currentSymbol = opponentOf(currentSymbol);
  }
}

async function askReplay() {
  while (true) {
    const answer = (await ask("\nPlay again? (Y/N): ")).toLowerCase();

    if (["y", "yes"].includes(answer)) {
      gameNumber += 1;
      return true;
    }

    if (["n", "no"].includes(answer) || isExitInput(answer)) {
      return false;
    }

    console.log("Please enter Y or N.");
  }
}

// ─────────────────────────────────────────────
// Main Game Flow
// ─────────────────────────────────────────────
async function startGame() {
  while (true) {
    const selectedMode = await chooseGameMode();

    if (!selectedMode) {
      renderExitScreen();
      rl.close();
      return;
    }

    if (gameMode === "ai") {
      const symbolSelection = await chooseHumanSymbol();

      if (symbolSelection === "exit") {
        renderExitScreen();
        rl.close();
        return;
      }

      if (symbolSelection === "back") {
        continue;
      }
    }

    while (true) {
      board = createBoard();

      const result =
        gameMode === "ai"
          ? await playAgainstAi()
          : await playPlayerVsPlayer();

      if (result === "exit") {
        renderExitScreen();
        rl.close();
        return;
      }

      const replay = await askReplay();

      if (!replay) {
        renderExitScreen();
        rl.close();
        return;
      }
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