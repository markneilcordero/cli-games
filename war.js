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
const SUITS = ["♠", "♦", "♣", "♥"];

const RANKS = [
  { rank: "2", value: 2 },
  { rank: "3", value: 3 },
  { rank: "4", value: 4 },
  { rank: "5", value: 5 },
  { rank: "6", value: 6 },
  { rank: "7", value: 7 },
  { rank: "8", value: 8 },
  { rank: "9", value: 9 },
  { rank: "10", value: 10 },
  { rank: "J", value: 11 },
  { rank: "Q", value: 12 },
  { rank: "K", value: 13 },
  { rank: "A", value: 14 },
];

const FACE_DOWN_CARDS_IN_WAR = 3;
const CARDS_REQUIRED_FOR_WAR = FACE_DOWN_CARDS_IN_WAR + 1;
const AUTO_PLAY_DELAY = 700;
const MAX_ROUNDS = 10000;
const SAVE_FILE = "war-game-save.json";
const LOG_FILE = "war-battle-log.txt";

const sessionScore = {
  player: 0,
  ai: 0,
  draws: 0,
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

function clearScreen() {
  process.stdout.write("\x1Bc");
}

function isExitInput(input) {
  return ["e", "exit", "q", "quit"].includes(input.toLowerCase());
}

function formatCard(card) {
  return card ? `${card.rank}${card.suit}` : "--";
}

function playerName(owner) {
  return owner === "player" ? "You" : "AI";
}

// ─────────────────────────────────────────────
// Deck and Game State
// ─────────────────────────────────────────────
function shuffle(cards) {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const randomIndex = randomInt(0, index + 1);

    [cards[index], cards[randomIndex]] = [
      cards[randomIndex],
      cards[index],
    ];
  }

  return cards;
}

function createDeck() {
  const deck = [];

  for (const suit of SUITS) {
    for (const { rank, value } of RANKS) {
      deck.push({ rank, value, suit });
    }
  }

  return shuffle(deck);
}

function createGame(mode = "manual") {
  const deck = createDeck();

  return {
    mode,
    playerDeck: deck.slice(0, 26),
    aiDeck: deck.slice(26),
    roundsPlayed: 0,
    totalWars: 0,
    longestWarChain: 0,
    lastPlayerCard: null,
    lastAiCard: null,
    lastPileSize: 0,
    lastWarChain: 0,
    status: "A new battle begins. Play the first round.",
    logs: [],
    finished: false,
    winner: null,
  };
}

function addLog(game, text) {
  game.logs.push(text);
}

function capturePile(game, winner, pile) {
  // Captured cards are shuffled before being placed at the bottom
  // of the winner's deck. This helps reduce repetitive cycles.
  const captured = shuffle([...pile]);

  if (winner === "player") {
    game.playerDeck.push(...captured);
  } else {
    game.aiDeck.push(...captured);
  }
}

function finishGame(game, winner, reason) {
  game.finished = true;
  game.winner = winner;

  if (winner === "player") {
    sessionScore.player += 1;
    game.status = `🏆 YOU WIN! ${reason}`;
  } else if (winner === "ai") {
    sessionScore.ai += 1;
    game.status = `💀 AI WINS! ${reason}`;
  } else {
    sessionScore.draws += 1;
    game.status = `🤝 DRAW! ${reason}`;
  }

  addLog(game, `Result: ${game.status}`);

  return winner;
}

function decideByCardsRemaining(game, reason) {
  if (game.playerDeck.length > game.aiDeck.length) {
    return finishGame(game, "player", reason);
  }

  if (game.aiDeck.length > game.playerDeck.length) {
    return finishGame(game, "ai", reason);
  }

  return finishGame(game, "draw", reason);
}

function getWinnerFromEmptyDeck(game) {
  if (game.playerDeck.length === 0 && game.aiDeck.length === 0) {
    return finishGame(game, "draw", "Both players ran out of cards.");
  }

  if (game.playerDeck.length === 0) {
    return finishGame(game, "ai", "You have no cards remaining.");
  }

  if (game.aiDeck.length === 0) {
    return finishGame(game, "player", "AI has no cards remaining.");
  }

  return null;
}

