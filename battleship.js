const readline = require("readline");
const fs = require("fs");
const { randomInt } = require("crypto");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ─────────────────────────────────────────────
// Game Settings
// ─────────────────────────────────────────────
const GRID_SIZE = 10;
const COLUMNS = "ABCDEFGHIJ";
const AI_THINK_DELAY = 700;
const LOG_FILE = "battle-log.txt";

const FLEET_TEMPLATE = [
  { id: "carrier", name: "Carrier", size: 5 },
  { id: "battleship", name: "Battleship", size: 4 },
  { id: "cruiser", name: "Cruiser", size: 3 },
  { id: "submarine", name: "Submarine", size: 3 },
  { id: "destroyer", name: "Destroyer", size: 2 },
];

const SYMBOLS = {
  water: "·",
  ship: "■",
  hit: "X",
  miss: "o",
};

const scores = {
  player: 0,
  ai: 0,
};

let gameNumber = 1;

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
  return ["e", "exit", "q", "quit"].includes(input.trim().toLowerCase());
}

function coordinate(row, column) {
  return `${COLUMNS[column]}${row + 1}`;
}

function parseCoordinate(input) {
  const normalized = input.trim().toUpperCase();
  const match = normalized.match(/^([A-J])(10|[1-9])$/);

  if (!match) {
    return null;
  }

  return {
    column: COLUMNS.indexOf(match[1]),
    row: Number(match[2]) - 1,
    label: normalized,
  };
}

// ─────────────────────────────────────────────
// Board and Fleet Setup
// ─────────────────────────────────────────────
function createBoard() {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({
      shipId: null,
      targeted: false,
    }))
  );
}

function createFleet() {
  return FLEET_TEMPLATE.map((ship) => ({
    ...ship,
    positions: [],
    hits: 0,
    sunk: false,
  }));
}

function canPlaceShip(board, row, column, size, direction) {
  const rowStep = direction === "V" ? 1 : 0;
  const columnStep = direction === "H" ? 1 : 0;

  const endRow = row + rowStep * (size - 1);
  const endColumn = column + columnStep * (size - 1);

  if (endRow >= GRID_SIZE || endColumn >= GRID_SIZE) {
    return false;
  }

  for (let index = 0; index < size; index += 1) {
    const currentRow = row + rowStep * index;
    const currentColumn = column + columnStep * index;

    if (board[currentRow][currentColumn].shipId !== null) {
      return false;
    }
  }

  return true;
}

function placeFleetRandomly(board, fleet) {
  for (const ship of fleet) {
    let placed = false;

    while (!placed) {
      const row = randomInt(0, GRID_SIZE);
      const column = randomInt(0, GRID_SIZE);
      const direction = randomInt(0, 2) === 0 ? "H" : "V";

      if (!canPlaceShip(board, row, column, ship.size, direction)) {
        continue;
      }

      const rowStep = direction === "V" ? 1 : 0;
      const columnStep = direction === "H" ? 1 : 0;

      for (let index = 0; index < ship.size; index += 1) {
        const shipRow = row + rowStep * index;
        const shipColumn = column + columnStep * index;

        board[shipRow][shipColumn].shipId = ship.id;

        ship.positions.push({
          row: shipRow,
          column: shipColumn,
        });
      }

      placed = true;
    }
  }
}

function createSide() {
  const board = createBoard();
  const fleet = createFleet();

  placeFleetRandomly(board, fleet);

  return {
    board,
    fleet,
  };
}

function findShip(fleet, shipId) {
  return fleet.find((ship) => ship.id === shipId);
}

function allShipsSunk(fleet) {
  return fleet.every((ship) => ship.sunk);
}

function remainingShips(fleet) {
  return fleet.filter((ship) => !ship.sunk).length;
}

function fleetStatus(fleet) {
  return fleet
    .map((ship) => `${ship.sunk ? "✗" : "✓"} ${ship.name}(${ship.size})`)
    .join("  ");
}

