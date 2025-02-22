const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const choices = ['rock', 'paper', 'scissors'];
let playerScore = 0;
let computerScore = 0;
let roundCount = 0;
let gameHistory = [];

function getComputerChoice() {
    return choices[Math.floor(Math.random() * choices.length)];
}

function determineWinner(player, computer) {
    if (player === computer) {
        return "It's a tie! 😮";
    }
    if (
        (player === 'rock' && computer === 'scissors') ||
        (player === 'scissors' && computer === 'paper') ||
        (player === 'paper' && computer === 'rock')
    ) {
        playerScore++;
        return "You win! 🎉";
    }
    computerScore++;
    return "Computer wins! 😈";
}

function displayScore() {
    console.log(`🏆 Score: You ${playerScore} - ${computerScore} Computer`);
}

function displayGameHistory() {
    console.log("📜 Game Summary:");
    gameHistory.forEach((round, index) => {
        console.log(`Round ${index + 1}: You chose ${round.playerChoice}, Computer chose ${round.computerChoice}. Result: ${round.result}`);
    });
    console.log(`📜 Final Score: You won ${playerScore} rounds, Computer won ${computerScore} rounds.`);
}

function playRound() {
    roundCount++;
    console.log(`🔄 Round ${roundCount}`);
    
    rl.question("Choose Rock (r), Paper (p), or Scissors (s): ", (input) => {
        const playerChoice = input.toLowerCase();
        let formattedChoice = '';
        
        switch (playerChoice) {
            case 'r': formattedChoice = 'rock'; break;
            case 'p': formattedChoice = 'paper'; break;
            case 's': formattedChoice = 'scissors'; break;
            default:
                console.log("Invalid choice! Please select Rock (r), Paper (p), or Scissors (s).\n");
                return playRound();
        }
        
        const computerChoice = getComputerChoice();
        const result = determineWinner(formattedChoice, computerChoice);
        
        console.log(`🤖 Computer chose: ${computerChoice}`);
        console.log(result);
        displayScore();
        
        gameHistory.push({
            round: roundCount,
            playerChoice: formattedChoice,
            computerChoice: computerChoice,
            result: result
        });
        
        rl.question("Play again? (yes/no): ", (answer) => {
            if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
                playRound();
            } else {
                displayGameHistory();
                console.log("👋 Thanks for playing! Goodbye!");
                rl.close();
            }
        });
    });
}

console.log("🎮 Welcome to Rock, Paper, Scissors! ✊✋✌️");
playRound();