// ─────────────────────────────────────────────
// Round and War Logic
//
// Rules:
// - Each normal round counts as one round, even when it triggers war.
// - During war, each player places 3 face-down cards and 1 face-up card.
// - If only one player cannot continue a war, that player loses.
// - If neither player can continue, the larger remaining deck wins.
// - Equal remaining decks result in a draw.
// ─────────────────────────────────────────────
function playRound(game) {
  if (game.finished) {
    return game.winner;
  }

  const emptyWinner = getWinnerFromEmptyDeck(game);

  if (emptyWinner) {
    return emptyWinner;
  }

  if (game.roundsPlayed >= MAX_ROUNDS) {
    return decideByCardsRemaining(
      game,
      `The ${MAX_ROUNDS}-round safety limit was reached; the larger deck wins.`
    );
  }

  game.roundsPlayed += 1;

  const pile = [];
  let warChain = 0;

  let playerCard = game.playerDeck.shift();
  let aiCard = game.aiDeck.shift();

  pile.push(playerCard, aiCard);

  game.lastPlayerCard = playerCard;
  game.lastAiCard = aiCard;

  const battleLines = [
    `Round ${game.roundsPlayed}: You played ${formatCard(
      playerCard
    )}, AI played ${formatCard(aiCard)}.`,
  ];

  while (playerCard.value === aiCard.value) {
    warChain += 1;
    game.totalWars += 1;
    game.longestWarChain = Math.max(game.longestWarChain, warChain);

    battleLines.push(`⚔ WAR ${warChain}! Matching ${playerCard.rank}s.`);

    const playerCanContinue =
      game.playerDeck.length >= CARDS_REQUIRED_FOR_WAR;

    const aiCanContinue =
      game.aiDeck.length >= CARDS_REQUIRED_FOR_WAR;

    if (!playerCanContinue && !aiCanContinue) {
      game.lastPileSize = pile.length;
      game.lastWarChain = warChain;
      game.status = battleLines.join("\n");

      addLog(
        game,
        `${battleLines.join(" ")} Neither side could continue the war.`
      );

      return decideByCardsRemaining(
        game,
        "Neither player had enough cards to continue the final war."
      );
    }

    if (!playerCanContinue) {
      game.lastPileSize = pile.length;
      game.lastWarChain = warChain;
      game.status = battleLines.join("\n");

      addLog(
        game,
        `${battleLines.join(" ")} Player could not continue the war.`
      );

      return finishGame(
        game,
        "ai",
        "You did not have four cards available to continue the war."
      );
    }

    if (!aiCanContinue) {
      game.lastPileSize = pile.length;
      game.lastWarChain = warChain;
      game.status = battleLines.join("\n");

      addLog(
        game,
        `${battleLines.join(" ")} AI could not continue the war.`
      );

      return finishGame(
        game,
        "player",
        "AI did not have four cards available to continue the war."
      );
    }

    for (let index = 0; index < FACE_DOWN_CARDS_IN_WAR; index += 1) {
      pile.push(game.playerDeck.shift(), game.aiDeck.shift());
    }

    playerCard = game.playerDeck.shift();
    aiCard = game.aiDeck.shift();

    pile.push(playerCard, aiCard);

    game.lastPlayerCard = playerCard;
    game.lastAiCard = aiCard;

    battleLines.push(
      `Face-up war cards: You ${formatCard(
        playerCard
      )} vs AI ${formatCard(aiCard)}.`
    );
  }

  const winner = playerCard.value > aiCard.value ? "player" : "ai";

  capturePile(game, winner, pile);

  game.lastPileSize = pile.length;
  game.lastWarChain = warChain;

  const result =
    warChain > 0
      ? `🔥 ${playerName(winner)} ${
          winner === "player" ? "win" : "wins"
        } the war and capture${winner === "player" ? "" : "s"} ${
          pile.length
        } cards!`
      : `✅ ${playerName(winner)} ${
          winner === "player" ? "win" : "wins"
        } the round and capture${winner === "player" ? "" : "s"} ${
          pile.length
        } cards.`;

  battleLines.push(result);

  game.status = battleLines.join("\n");

  addLog(game, battleLines.join(" "));

  return getWinnerFromEmptyDeck(game);
}

// ─────────────────────────────────────────────
// Save, Load, and Report
// ─────────────────────────────────────────────
function saveGame(game) {
  try {
    fs.writeFileSync(SAVE_FILE, JSON.stringify(game, null, 2), "utf8");

    game.status = `✅ Game saved as '${SAVE_FILE}'.`;

    return true;
  } catch (error) {
    game.status = `⚠ Could not save game: ${error.message}`;

    return false;
  }
}