// ─────────────────────────────────────────────
// Screen Rendering
// ─────────────────────────────────────────────
function visibleSymbol(cell, revealShips) {
  if (cell.targeted && cell.shipId !== null) {
    return SYMBOLS.hit;
  }

  if (cell.targeted) {
    return SYMBOLS.miss;
  }

  if (revealShips && cell.shipId !== null) {
    return SYMBOLS.ship;
  }

  return SYMBOLS.water;
}

function boardLines(board, revealShips) {
  const lines = [`   ${COLUMNS.split("").join(" ")}`];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    const rowLabel = String(row + 1).padStart(2, " ");

    const cells = board[row]
      .map((cell) => visibleSymbol(cell, revealShips))
      .join(" ");

    lines.push(`${rowLabel} ${cells}`);
  }

  return lines;
}

function renderBattleScreen(
  game,
  status = "Choose a target coordinate.",
  revealEnemy = false
) {
  clearScreen();

  const playerBoard = boardLines(game.player.board, true);
  const enemyBoard = boardLines(game.ai.board, revealEnemy);

  console.log(
    "═════════════════════════════════════════════════════════════════════"
  );
  console.log(
    "                         🚢 CLI BATTLESHIP 🚢"
  );
  console.log(
    "═════════════════════════════════════════════════════════════════════"
  );
  console.log(
    ` Game ${gameNumber}   Turn ${game.turn}   Score: You ${scores.player} - ${scores.ai} AI`
  );
  console.log(
    ` Ships Remaining: You ${remainingShips(game.player.fleet)} | AI ${remainingShips(
      game.ai.fleet
    )}`
  );
  console.log(
    "─────────────────────────────────────────────────────────────────────"
  );
  console.log(" YOUR FLEET                         ENEMY WATERS");

  for (let index = 0; index < playerBoard.length; index += 1) {
    console.log(`${playerBoard[index].padEnd(35, " ")}${enemyBoard[index]}`);
  }

  console.log(
    "─────────────────────────────────────────────────────────────────────"
  );
  console.log(` Your fleet:  ${fleetStatus(game.player.fleet)}`);
  console.log(` Enemy fleet: ${fleetStatus(game.ai.fleet)}`);
  console.log(" Symbols: ■ ship   X hit   o miss   · unknown water");
  console.log(
    "─────────────────────────────────────────────────────────────────────"
  );

  for (const line of String(status).split("\n")) {
    console.log(` ${line}`);
  }

  console.log(
    "═════════════════════════════════════════════════════════════════════"
  );
}

function renderMenu(status = "Choose an option.") {
  clearScreen();

  console.log("══════════════════════════════════════════════");
  console.log("             🚢 CLI BATTLESHIP 🚢");
  console.log("══════════════════════════════════════════════");
  console.log(` Score: You ${scores.player} - ${scores.ai} AI`);
  console.log("──────────────────────────────────────────────");
  console.log(" 1. Player vs AI");
  console.log(" 2. Exit");
  console.log("──────────────────────────────────────────────");
  console.log(` ${status}`);
  console.log("══════════════════════════════════════════════");
}

function renderExitScreen() {
  clearScreen();

  console.log("══════════════════════════════════════════════");
  console.log("                 🚢 GAME OVER 🚢");
  console.log("══════════════════════════════════════════════");
  console.log(` Final score: You ${scores.player} - ${scores.ai} AI`);
  console.log(" Thanks for playing Battleship!");
  console.log("══════════════════════════════════════════════");
}

// ─────────────────────────────────────────────
// Attack Logic
// ─────────────────────────────────────────────
function attack(side, row, column) {
  const cell = side.board[row][column];

  if (cell.targeted) {
    return {
      valid: false,
      coordinate: coordinate(row, column),
    };
  }

  cell.targeted = true;

  if (cell.shipId === null) {
    return {
      valid: true,
      hit: false,
      sunk: false,
      coordinate: coordinate(row, column),
      message: "MISS",
    };
  }

  const ship = findShip(side.fleet, cell.shipId);

  ship.hits += 1;
  ship.sunk = ship.hits === ship.size;

  return {
    valid: true,
    hit: true,
    sunk: ship.sunk,
    shipName: ship.name,
    coordinate: coordinate(row, column),
    message: ship.sunk ? `SUNK ${ship.name}` : "HIT",
  };
}

