const readline = require('readline');
const fs = require('fs');

// Setup CLI input/output
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const GRID_SIZE = 10;
const SHIPS = [
    { name: "Carrier", size: 5 },
    { name: "Battleship", size: 4 },
    { name: "Cruiser", size: 3 },
    { name: "Submarine", size: 3 },
    { name: "Destroyer", size: 2 }
];

// Create an empty grid
function createGrid() {
    return Array(GRID_SIZE).fill().map(() =>
        Array(GRID_SIZE).fill().map(() => Math.random() > 0.5 ? "⬜" : "⬜")
    );
}

// Random ship placement
function placeShips(grid) {
    for (const ship of SHIPS) {
        let placed = false;
        while (!placed) {
            let row = Math.floor(Math.random() * GRID_SIZE);
            let col = Math.floor(Math.random() * GRID_SIZE);
            let direction = Math.random() > 0.5 ? "H" : "V";

            if (canPlaceShip(grid, row, col, ship.size, direction)) {
                for (let i = 0; i < ship.size; i++) {
                    if (direction === "H") grid[row][col + i] = "🚢";
                    else grid[row + i][col] = "🚢";
                }
                placed = true;
            }
        }
    }
}

// Check if ship can be placed
function canPlaceShip(grid, row, col, size, direction) {
    if (direction === "H" && col + size > GRID_SIZE) return false;
    if (direction === "V" && row + size > GRID_SIZE) return false;

    for (let i = 0; i < size; i++) {
        if (direction === "H" && (grid[row][col + i] !== "⬜" && grid[row][col + i] !== "⬜")) return false;
        if (direction === "V" && (grid[row + i][col] !== "⬜" && grid[row + i][col] !== "⬜")) return false;
    }
    return true;
}

// Display player's grid
function displayGrid(grid, hideShips = false) {
    console.log("\n  A B C D E F G H I J");
    grid.forEach((row, i) => {
        let line = (i + 1).toString().padStart(2, ' ') + " ";
        row.forEach(cell => {
            if (hideShips && cell === "🚢") {
                line += (Math.random() > 0.5 ? "⬜" : "⬜");
            } else {
                line += cell + " ";
            }
        });
        console.log(line);
    });
}

// Take a player turn
function playerTurn(opponentGrid, callback) {
    rl.question("\n🎯 Enter target coordinate (e.g., A5): ", input => {
        let col = input.charCodeAt(0) - 65;
        let row = parseInt(input.slice(1)) - 1;

        if (!/^[A-J]\d+$/.test(input) || isNaN(row) || col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) {
            console.log("❌ Invalid input! Try again.");
            playerTurn(opponentGrid, callback);
            return;
        }

        if (opponentGrid[row][col] === "🚢") {
            opponentGrid[row][col] = "💥";
            console.log("💥 HIT!");
        } else if (opponentGrid[row][col] === "⬜" || opponentGrid[row][col] === "⬜") {
            opponentGrid[row][col] = "🌊";
            console.log("🌊 MISS!");
        } else {
            console.log("⚠️ You already targeted this spot! Try again.");
            playerTurn(opponentGrid, callback);
            return;
        }

        callback();
    });
}

// AI Turn - Random attack
function aiTurn(playerGrid, callback) {
    let row, col;
    do {
        row = Math.floor(Math.random() * GRID_SIZE);
        col = Math.floor(Math.random() * GRID_SIZE);
    } while (playerGrid[row][col] === "💥" || playerGrid[row][col] === "🌊");

    console.log(`🤖 AI attacks ${String.fromCharCode(65 + col)}${row + 1}...`);

    if (playerGrid[row][col] === "🚢") {
        playerGrid[row][col] = "💥";
        console.log("💥 AI HIT your ship!");
    } else {
        playerGrid[row][col] = "🌊";
        console.log("🌊 AI MISSED!");
    }

    setTimeout(callback, 1000);
}


// Check if all ships are sunk
function checkWin(grid) {
    return !grid.flat().includes("🚢");
}

// Save game report
function saveGameReport(logs) {
    fs.writeFileSync("battle-log.txt", logs.join("\n"));
    console.log("✅ Battle report saved as 'battle-log.txt'!");
}

// Main game loop
function playGame() {
    let playerGrid = createGrid();
    let aiGrid = createGrid();
    let logs = [];

    placeShips(playerGrid);
    placeShips(aiGrid);

    console.log("\n✅ Your ships are placed! Battle begins!");

    function nextTurn() {
        if (checkWin(aiGrid)) {
            console.log("🎉 YOU WIN! All enemy ships are destroyed!");
            saveGameReport(logs);
            rl.close();
            return;
        }

        playerTurn(aiGrid, () => {
            logs.push("Player attacks...");
            displayGrid(aiGrid, true);

            if (checkWin(aiGrid)) {
                console.log("🎉 YOU WIN! All enemy ships are destroyed!");
                saveGameReport(logs);
                rl.close();
                return;
            }

            setTimeout(() => {
                aiTurn(playerGrid, () => {
                    logs.push("AI attacks...");
                    displayGrid(playerGrid);
                    
                    if (checkWin(playerGrid)) {
                        console.log("💀 YOU LOSE! AI sank all your ships!");
                        saveGameReport(logs);
                        rl.close();
                        return;
                    }

                    nextTurn();
                });
            }, 1000);
        });
    }

    displayGrid(playerGrid);
    nextTurn();
}

// Start Menu
function mainMenu() {
    console.log("\n==================================");
    console.log("      🚢 CLI BATTLESHIP 🎯       ");
    console.log("==================================");
    console.log("1. Player vs. AI");
    console.log("2. Exit");
    console.log("==================================");
    
    rl.question("Choose an option: ", choice => {
        if (choice === "1") {
            playGame();
        } else {
            console.log("Goodbye! 👋");
            rl.close();
        }
    });
}

// Start the game
mainMenu();