function isValidSavedGame(game) {
  return (
    game &&
    Array.isArray(game.playerDeck) &&
    Array.isArray(game.aiDeck) &&
    Array.isArray(game.logs) &&
    typeof game.roundsPlayed === "number" &&
    typeof game.totalWars === "number"
  );
}

function loadGame() {
  try {
    if (!fs.existsSync(SAVE_FILE)) {
      return {
        game: null,
        message: `⚠ No saved game found at '${SAVE_FILE}'.`,
      };
    }

    const loaded = JSON.parse(fs.readFileSync(SAVE_FILE, "utf8"));

    if (!isValidSavedGame(loaded) || loaded.finished) {
      return {
        game: null,
        message: "⚠ Saved game is invalid or already finished.",
      };
    }

    loaded.mode = "manual";
    loaded.status =
      "✅ Saved game loaded. Manual mode enabled; choose A for auto-play.";

    return {
      game: loaded,
      message: "Saved game loaded.",
    };
  } catch (error) {
    return {
      game: null,
      message: `⚠ Could not load saved game: ${error.message}`,
    };
  }
}

function saveBattleReport(game) {
  const winnerText =
    game.winner === "player"
      ? "Player"
      : game.winner === "ai"
        ? "AI"
        : "Draw";

  const report = [
    "CLI WAR CARD GAME REPORT",
    "========================",
    `Game: ${gameNumber}`,
    `Winner: ${winnerText}`,
    `Rounds Played: ${game.roundsPlayed}`,
    `Total Wars: ${game.totalWars}`,
    `Longest War Chain: ${game.longestWarChain}`,
    `Cards Remaining: Player ${game.playerDeck.length} | AI ${game.aiDeck.length}`,
    "",
    "Battle Log",
    "----------",
    ...game.logs,
  ];

  try {
    fs.writeFileSync(LOG_FILE, report.join("\n"), "utf8");

    return `Report saved as '${LOG_FILE}'.`;
  } catch (error) {
    return `Report could not be saved: ${error.message}`;
  }
}

// ─────────────────────────────────────────────
// Screen Rendering
// ─────────────────────────────────────────────
function renderMenu(message = "Choose an option.") {
  clearScreen();

  console.log("══════════════════════════════════════════════");
  console.log("              🎴 WAR CARD GAME 🎴");
  console.log("══════════════════════════════════════════════");
  console.log(
    ` Session Score: You ${sessionScore.player} - ${sessionScore.ai} AI | Draws ${sessionScore.draws}`
  );
  console.log("──────────────────────────────────────────────");
  console.log(" 1. New Manual Game");
  console.log(" 2. New Auto-Play Game");
  console.log(" 3. Load Saved Game");
  console.log(" 4. Exit");
  console.log("──────────────────────────────────────────────");
  console.log(` ${message}`);
  console.log("══════════════════════════════════════════════");
}

function renderGame(game, autoPlaying = false) {
  clearScreen();

  console.log("══════════════════════════════════════════════════════════");
  console.log("                    🎴 WAR CARD GAME 🎴");
  console.log("══════════════════════════════════════════════════════════");
  console.log(
    ` Game ${gameNumber}   Round ${game.roundsPlayed}/${MAX_ROUNDS}   Mode: ${
      autoPlaying ? "AUTO-PLAY" : "MANUAL"
    }`
  );
  console.log(
    ` Session Score: You ${sessionScore.player} - ${sessionScore.ai} AI | Draws ${sessionScore.draws}`
  );
  console.log("──────────────────────────────────────────────────────────");
  console.log(
    ` Your Deck: ${String(game.playerDeck.length).padStart(
      2,
      " "
    )} cards        AI Deck: ${String(game.aiDeck.length).padStart(
      2,
      " "
    )} cards`
  );
  console.log(
    ` Your Last Card: ${formatCard(game.lastPlayerCard).padEnd(
      5,
      " "
    )}      AI Last Card: ${formatCard(game.lastAiCard)}`
  );
  console.log(
    ` Last Pile: ${game.lastPileSize} cards      Total Wars: ${game.totalWars}      Longest Chain: ${game.longestWarChain}`
  );
  console.log("──────────────────────────────────────────────────────────");

  for (const line of String(game.status).split("\n")) {
    console.log(` ${line}`);
  }

  console.log("──────────────────────────────────────────────────────────");

  if (autoPlaying) {
    console.log(
      " ▶ Auto-play is running. Type S or STOP, then press Enter, to pause."
    );
    console.log(" Type E or EXIT, then press Enter, to leave the game.");
  } else {
    console.log(" Press Enter to play the next round.");
    console.log(" A = Auto-play   S = Save Game   E = Exit to Menu");
  }

  console.log("══════════════════════════════════════════════════════════");
}