// ─────────────────────────────────────────────
// Battle Log
// ─────────────────────────────────────────────
function logAttack(game, attacker, result) {
  game.logs.push(
    `Turn ${game.turn}: ${attacker} attacked ${result.coordinate} — ${result.message}`
  );
}

function saveGameReport(game, winner) {
  const report = [
    "CLI BATTLESHIP BATTLE REPORT",
    "============================",
    `Game: ${gameNumber}`,
    `Winner: ${winner}`,
    `Turns played: ${game.turn}`,
    `Final score: Player ${scores.player} - ${scores.ai} AI`,
    "",
    "Battle Log",
    "----------",
    ...game.logs,
    "",
    `Player fleet: ${fleetStatus(game.player.fleet)}`,
    `AI fleet: ${fleetStatus(game.ai.fleet)}`,
  ];

  try {
    fs.writeFileSync(LOG_FILE, report.join("\n"), "utf8");

    return `Battle report saved as '${LOG_FILE}'.`;
  } catch (error) {
    return `Could not save battle report: ${error.message}`;
  }
}

// ─────────────────────────────────────────────
// AI Logic
// The AI attacks randomly until it hits a ship.
// After a hit, it targets nearby cells.
// ─────────────────────────────────────────────
function neighbors(row, column) {
  return [
    { row: row - 1, column },
    { row: row + 1, column },
    { row, column: column - 1 },
    { row, column: column + 1 },
  ].filter(
    (position) =>
      position.row >= 0 &&
      position.row < GRID_SIZE &&
      position.column >= 0 &&
      position.column < GRID_SIZE
  );
}

function addAiTargets(game, row, column) {
  for (const position of neighbors(row, column)) {
    const alreadyQueued = game.aiTargetQueue.some(
      (queued) =>
        queued.row === position.row &&
        queued.column === position.column
    );

    const alreadyTargeted =
      game.player.board[position.row][position.column].targeted;

    if (!alreadyQueued && !alreadyTargeted) {
      game.aiTargetQueue.push(position);
    }
  }
}

function availableTargets(board) {
  const targets = [];

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let column = 0; column < GRID_SIZE; column += 1) {
      if (!board[row][column].targeted) {
        targets.push({ row, column });
      }
    }
  }

  return targets;
}

function chooseAiTarget(game) {
  while (game.aiTargetQueue.length > 0) {
    const nextTarget = game.aiTargetQueue.shift();

    if (!game.player.board[nextTarget.row][nextTarget.column].targeted) {
      return nextTarget;
    }
  }

  const targets = availableTargets(game.player.board);

  return targets[randomInt(0, targets.length)];
}

async function performAiTurn(game) {
  renderBattleScreen(game, "🤖 AI is selecting a target...");

  await wait(AI_THINK_DELAY);

  const target = chooseAiTarget(game);
  const result = attack(game.player, target.row, target.column);

  logAttack(game, "AI", result);

  if (result.hit && !result.sunk) {
    addAiTargets(game, target.row, target.column);
  }

  if (result.sunk) {
    game.aiTargetQueue = [];
  }

  return result;
}

// ─────────────────────────────────────────────
// Player Input
// ─────────────────────────────────────────────
async function getPlayerTarget(game, status) {
  while (true) {
    renderBattleScreen(game, status);

    const input = await ask("\n🎯 Enter target (A1-J10), or E to exit: ");

    if (isExitInput(input)) {
      return {
        exit: true,
      };
    }

    const target = parseCoordinate(input);

    if (!target) {
      status = "⚠ Invalid target. Enter coordinates such as A5 or J10.";
      continue;
    }

    if (game.ai.board[target.row][target.column].targeted) {
      status =
        `⚠ You already targeted ${target.label}. ` +
        "Choose another coordinate.";
      continue;
    }

    return {
      exit: false,
      ...target,
    };
  }
}

