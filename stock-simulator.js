const readline = require("readline");

// Initialize Readline Interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initial Game State
let balance = 10000;
let portfolio = {};
const stocks = [
  { symbol: "AAPL", name: "Apple Inc.", price: 150 },
  { symbol: "TSLA", name: "Tesla Motors", price: 900 },
  { symbol: "AMZN", name: "Amazon", price: 3100 },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 2800 },
  { symbol: "MSFT", name: "Microsoft", price: 299 }
];

// Market fluctuation function
function updateMarket() {
  stocks.forEach(stock => {
    let change = (Math.random() * 10 - 5).toFixed(2); // Random change between -5% and +5%
    let newPrice = Math.max(1, stock.price * (1 + change / 100)); // Avoid negative prices
    stock.price = parseFloat(newPrice.toFixed(2));
  });
}

// Display stock market
function viewMarket() {
  console.log("\n📈 Stock Market Overview");
  console.log("-----------------------------------------------");
  console.log("| Symbol | Company         | Price  | Change  |");
  console.log("-----------------------------------------------");

  stocks.forEach(stock => {
    let change = ((stock.price - 150) / 150 * 100).toFixed(2); // Mock percentage change
    let changeSymbol = change > 0 ? "+" : "";
    console.log(`| ${stock.symbol.padEnd(6)} | ${stock.name.padEnd(14)} | $${stock.price.toFixed(2)} | ${changeSymbol}${change}% |`);
  });

  console.log("-----------------------------------------------");
  mainMenu();
}

// Buy stocks
function buyStock() {
  rl.question("\nEnter stock symbol to buy: ", symbol => {
    const stock = stocks.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());
    if (!stock) {
      console.log("❌ Stock not found. Try again.");
      return buyStock();
    }

    rl.question(`Enter quantity to buy (${stock.symbol} at $${stock.price.toFixed(2)} each): `, quantity => {
      quantity = parseInt(quantity);
      let totalCost = quantity * stock.price;

      if (isNaN(quantity) || quantity <= 0) {
        console.log("❌ Invalid quantity. Try again.");
        return buyStock();
      }

      if (balance >= totalCost) {
        balance -= totalCost;
        portfolio[symbol.toUpperCase()] = (portfolio[symbol.toUpperCase()] || 0) + quantity;
        console.log(`✅ Purchased ${quantity} shares of ${symbol.toUpperCase()} for $${totalCost.toFixed(2)}.`);
      } else {
        console.log("❌ Insufficient funds.");
      }
      mainMenu();
    });
  });
}

// Sell stocks
function sellStock() {
  rl.question("\nEnter stock symbol to sell: ", symbol => {
    symbol = symbol.toUpperCase();
    if (!portfolio[symbol]) {
      console.log("❌ You don't own this stock.");
      return sellStock();
    }

    rl.question(`Enter quantity to sell (${portfolio[symbol]} shares available): `, quantity => {
      quantity = parseInt(quantity);
      if (isNaN(quantity) || quantity <= 0 || quantity > portfolio[symbol]) {
        console.log("❌ Invalid quantity.");
        return sellStock();
      }

      const stock = stocks.find(s => s.symbol === symbol);
      let totalValue = quantity * stock.price;
      balance += totalValue;
      portfolio[symbol] -= quantity;
      if (portfolio[symbol] === 0) delete portfolio[symbol];

      console.log(`✅ Sold ${quantity} shares of ${symbol} for $${totalValue.toFixed(2)}.`);
      mainMenu();
    });
  });
}

// View Portfolio
function viewPortfolio() {
  console.log("\n📂 Portfolio Overview");
  console.log("-----------------------------------------------");
  console.log("| Symbol | Shares | Buy Price | Current Price | Profit/Loss |");
  console.log("-----------------------------------------------");

  let totalValue = 0;
  Object.keys(portfolio).forEach(symbol => {
    const stock = stocks.find(s => s.symbol === symbol);
    let buyPrice = 150; // Mock initial price
    let profitLoss = (stock.price - buyPrice) * portfolio[symbol];

    console.log(`| ${symbol.padEnd(6)} | ${portfolio[symbol].toString().padEnd(6)} | $${buyPrice.toFixed(2)}   | $${stock.price.toFixed(2)}   | $${profitLoss.toFixed(2)} |`);
    totalValue += stock.price * portfolio[symbol];
  });

  console.log("-----------------------------------------------");
  console.log(`💰 Balance: $${balance.toFixed(2)}`);
  console.log(`📈 Portfolio Value: $${totalValue.toFixed(2)}`);
  console.log(`📊 Net Worth: $${(balance + totalValue).toFixed(2)}`);

  mainMenu();
}

// Main menu
function mainMenu() {
  console.log("\nOptions:");
  console.log("1️⃣ View Market");
  console.log("2️⃣ Buy Stocks");
  console.log("3️⃣ Sell Stocks");
  console.log("4️⃣ View Portfolio");
  console.log("5️⃣ Next Market Update");
  console.log("6️⃣ Exit");

  rl.question("Enter your choice: ", choice => {
    switch (choice) {
      case "1":
        viewMarket();
        break;
      case "2":
        buyStock();
        break;
      case "3":
        sellStock();
        break;
      case "4":
        viewPortfolio();
        break;
      case "5":
        updateMarket();
        console.log("\n🔄 Market prices updated!");
        mainMenu();
        break;
      case "6":
        console.log("\n🏁 Thank you for playing! Exiting...");
        rl.close();
        break;
      default:
        console.log("❌ Invalid choice, try again.");
        mainMenu();
    }
  });
}

// Start the game
console.log("🏦 Welcome to the CLI Stock Market Simulator! 📈");
mainMenu();