function renderFinishedGame(game, reportMessage) {
  renderGame(game, false);

  console.log(`\n ${reportMessage}`);
}

function renderGoodbye() {
  clearScreen();

  console.log("══════════════════════════════════════════════");
  console.log("                    GAME OVER");
  console.log("══════════════════════════════════════════════");
  console.log(
    ` Final Session Score: You ${sessionScore.player} - ${sessionScore.ai} AI | Draws ${sessionScore.draws}`
  );
  console.log(" Thanks for playing War!");
  console.log("══════════════════════════════════════════════");
}

// ─────────────────────────────────────────────
// Auto-Play
// ─────────────────────────────────────────────
function waitForAutoAction(milliseconds) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve("next");
    }, milliseconds);

    function onLine(input) {
      const command = input.trim().toLowerCase();

      if (["s", "stop", "p", "pause"].includes(command)) {
        cleanup();
        resolve("stop");
      } else if (isExitInput(command)) {
        cleanup();
        resolve("exit");
      }
    }

    function cleanup() {
      clearTimeout(timer);
      rl.removeListener("line", onLine);
    }

    rl.on("line", onLine);
  });
}

async function runAutoPlay(game) {
  while (!game.finished) {
    playRound(game);

    renderGame(game, true);

    if (game.finished) {
      return "finished";
    }

    const action = await waitForAutoAction(AUTO_PLAY_DELAY);

    if (action === "stop") {
      game.mode = "manual";
      game.status =
        "⏸ Auto-play paused. Press Enter for the next round or A to resume auto-play.";

      return "stopped";
    }

    if (action === "exit") {
      return "exit";
    }
  }

  return "finished";
}

// ─────────────────────────────────────────────
// Gameplay Flow
// ─────────────────────────────────────────────
async function playManualGame(game) {
  while (!game.finished) {
    renderGame(game, false);

    const input = (await ask("\nCommand: ")).toLowerCase();

    if (isExitInput(input)) {
      return "menu";
    }

    if (input === "s" || input === "save") {
      saveGame(game);
      continue;
    }

    if (input === "a" || input === "auto") {
      game.mode = "auto";
      return "auto";
    }

    if (input === "" || input === "n" || input === "next") {
      playRound(game);
      continue;
    }

    game.status = "⚠ Invalid command. Press Enter, or type A, S, or E.";
  }

  return "finished";
}

async function askReplay() {
  while (true) {
    const input = (await ask("\nPlay another game? (Y/N): ")).toLowerCase();

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

async function runGame(game) {
  while (true) {
    const result =
      game.mode === "auto"
        ? await runAutoPlay(game)
        : await playManualGame(game);

    if (result === "menu" || result === "exit") {
      return "menu";
    }

    if (result === "stopped" || result === "auto") {
      continue;
    }

    if (result === "finished") {
      const reportMessage = saveBattleReport(game);

      renderFinishedGame(game, `✅ ${reportMessage}`);

      const replay = await askReplay();

      return replay ? "replay" : "menu";
    }
  }
}

async function mainMenu() {
  let message = "Choose an option.";

  while (true) {
    renderMenu(message);

    const choice = (await ask("\nEnter choice (1-4): ")).toLowerCase();

    if (choice === "4" || isExitInput(choice)) {
      renderGoodbye();
      rl.close();
      return;
    }

    let game;

    if (choice === "1") {
      game = createGame("manual");
    } else if (choice === "2") {
      game = createGame("auto");
    } else if (choice === "3") {
      const loaded = loadGame();

      if (!loaded.game) {
        message = loaded.message;
        continue;
      }

      game = loaded.game;
    } else {
      message = "⚠ Invalid option. Enter 1, 2, 3, or 4.";
      continue;
    }

    while (game) {
      const outcome = await runGame(game);

      if (outcome === "replay") {
        game = createGame(game.mode === "auto" ? "auto" : "manual");
      } else {
        game = null;
        message = "Choose an option to begin another battle.";
      }
    }
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