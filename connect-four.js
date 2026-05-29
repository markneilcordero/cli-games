const readline = require("readline");
const { randomInt } = require("crypto");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ─────────────────────────────────────────────
// Game Settings
// ─────────────────────────────────────────────
const ROWS = 6;
const COLUMNS = 7;
const EMPTY = "⚪";
const PLAYER = "🔴";
const AI = "🟡";
const AI_THINK_DELAY = 700;

let board = [];
let playerScore = 0;
let aiScore = 0;
let draws = 0;
let gameNumber = 1;

// ─────────────────────────────────────────────
// Helpers
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

function initializeBoard() {
  board = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(EMPTY));
}

function renderBoard(status = "") {
  clearScreen();

  console.log("══════════════════════════════════════");
  console.log("           🎮 CONNECT FOUR 🎮");
  console.log("══════════════════════════════════════");
  console.log(
    ` Game ${gameNumber}     You ${playerScore} - ${aiScore} AI     Draws ${draws}`
  );
  console.log(" You: 🔴                     AI: 🟡");
  console.log("──────────────────────────────────────");
  console.log("   1   2   3   4   5   6   7");

  for (const row of board) {
    console.log(`| ${row.join(" ")} |`);
  }

  console.log("──────────────────────────────────────");

  if (status) {
    console.log(` ${status}`);
  }
}

function isValidColumn(column) {
  return (
    Number.isInteger(column) &&
    column >= 0 &&
    column < COLUMNS &&
    board[0][column] === EMPTY
  );
}

function getValidColumns() {
  return Array.from({ length: COLUMNS }, (_, column) => column).filter(
    isValidColumn
  );
}

function dropPiece(column, piece) {
  if (!isValidColumn(column)) {
    return -1;
  }

  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row][column] === EMPTY) {
      board[row][column] = piece;
      return row;
    }
  }

  return -1;
}

function removePiece(row, column) {
  board[row][column] = EMPTY;
}

function countDirection(row, column, rowStep, columnStep, piece) {
  let count = 0;
  let currentRow = row + rowStep;
  let currentColumn = column + columnStep;

  while (
    currentRow >= 0 &&
    currentRow < ROWS &&
    currentColumn >= 0 &&
    currentColumn < COLUMNS &&
    board[currentRow][currentColumn] === piece
  ) {
    count += 1;
    currentRow += rowStep;
    currentColumn += columnStep;
  }

  return count;
}

function checkWin(row, column, piece) {
  const directions = [
    [1, 0], // Vertical
    [0, 1], // Horizontal
    [1, 1], // Diagonal \
    [1, -1], // Diagonal /
  ];

  return directions.some(([rowStep, columnStep]) => {
    const connected =
      1 +
      countDirection(row, column, rowStep, columnStep, piece) +
      countDirection(row, column, -rowStep, -columnStep, piece);

    return connected >= 4;
  });
}

function isBoardFull() {
  return getValidColumns().length === 0;
}

function parsePlayerColumn(input) {
  if (!/^[1-7]$/.test(input)) {
    return null;
  }

  return Number(input) - 1;
}

// ─────────────────────────────────────────────
// AI Logic
// ─────────────────────────────────────────────
function findWinningColumn(piece) {
  for (const column of getValidColumns()) {
    const row = dropPiece(column, piece);
    const wins = checkWin(row, column, piece);

    removePiece(row, column);

    if (wins) {
      return column;
    }
  }

  return null;
}

function connectionScore(row, column, piece) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  return directions.reduce((score, [rowStep, columnStep]) => {
    const connected =
      1 +
      countDirection(row, column, rowStep, columnStep, piece) +
      countDirection(row, column, -rowStep, -columnStep, piece);

    return score + connected * connected;
  }, 0);
}

function scoreAiColumn(column) {
  const row = dropPiece(column, AI);

  // Center columns are usually stronger in Connect Four.
  let score = 12 - Math.abs(3 - column) * 3;

  score += connectionScore(row, column, AI);

  // Avoid moves that immediately allow the player to win.
  if (findWinningColumn(PLAYER) !== null) {
    score -= 1000;
  }

  removePiece(row, column);

  return score;
}

