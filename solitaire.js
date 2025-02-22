const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let stock = [];
let waste = [];
let foundations = { '♠': [], '♥': [], '♦': [], '♣': [] };
let tableau = [[], [], [], [], [], [], []];

// Shuffle and setup game
function shuffleDeck() {
    let deck = [];
    for (let suit of suits) {
        for (let rank of ranks) {
            deck.push({ suit, rank });
        }
    }
    deck.sort(() => Math.random() - 0.5);
    return deck;
}

function dealCards() {
    let deck = shuffleDeck();
    for (let i = 0; i < 7; i++) {
        for (let j = i; j < 7; j++) {
            tableau[j].push(deck.pop());
        }
    }
    stock = deck;
}

// Display the board
function displayBoard() {
    console.clear();
    console.log("========================================");
    console.log("       🎴 CLI SOLITAIRE (KLONDIKE) 🎴   ");
    console.log("========================================");
    console.log(`Stock: [${stock.length > 0 ? '🔳' : ' '}]  Waste: [${waste.length > 0 ? waste[waste.length - 1].rank + waste[waste.length - 1].suit : ' '}]`);
    console.log("\nFoundations:");
    console.log(` ♠: [${foundations['♠'].join(' ')}]  ♥: [${foundations['♥'].join(' ')}]  ♦: [${foundations['♦'].join(' ')}]  ♣: [${foundations['♣'].join(' ')}]`);
    
    console.log("\nTableau:");
    tableau.forEach((col, index) => {
        console.log(`${index + 1}: ${col.map(card => card.rank + card.suit).join(' ')}`);
    });
    
    console.log("\nCommands: move <source> <destination>, draw, waste <destination>, undo, restart, quit");
}

// Move cards
function moveCard(source, destination) {
    let fromCol = tableau[source - 1];
    let toCol = tableau[destination - 1];

    if (fromCol.length === 0) {
        console.log("❌ Invalid move! Source column is empty.");
        return;
    }

    let card = fromCol[fromCol.length - 1];
    if (toCol.length === 0 || isValidMove(card, toCol[toCol.length - 1])) {
        toCol.push(fromCol.pop());
        console.log(`✅ Moved ${card.rank}${card.suit} from ${source} to ${destination}.`);
    } else {
        console.log("❌ Invalid move! Must be alternating color and one rank lower.");
    }
}

// Check if move is valid
function isValidMove(card, targetCard) {
    let isAlternateColor = (card.suit === '♠' || card.suit === '♣') !== (targetCard.suit === '♥' || targetCard.suit === '♦');
    let isDescending = ranks.indexOf(card.rank) === ranks.indexOf(targetCard.rank) - 1;
    return isAlternateColor && isDescending;
}

// Move card to foundation
function moveToFoundation(column) {
    let col = tableau[column - 1];
    if (col.length === 0) {
        console.log("❌ No cards to move.");
        return;
    }

    let card = col[col.length - 1];
    if (card.rank === 'A' || (foundations[card.suit].length > 0 && ranks.indexOf(card.rank) === ranks.indexOf(foundations[card.suit][foundations[card.suit].length - 1]) + 1)) {
        foundations[card.suit].push(col.pop().rank);
        console.log(`✅ Moved ${card.rank}${card.suit} to foundation.`);
    } else {
        console.log("❌ Invalid move! Must start with Ace or follow sequence.");
    }
}

// Draw from stockpile
function drawCard() {
    if (stock.length === 0) {
        console.log("🔄 Stockpile empty! Resetting waste...");
        stock = waste.reverse();
        waste = [];
    } else {
        waste.push(stock.pop());
        console.log(`🃏 You drew ${waste[waste.length - 1].rank}${waste[waste.length - 1].suit} from stock.`);
    }
}

// Move from waste to tableau
function moveWaste(destination) {
    if (waste.length === 0) {
        console.log("❌ No cards in waste.");
        return;
    }
    let card = waste[waste.length - 1];
    let toCol = tableau[destination - 1];

    if (toCol.length === 0 || isValidMove(card, toCol[toCol.length - 1])) {
        toCol.push(waste.pop());
        console.log(`✅ Moved ${card.rank}${card.suit} from Waste to ${destination}.`);
    } else {
        console.log("❌ Invalid move! Must be alternating color and one rank lower.");
    }
}

// Check win condition
function checkWin() {
    if (foundations['♠'].length === 13 && foundations['♥'].length === 13 && foundations['♦'].length === 13 && foundations['♣'].length === 13) {
        console.log("🎉 Congratulations! You won the game! 🎉");
        process.exit(0);
    }
}

// Restart game
function restartGame() {
    stock = [];
    waste = [];
    foundations = { '♠': [], '♥': [], '♦': [], '♣': [] };
    tableau = [[], [], [], [], [], [], []];
    dealCards();
    console.log("🔄 Game restarted!");
}

// Process player input
function processInput(input) {
    let args = input.trim().split(" ");
    let command = args[0];

    switch (command) {
        case "move":
            if (args.length < 3) {
                console.log("❌ Invalid command! Usage: move <source> <destination>");
                return;
            }
            moveCard(parseInt(args[1]), parseInt(args[2]));
            break;
        case "draw":
            drawCard();
            break;
        case "waste":
            if (args.length < 2) {
                console.log("❌ Invalid command! Usage: waste <destination>");
                return;
            }
            moveWaste(parseInt(args[1]));
            break;
        case "restart":
            restartGame();
            break;
        case "quit":
            console.log("👋 Thanks for playing! Goodbye!");
            process.exit(0);
            break;
        default:
            console.log("❌ Unknown command. Try: move, draw, waste, restart, quit.");
    }

    displayBoard();
    checkWin();
}

// Start game loop
dealCards();
displayBoard();

rl.on('line', processInput);
