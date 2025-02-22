const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Directory containing the CLI games
const gamesDir = __dirname;

// Get a list of all .js files in the directory (excluding index.js)
const games = fs.readdirSync(gamesDir)
    .filter(file => file.endsWith(".js") && file !== "index.js")
    .map(file => file.replace(".js", "")); // Remove ".js" extension for cleaner display

async function showMenu() {
    const inquirer = await import("inquirer");

    inquirer.default
        .prompt([
            {
                type: "list",
                name: "selectedGame",
                message: "🎮 Select a game to play:",
                choices: [...games, "Exit"]
            }
        ])
        .then(({ selectedGame }) => {
            if (selectedGame === "Exit") {
                console.log("👋 Exiting CLI Games. Goodbye!");
                process.exit();
            }

            console.log(`\n🚀 Launching ${selectedGame}...\n`);

            // ✅ Use `spawn` instead of `exec` to handle input/output properly
            const gameProcess = spawn("node", [path.join(gamesDir, selectedGame + ".js")], {
                stdio: "inherit" // Attach standard input/output
            });

            gameProcess.on("exit", () => {
                showMenu(); // Show menu again after game exits
            });
        });
}

// Start the menu
showMenu();
