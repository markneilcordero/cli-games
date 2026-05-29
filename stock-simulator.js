const readline = require("readline");
const { randomInt } = require("crypto");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ─────────────────────────────────────────────
// Game Settings
// All companies and prices are simulated for gameplay only.
// ─────────────────────────────────────────────
const STARTING_CASH = 10000;
const MAX_DAYS = 30;
const TARGET_NET_WORTH = 12500;
const AUTO_RUN_DELAY = 1000;

const STOCK_TEMPLATES = [
  { symbol: "AAPL", name: "Apple", startPrice: 150, volatility: 4.0 },
  { symbol: "TSLA", name: "Tesla", startPrice: 220, volatility: 7.0 },
  { symbol: "AMZN", name: "Amazon", startPrice: 180, volatility: 4.5 },
  { symbol: "GOOGL", name: "Alphabet", startPrice: 175, volatility: 3.5 },
  { symbol: "MSFT", name: "Microsoft", startPrice: 410, volatility: 3.0 },
];

let state;

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

function isCancelInput(input) {
  return ["b", "back", "c", "cancel"].includes(input.toLowerCase());
}

function parsePositiveInteger(input) {
  if (!/^\d+$/.test(input.trim())) {
    return null;
  }

  const value = Number(input);

  return Number.isSafeInteger(value) && value > 0 ? value : null;
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

function signedPercent(percent) {
  return `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

function pad(value, width) {
  return String(value).padEnd(width, " ");
}

function padLeft(value, width) {
  return String(value).padStart(width, " ");
}

// ─────────────────────────────────────────────
// State and Calculations
// ─────────────────────────────────────────────
function createStocks() {
  return STOCK_TEMPLATES.map((stock) => ({
    ...stock,
    initialPrice: stock.startPrice,
    previousPrice: stock.startPrice,
    price: stock.startPrice,
    dailyChangePercent: 0,
  }));
}

function resetSimulation() {
  state = {
    day: 1,
    cash: STARTING_CASH,
    stocks: createStocks(),
    portfolio: {},
    realizedProfitLoss: 0,
    transactions: [],
    status: `Goal: reach ${money(TARGET_NET_WORTH)} net worth by Day ${MAX_DAYS}.`,
  };
}

function getStock(symbol) {
  return state.stocks.find(
    (stock) => stock.symbol === symbol.toUpperCase()
  );
}

function getHolding(symbol) {
  return state.portfolio[symbol] || null;
}

function portfolioValue() {
  return Object.entries(state.portfolio).reduce(
    (total, [symbol, holding]) => {
      return total + getStock(symbol).price * holding.shares;
    },
    0
  );
}

function portfolioCostBasis() {
  return Object.values(state.portfolio).reduce((total, holding) => {
    return total + holding.averageCost * holding.shares;
  }, 0);
}

function unrealizedProfitLoss() {
  return portfolioValue() - portfolioCostBasis();
}

function netWorth() {
  return state.cash + portfolioValue();
}

function totalProfitLoss() {
  return netWorth() - STARTING_CASH;
}

function totalReturnPercent() {
  return (totalProfitLoss() / STARTING_CASH) * 100;
}

function initialChangePercent(stock) {
  return ((stock.price - stock.initialPrice) / stock.initialPrice) * 100;
}

function recordTransaction(type, stock, shares, total, profitLoss = null) {
  state.transactions.unshift({
    day: state.day,
    type,
    symbol: stock.symbol,
    shares,
    price: stock.price,
    total,
    profitLoss,
  });
}

// ─────────────────────────────────────────────
// Simulated Market Logic
// ─────────────────────────────────────────────
function randomPercent(maxVolatility) {
  const units = Math.round(maxVolatility * 100);

  return randomInt(-units, units + 1) / 100;
}

function updateMarket() {
  for (const stock of state.stocks) {
    stock.previousPrice = stock.price;

    const randomChange = randomPercent(stock.volatility);
    const updatedPrice =
      stock.price * (1 + randomChange / 100);

    stock.price = Math.max(1, Number(updatedPrice.toFixed(2)));

    stock.dailyChangePercent =
      ((stock.price - stock.previousPrice) / stock.previousPrice) * 100;
  }

  state.day += 1;
  state.status = `Market moved to Day ${state.day}. Prices have changed.`;
}

// ─────────────────────────────────────────────
// Screen Rendering
// ─────────────────────────────────────────────
function renderDashboard(message = state.status, autoRunning = false) {
  clearScreen();

  const holdingsValue = portfolioValue();
  const net = netWorth();
  const profitLoss = totalProfitLoss();

  console.log(
    "══════════════════════════════════════════════════════════════════════════════"
  );
  console.log(
    "                    📈 CLI STOCK MARKET SIMULATOR 📈"
  );
  console.log(
    "══════════════════════════════════════════════════════════════════════════════"
  );
  console.log(
    ` Day ${state.day}/${MAX_DAYS}   Cash: ${money(
      state.cash
    )}   Portfolio: ${money(holdingsValue)}   Net Worth: ${money(net)}`
  );
  console.log(
    ` Total P/L: ${signedMoney(profitLoss)} (${signedPercent(
      totalReturnPercent()
    )})   Target: ${money(TARGET_NET_WORTH)}`
  );
  console.log(
    " All displayed stocks and prices are fictional simulated market data."
  );
  console.log(
    "──────────────────────────────────────────────────────────────────────────────"
  );
  console.log(" MARKET");
  console.log(
    " Symbol  Company       Price       Day Change    Since Start   Shares   Value"
  );
  console.log(
    " ──────  ────────────  ──────────  ────────────  ────────────  ──────  ──────────"
  );

  for (const stock of state.stocks) {
    const holding = getHolding(stock.symbol);
    const shares = holding ? holding.shares : 0;
    const value = shares * stock.price;

    console.log(
      ` ${pad(stock.symbol, 6)}  ${pad(stock.name, 12)}  ${padLeft(
        money(stock.price),
        10
      )}  ${padLeft(signedPercent(stock.dailyChangePercent), 12)}  ${padLeft(
        signedPercent(initialChangePercent(stock)),
        12
      )}  ${padLeft(shares, 6)}  ${padLeft(money(value), 10)}`
    );
  }

  console.log(
    "──────────────────────────────────────────────────────────────────────────────"
  );
  console.log(" PORTFOLIO");

  const holdings = Object.entries(state.portfolio);

  if (holdings.length === 0) {
    console.log(" No shares owned. Buy stocks to begin investing.");
  } else {
    console.log(
      " Symbol  Shares   Average Cost   Current Value   Unrealized P/L"
    );
    console.log(
      " ──────  ──────   ────────────   ─────────────   ──────────────"
    );

    for (const [symbol, holding] of holdings) {
      const stock = getStock(symbol);
      const value = stock.price * holding.shares;
      const gainLoss =
        value - holding.averageCost * holding.shares;

      console.log(
        ` ${pad(symbol, 6)}  ${padLeft(holding.shares, 6)}   ${padLeft(
          money(holding.averageCost),
          12
        )}   ${padLeft(money(value), 13)}   ${padLeft(
          signedMoney(gainLoss),
          14
        )}`
      );
    }

    console.log(
      ` Open-position P/L: ${signedMoney(
        unrealizedProfitLoss()
      )}   Realized P/L: ${signedMoney(state.realizedProfitLoss)}`
    );
  }

  console.log(
    "──────────────────────────────────────────────────────────────────────────────"
  );
  console.log(` ${message}`);
  console.log(
    "──────────────────────────────────────────────────────────────────────────────"
  );

  if (autoRunning) {
    console.log(" ▶ AUTO RUNNING: prices update every 1 second.");
    console.log(" Type S or STOP, then press Enter, to return to trading.");
  } else {
    console.log(
      " 1. Buy stock        2. Sell stock        3. Advance one market day"
    );
    console.log(
      " 4. Auto run market  5. Transaction history  6. Finish simulation"
    );
    console.log(" 7. Exit");
  }

  console.log(
    "══════════════════════════════════════════════════════════════════════════════"
  );
}

function renderTransactions() {
  renderDashboard("Transaction history. Press Enter to return.");

  console.log("\n TRANSACTIONS");
  console.log(
    " ─────────────────────────────────────────────────────────────────────────────"
  );

  if (state.transactions.length === 0) {
    console.log(" No transactions yet.");
    return;
  }

  console.log(
    " Day   Action   Symbol   Shares     Price        Total       Realized P/L"
  );
  console.log(
    " ───   ──────   ──────   ──────   ──────────   ───────────   ────────────"
  );

  for (const transaction of state.transactions.slice(0, 15)) {
    const realized =
      transaction.profitLoss === null
        ? "—"
        : signedMoney(transaction.profitLoss);

    console.log(
      ` ${padLeft(transaction.day, 3)}   ${pad(
        transaction.type,
        6
      )}   ${pad(transaction.symbol, 6)}   ${padLeft(
        transaction.shares,
        6
      )}   ${padLeft(money(transaction.price), 10)}   ${padLeft(
        money(transaction.total),
        11
      )}   ${padLeft(realized, 12)}`
    );
  }
}

function renderFinalScreen(reason) {
  clearScreen();

  const net = netWorth();
  const profitLoss = totalProfitLoss();
  const achievedTarget = net >= TARGET_NET_WORTH;

  console.log(
    "══════════════════════════════════════════════════════════════"
  );
  console.log(
    "                  🏁 SIMULATION COMPLETE 🏁"
  );
  console.log(
    "══════════════════════════════════════════════════════════════"
  );
  console.log(` ${reason}`);
  console.log(
    "──────────────────────────────────────────────────────────────"
  );
  console.log(` Final market day:     ${state.day}/${MAX_DAYS}`);
  console.log(` Cash:                 ${money(state.cash)}`);
  console.log(` Portfolio value:      ${money(portfolioValue())}`);
  console.log(` Final net worth:      ${money(net)}`);
  console.log(` Total profit/loss:    ${signedMoney(profitLoss)}`);
  console.log(` Total return:         ${signedPercent(totalReturnPercent())}`);
  console.log(` Realized P/L:         ${signedMoney(state.realizedProfitLoss)}`);
  console.log(` Unrealized P/L:       ${signedMoney(unrealizedProfitLoss())}`);
  console.log(
    "──────────────────────────────────────────────────────────────"
  );

  if (achievedTarget) {
    console.log(
      ` 🏆 Goal reached! You finished above ${money(TARGET_NET_WORTH)}.`
    );
  } else if (profitLoss > 0) {
    console.log(
      " 📈 You finished profitable, but did not reach the target."
    );
  } else if (profitLoss === 0) {
    console.log(
      " ➖ You finished exactly at your starting net worth."
    );
  } else {
    console.log(
      " 📉 You finished with a loss. Try a different strategy next time."
    );
  }

  console.log(
    "══════════════════════════════════════════════════════════════"
  );
}

function renderGoodbye() {
  clearScreen();

  console.log("══════════════════════════════════════════════");
  console.log("          📈 STOCK SIMULATOR CLOSED 📈");
  console.log("══════════════════════════════════════════════");
  console.log(" Thanks for playing!");
  console.log("══════════════════════════════════════════════");
}

// ─────────────────────────────────────────────
// Trading Actions
// ─────────────────────────────────────────────
async function buyStock() {
  renderDashboard("Buy stock: enter a symbol, or B to go back.");

  const symbolInput = await ask("\nEnter symbol to buy: ");

  if (isExitInput(symbolInput)) {
    return "exit";
  }

  if (isCancelInput(symbolInput)) {
    return "continue";
  }

  const stock = getStock(symbolInput);

  if (!stock) {
    state.status = "⚠ Stock not found. Enter a listed market symbol.";
    return "continue";
  }

  const maximumShares = Math.floor(state.cash / stock.price);

  if (maximumShares < 1) {
    state.status =
      `⚠ You do not have enough cash to buy one share of ${stock.symbol}.`;
    return "continue";
  }

  renderDashboard(
    `Buying ${stock.symbol} at ${money(
      stock.price
    )} each. Maximum shares: ${maximumShares}.`
  );

  const quantityInput = await ask("\nEnter quantity, or B to cancel: ");

  if (isExitInput(quantityInput)) {
    return "exit";
  }

  if (isCancelInput(quantityInput)) {
    state.status = "Purchase cancelled.";
    return "continue";
  }

  const quantity = parsePositiveInteger(quantityInput);

  if (quantity === null || quantity > maximumShares) {
    state.status =
      `⚠ Enter a whole share quantity from 1 to ${maximumShares}.`;
    return "continue";
  }

  const totalCost = Number((quantity * stock.price).toFixed(2));
  const holding = getHolding(stock.symbol);

  if (holding) {
    const previousCost = holding.shares * holding.averageCost;
    const combinedShares = holding.shares + quantity;

    holding.averageCost = Number(
      ((previousCost + totalCost) / combinedShares).toFixed(2)
    );

    holding.shares = combinedShares;
  } else {
    state.portfolio[stock.symbol] = {
      shares: quantity,
      averageCost: stock.price,
    };
  }

  state.cash = Number((state.cash - totalCost).toFixed(2));

  recordTransaction("BUY", stock, quantity, totalCost);

  state.status =
    `✅ Bought ${quantity} share(s) of ${stock.symbol} for ${money(
      totalCost
    )}.`;

  return "continue";
}

async function sellStock() {
  if (Object.keys(state.portfolio).length === 0) {
    state.status = "⚠ You do not own any shares to sell.";
    return "continue";
  }

  renderDashboard("Sell stock: enter a symbol you own, or B to go back.");

  const symbolInput = await ask("\nEnter symbol to sell: ");

  if (isExitInput(symbolInput)) {
    return "exit";
  }

  if (isCancelInput(symbolInput)) {
    return "continue";
  }

  const symbol = symbolInput.toUpperCase();
  const holding = getHolding(symbol);

  if (!holding) {
    state.status = "⚠ You do not own shares of that stock.";
    return "continue";
  }

  const stock = getStock(symbol);

  renderDashboard(
    `Selling ${symbol} at ${money(
      stock.price
    )} each. Available shares: ${holding.shares}.`
  );

  const quantityInput = await ask("\nEnter quantity, or B to cancel: ");

  if (isExitInput(quantityInput)) {
    return "exit";
  }

  if (isCancelInput(quantityInput)) {
    state.status = "Sale cancelled.";
    return "continue";
  }

  const quantity = parsePositiveInteger(quantityInput);

  if (quantity === null || quantity > holding.shares) {
    state.status =
      `⚠ Enter a whole share quantity from 1 to ${holding.shares}.`;
    return "continue";
  }

  const proceeds = Number((quantity * stock.price).toFixed(2));

  const gainLoss = Number(
    ((stock.price - holding.averageCost) * quantity).toFixed(2)
  );

  state.cash = Number((state.cash + proceeds).toFixed(2));

  state.realizedProfitLoss = Number(
    (state.realizedProfitLoss + gainLoss).toFixed(2)
  );

  holding.shares -= quantity;

  if (holding.shares === 0) {
    delete state.portfolio[symbol];
  }

  recordTransaction(
    "SELL",
    stock,
    quantity,
    proceeds,
    gainLoss
  );

  state.status =
    `✅ Sold ${quantity} share(s) of ${symbol} for ${money(
      proceeds
    )}. Realized P/L: ${signedMoney(gainLoss)}.`;

  return "continue";
}

// ─────────────────────────────────────────────
// Auto-Run Mode
// Trading is paused while days advance.
// Type S and press Enter to stop.
// ─────────────────────────────────────────────
async function autoRunMarket() {
  if (state.day >= MAX_DAYS) {
    return "completed";
  }

  renderDashboard(
    "Auto run advances one day every second. Trading is disabled until you stop."
  );

  const confirmation = (
    await ask("\nStart auto run? (Y/N): ")
  ).toLowerCase();

  if (!["y", "yes"].includes(confirmation)) {
    state.status = "Auto run cancelled.";
    return "stopped";
  }

  let stopRequested = false;
  let resolveStop;

  const stopPromise = new Promise((resolve) => {
    resolveStop = resolve;
  });

  const handleAutoRunInput = (input) => {
    const command = input.trim().toLowerCase();

    if (["s", "stop"].includes(command)) {
      stopRequested = true;
      resolveStop("stopped");
    }
  };

  rl.on("line", handleAutoRunInput);

  try {
    while (!stopRequested && state.day < MAX_DAYS) {
      renderDashboard(
        `▶ AUTO RUNNING: Day ${state.day}/${MAX_DAYS}. Next price update in 1 second.`,
        true
      );

      const nextAction = await Promise.race([
        wait(AUTO_RUN_DELAY).then(() => "tick"),
        stopPromise,
      ]);

      if (nextAction === "stopped") {
        break;
      }

      updateMarket();
    }
  } finally {
    rl.removeListener("line", handleAutoRunInput);
  }

  if (stopRequested) {
    state.status =
      `⏸ Auto run stopped on Day ${state.day}. You may trade again.`;

    return "stopped";
  }

  return "completed";
}

// ─────────────────────────────────────────────
// Game Flow
// ─────────────────────────────────────────────
async function askPlayAgain() {
  while (true) {
    const input = (
      await ask("\nStart a new simulation? (Y/N): ")
    ).toLowerCase();

    if (["y", "yes"].includes(input)) {
      return true;
    }

    if (["n", "no"].includes(input) || isExitInput(input)) {
      return false;
    }

    console.log("Please enter Y or N.");
  }
}

async function completeSimulation(reason) {
  renderFinalScreen(reason);

  const restart = await askPlayAgain();

  if (restart) {
    resetSimulation();
    return true;
  }

  renderGoodbye();
  rl.close();

  return false;
}

async function playSimulation() {
  while (true) {
    renderDashboard();

    const input = (
      await ask("\nChoose an option (1-7): ")
    ).toLowerCase();

    if (isExitInput(input) || input === "7") {
      renderGoodbye();
      rl.close();
      return;
    }

    if (input === "1" || input === "buy") {
      const result = await buyStock();

      if (result === "exit") {
        renderGoodbye();
        rl.close();
        return;
      }

      continue;
    }

    if (input === "2" || input === "sell") {
      const result = await sellStock();

      if (result === "exit") {
        renderGoodbye();
        rl.close();
        return;
      }

      continue;
    }

    if (input === "3" || input === "next") {
      if (state.day < MAX_DAYS) {
        updateMarket();
      }

      if (state.day >= MAX_DAYS) {
        const restart = await completeSimulation(
          `You completed all ${MAX_DAYS} simulated market days.`
        );

        if (!restart) {
          return;
        }
      }

      continue;
    }

    if (input === "4" || input === "auto") {
      const result = await autoRunMarket();

      if (result === "completed") {
        const restart = await completeSimulation(
          `Auto run completed all ${MAX_DAYS} simulated market days.`
        );

        if (!restart) {
          return;
        }
      }

      continue;
    }

    if (input === "5" || input === "history") {
      renderTransactions();

      await ask("\nPress Enter to return to the dashboard...");

      continue;
    }

    if (input === "6" || input === "finish") {
      const confirmation = (
        await ask("\nFinish this simulation now? (Y/N): ")
      ).toLowerCase();

      if (["y", "yes"].includes(confirmation)) {
        const restart = await completeSimulation(
          "You ended the simulation early."
        );

        if (!restart) {
          return;
        }
      } else {
        state.status = "Simulation continues.";
      }

      continue;
    }

    state.status =
      "⚠ Invalid choice. Choose an option from 1 to 7.";
  }
}

// ─────────────────────────────────────────────
// Start Game
// ─────────────────────────────────────────────
resetSimulation();

playSimulation().catch((error) => {
  clearScreen();
  console.error("An unexpected error occurred:", error.message);
  rl.close();
});