// ─────────────────────────────────────────────
// Main Battle Flow
// ─────────────────────────────────────────────
async function playGame() {
  const game = {
    player: createSide(),
    ai: createSide(),
    turn: 1,
    logs: [],
    aiTargetQueue: [],
  };

  let status =
    "Your fleet has been placed. Choose an enemy coordinate to attack.";

  while (true) {
    const target = await getPlayerTarget(game, status);

    if (target.exit) {
      return {
        quit: true,
      };
    }

    const playerResult = attack(game.ai, target.row, target.column);

    logAttack(game, "Player", playerResult);

    if (playerResult.sunk) {
      status =
        `💥 You attacked ${playerResult.coordinate}: ` +
        `SUNK enemy ${playerResult.shipName}!`;
    } else if (playerResult.hit) {
      status = `💥 You attacked ${playerResult.coordinate}: HIT!`;
    } else {
      status = `🌊 You attacked ${playerResult.coordinate}: MISS.`;
    }

    if (allShipsSunk(game.ai.fleet)) {
      scores.player += 1;

      const reportMessage = saveGameReport(game, "Player");

      renderBattleScreen(
        game,
        `${status}\n🎉 YOU WIN! All enemy ships have been sunk.\n✅ ${reportMessage}`,
        true
      );

      return {
        quit: false,
      };
    }

    renderBattleScreen(game, `${status}\nPress Enter for the AI turn.`);

    await ask("\nPress Enter to continue...");

    const aiResult = await performAiTurn(game);

    let aiStatus;

    if (aiResult.sunk) {
      aiStatus =
        `💥 AI attacked ${aiResult.coordinate}: ` +
        `SUNK your ${aiResult.shipName}!`;
    } else if (aiResult.hit) {
      aiStatus = `💥 AI attacked ${aiResult.coordinate}: HIT your ship!`;
    } else {
      aiStatus = `🌊 AI attacked ${aiResult.coordinate}: MISS.`;
    }

    if (allShipsSunk(game.player.fleet)) {
      scores.ai += 1;

      const reportMessage = saveGameReport(game, "AI");

      renderBattleScreen(
        game,
        `${aiStatus}\n💀 YOU LOSE! AI sank all of your ships.\n✅ ${reportMessage}`,
        true
      );

      return {
        quit: false,
      };
    }

    status = aiStatus;
    game.turn += 1;
  }
}

// ─────────────────────────────────────────────
// Replay and Menu
// ─────────────────────────────────────────────
async function askReplay() {
  while (true) {
    const input = (await ask("\nPlay again? (Y/N): ")).toLowerCase();

    if (["y", "yes"].includes(input)) {
      gameNumber += 1;
      return true;
    }

    if (["n", "no"].includes(input) || isExitInput(input)) {
      return false;
    }

    console.log("Please enter Y or N.");
  }
}

async function mainMenu() {
  let status = "Choose an option.";

  while (true) {
    renderMenu(status);

    const choice = (
      await ask("\nSelect option (1-2): ")
    ).toLowerCase();

    if (choice === "2" || isExitInput(choice)) {
      renderExitScreen();
      rl.close();
      return;
    }

    if (choice !== "1") {
      status = "⚠ Invalid option. Enter 1 to play or 2 to exit.";
      continue;
    }

    const result = await playGame();

    if (result.quit) {
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

    status = "Starting a new battle.";
  }
}

// ─────────────────────────────────────────────
// Start Game
// ─────────────────────────────────────────────
mainMenu().catch((error) => {
  clearScreen();
  console.error("An unexpected error occurred:", error.message);
  rl.close();
});