function chooseAiColumn() {
  const winningColumn = findWinningColumn(AI);

  if (winningColumn !== null) {
    return {
      column: winningColumn,
      reason: "AI finds a winning move.",
    };
  }

  const blockingColumn = findWinningColumn(PLAYER);

  if (blockingColumn !== null) {
    return {
      column: blockingColumn,
      reason: "AI blocks your winning move.",
    };
  }

  const scoredColumns = getValidColumns().map((column) => ({
    column,
    score: scoreAiColumn(column),
  }));

  const bestScore = Math.max(...scoredColumns.map((choice) => choice.score));

  const bestColumns = scoredColumns
    .filter((choice) => choice.score === bestScore)
    .map((choice) => choice.column);

  const chosenColumn = bestColumns[randomInt(0, bestColumns.length)];

  return {
    column: chosenColumn,
    reason:
      chosenColumn === 3
        ? "AI prefers the center column."
        : "AI chooses a strategic position.",
  };
}

// ─────────────────────────────────────────────
// Turns and Game Flow
// ─────────────────────────────────────────────
async function playerTurn(status = "Choose a column from 1 to 7.") {
  while (true) {
    renderBoard(status);

    const input = (
      await ask("\nChoose a column (1-7) or E to exit: ")
    ).toUpperCase();

    if (input === "E" || input === "EXIT") {
      return { exit: true };
    }

    const column = parsePlayerColumn(input);

    if (column === null) {
      status = "⚠ Invalid input. Enter one number from 1 to 7.";
      continue;
    }

    if (!isValidColumn(column)) {
      status = `⚠ Column ${column + 1} is full. Choose another column.`;
      continue;
    }

    const row = dropPiece(column, PLAYER);

    return {
      exit: false,
      row,
      column,
      status: `You dropped 🔴 in column ${column + 1}.`,
    };
  }
}

async function aiTurn() {
  renderBoard("🤖 AI is thinking...");
  await wait(AI_THINK_DELAY);

  const { column, reason } = chooseAiColumn();
  const row = dropPiece(column, AI);

  return {
    row,
    column,
    status: `🤖 AI dropped 🟡 in column ${column + 1}. ${reason}`,
  };
}

async function playOneGame() {
  initializeBoard();

  let status = "You start. Choose a column from 1 to 7.";

  while (true) {
    const playerMove = await playerTurn(status);

    if (playerMove.exit) {
      return "exit";
    }

    if (checkWin(playerMove.row, playerMove.column, PLAYER)) {
      playerScore += 1;

      renderBoard("🎉 You connect four and win!");

      return "finished";
    }

    if (isBoardFull()) {
      draws += 1;

      renderBoard("🤝 The board is full. It is a draw!");

      return "finished";
    }

    const aiMove = await aiTurn();

    if (checkWin(aiMove.row, aiMove.column, AI)) {
      aiScore += 1;

      renderBoard(`${aiMove.status}\n\n 🤖 AI connects four and wins!`);

      return "finished";
    }

    if (isBoardFull()) {
      draws += 1;

      renderBoard(`${aiMove.status}\n\n 🤝 The board is full. It is a draw!`);

      return "finished";
    }

    status = aiMove.status;
  }
}

async function askReplay() {
  while (true) {
    const answer = (await ask("\nPlay again? (Y/N): ")).toUpperCase();

    if (answer === "Y" || answer === "YES") {
      gameNumber += 1;
      return true;
    }

    if (answer === "N" || answer === "NO") {
      return false;
    }

    console.log("Please enter Y or N.");
  }
}

function showExitScreen() {
  clearScreen();

  console.log("══════════════════════════════════════");
  console.log("           🎮 GAME OVER 🎮");
  console.log("══════════════════════════════════════");
  console.log(` Final score: You ${playerScore} - ${aiScore} AI`);
  console.log(` Draws: ${draws}`);
  console.log(" Thanks for playing Connect Four!");
  console.log("══════════════════════════════════════");
}

async function startGame() {
  while (true) {
    const result = await playOneGame();

    if (result === "exit") {
      showExitScreen();
      rl.close();
      return;
    }

    const replay = await askReplay();

    if (!replay) {
      showExitScreen();
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