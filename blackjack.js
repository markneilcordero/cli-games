const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const suits = ["♠️", "♥️", "♦️", "♣️"];
const ranks = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"
];
let deck = [];
let balance = 500;

// 🃏 Create and Shuffle Deck
function createDeck() {
  deck = [];
  for (let suit of suits) {
    for (let rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  deck.sort(() => Math.random() - 0.5);
}

// 🎲 Draw a Card
function drawCard() {
  return deck.pop();
}

// 🎯 Calculate Hand Total
function calculateHand(hand) {
  let total = 0;
  let aces = 0;

  for (let card of hand) {
    if (card.rank === "A") {
      total += 11;
      aces += 1;
    } else if (["J", "Q", "K"].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

// 🎮 Game Loop
function startGame() {
  createDeck();
  console.log("=====================================================");
  console.log("🃏 WELCOME TO CLI BLACKJACK! 🎰");
  console.log("=====================================================");
  console.log(`Starting Balance: $${balance}`);
  placeBet();
}

// 💰 Place a Bet
function placeBet() {
  rl.question(`Your Balance: $${balance}\nEnter your bet amount: `, (bet) => {
    bet = parseInt(bet);

    if (isNaN(bet) || bet <= 0 || bet > balance) {
      console.log("Invalid bet! Enter a valid amount.");
      placeBet();
    } else {
      playRound(bet);
    }
  });
}

// 🎲 Play One Round
function playRound(bet) {
  let playerHand = [drawCard(), drawCard()];
  let dealerHand = [drawCard(), drawCard()];
  let playerTotal = calculateHand(playerHand);
  let dealerTotal = calculateHand(dealerHand);
  let insuranceBet = 0;
  let isPlayerDone = false;

  console.log(`\n🃏 Your Hand: ${displayHand(playerHand)} --> Total: ${playerTotal}`);
  console.log(`🤵 Dealer’s Up Card: [${dealerHand[0].rank}${dealerHand[0].suit}]`);

  // 🔹 Offer Insurance if Dealer Has an Ace
  if (dealerHand[0].rank === "A") {
    rl.question("Dealer has an Ace. Take Insurance? (Y/N): ", (insurance) => {
      if (insurance.toLowerCase() === "y") {
        insuranceBet = Math.min(bet / 2, balance);
        console.log(`Insurance Bet Placed: $${insuranceBet}`);
      }
      checkBlackjack(playerHand, dealerHand, bet, insuranceBet);
    });
  } else {
    checkBlackjack(playerHand, dealerHand, bet, insuranceBet);
  }

  function checkBlackjack(playerHand, dealerHand, bet, insuranceBet) {
    let playerTotal = calculateHand(playerHand);
    let dealerTotal = calculateHand(dealerHand);

    if (playerTotal === 21 && dealerTotal !== 21) {
      console.log("\n🎉 BLACKJACK! You Win!");
      balance += bet * 1.5;
      return endRound();
    } else if (dealerTotal === 21) {
      console.log(`\nDealer Reveals: ${displayHand(dealerHand)} --> Total: ${dealerTotal}`);
      if (playerTotal === 21) {
        console.log("PUSH! It's a tie.");
      } else {
        console.log("Dealer has BLACKJACK. You lose.");
        balance -= bet;
      }
      if (insuranceBet > 0) {
        console.log(`Insurance Payout: $${insuranceBet * 2}`);
        balance += insuranceBet * 2;
      }
      return endRound();
    }

    playerTurn();
  }

  function playerTurn() {
    console.log("\nChoose an action: [H] Hit, [S] Stand, [D] Double Down, [Q] Quit");
    rl.question("> ", (choice) => {
      choice = choice.toUpperCase();

      if (choice === "H") {
        let newCard = drawCard();
        playerHand.push(newCard);
        let playerTotal = calculateHand(playerHand);
        console.log(`\nYou draw: [${newCard.rank}${newCard.suit}] --> Total: ${playerTotal}`);

        if (playerTotal > 21) {
          console.log("❌ BUST! You lose.");
          balance -= bet;
          return endRound();
        } else {
          playerTurn();
        }
      } else if (choice === "S") {
        isPlayerDone = true;
        dealerTurn();
      } else if (choice === "D") {
        if (bet * 2 > balance) {
          console.log("Not enough balance to Double Down.");
          playerTurn();
        } else {
          bet *= 2;
          let newCard = drawCard();
          playerHand.push(newCard);
          let playerTotal = calculateHand(playerHand);
          console.log(`\nYou draw: [${newCard.rank}${newCard.suit}] --> Total: ${playerTotal}`);

          if (playerTotal > 21) {
            console.log("❌ BUST! You lose.");
            balance -= bet;
            return endRound();
          }
          isPlayerDone = true;
          dealerTurn();
        }
      } else if (choice === "Q") {
        console.log("Thanks for playing! 🎰");
        process.exit();
      } else {
        console.log("Invalid choice. Try again.");
        playerTurn();
      }
    });
  }

  function dealerTurn() {
    console.log(`\nDealer reveals: ${displayHand(dealerHand)} --> Total: ${calculateHand(dealerHand)}`);

    while (calculateHand(dealerHand) < 17) {
      let newCard = drawCard();
      dealerHand.push(newCard);
      console.log(`Dealer draws: [${newCard.rank}${newCard.suit}]`);
    }

    let dealerTotal = calculateHand(dealerHand);
    let playerTotal = calculateHand(playerHand);

    if (dealerTotal > 21 || playerTotal > dealerTotal) {
      console.log("\n🏆 YOU WIN!");
      balance += bet;
    } else if (dealerTotal === playerTotal) {
      console.log("\n💠 PUSH! It's a tie.");
    } else {
      console.log("\n❌ Dealer Wins! You lose.");
      balance -= bet;
    }

    endRound();
  }
}

function displayHand(hand) {
  return hand.map((card) => `[${card.rank}${card.suit}]`).join(" ");
}

function endRound() {
  console.log(`New Balance: $${balance}`);
  if (balance <= 0) {
    console.log("\n💸 You're out of money. GAME OVER.");
    process.exit();
  }
  rl.question("\nPlay again? (Y/N) > ", (answer) => {
    if (answer.toUpperCase() === "Y") placeBet();
    else {
      console.log("Thanks for playing! 🃏");
      process.exit();
    }
  });
}

startGame();
